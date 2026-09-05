<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Product;
use App\Models\Supplier;
use App\Models\Unit;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProductImportService
{
    /**
     * Import products from CSV file path.
     * Returns summary of imported and updated products count.
     */
    public function importFromCsv(string $filePath): array
    {
        if (! file_exists($filePath)) {
            throw new Exception('File CSV tidak ditemukan.');
        }

        $content = file_get_contents($filePath);
        if (empty($content)) {
            throw new Exception('File CSV kosong.');
        }

        // 1. Detect and handle UTF-16 / UTF-8 BOM
        if (str_starts_with($content, "\xFF\xFE")) {
            // UTF-16LE
            $content = mb_convert_encoding(substr($content, 2), 'UTF-8', 'UTF-16LE');
        } elseif (str_starts_with($content, "\xFE\xFF")) {
            // UTF-16BE
            $content = mb_convert_encoding(substr($content, 2), 'UTF-8', 'UTF-16BE');
        } elseif (str_starts_with($content, "\xEF\xBB\xBF")) {
            // UTF-8 with BOM
            $content = substr($content, 3);
        }

        // 2. Ensure valid UTF-8 encoding (handle Windows-1252 / ISO-8859-1)
        if (! mb_check_encoding($content, 'UTF-8')) {
            $detectedEncoding = mb_detect_encoding($content, ['UTF-8', 'Windows-1252', 'ISO-8859-1', 'ASCII', 'SJIS'], true);
            $content = mb_convert_encoding($content, 'UTF-8', $detectedEncoding ?: 'Windows-1252');
        }

        // 3. Clean any corrupted/invalid byte sequences so JSON serialization never fails
        $content = mb_convert_encoding($content, 'UTF-8', 'UTF-8');

        // Detect delimiter (; or , or \t)
        $firstLine = strtok($content, "\r\n");
        $delimiter = $this->detectDelimiter($firstLine);

        $lines = preg_split('/\r\n|\r|\n/', $content);
        $header = null;
        $columnMap = [];

        $createdCount = 0;
        $updatedCount = 0;
        $errors = [];

        DB::beginTransaction();

        try {
            foreach ($lines as $lineIndex => $line) {
                if (trim($line) === '') {
                    continue;
                }

                $row = str_getcsv($line, $delimiter);

                if ($header === null) {
                    $header = array_map(fn ($h) => $this->normalizeHeaderName($h), $row);
                    $columnMap = array_flip($header);

                    continue;
                }

                if (count($row) < 2) {
                    continue;
                }

                // Map row data using column keys
                $data = $this->extractRowData($row, $columnMap);

                $barcode = trim($data['kode'] ?? '');
                $title = trim($data['nama'] ?? '');

                if (empty($title) && empty($barcode)) {
                    continue;
                }

                if (empty($title)) {
                    $title = 'Produk '.($barcode ?: ('Import-'.($lineIndex + 1)));
                }

                if (empty($barcode)) {
                    $barcode = 'PRD-'.strtoupper(Str::random(8));
                }

                // 1. Resolve Category (Auto-Create if not exists)
                $categoryName = trim($data['kategori'] ?? '');
                $category = $this->resolveCategory($categoryName);

                // 2. Resolve Units (Auto-Create Satuan1, Satuan2, Satuan3 if not exists)
                $satuan1 = trim($data['satuan1'] ?? '');
                $satuan2 = trim($data['satuan2'] ?? '');
                $satuan3 = trim($data['satuan3'] ?? '');

                $this->ensureUnitExists($satuan1);
                $this->ensureUnitExists($satuan2);
                $this->ensureUnitExists($satuan3);

                // 3. Resolve Supplier (Auto-Create Supplier if NamaSupp is present)
                $namaSupp = trim($data['namasupp'] ?? '');
                $telponSupp = trim($data['telponsupp'] ?? '');
                $alamatSupp = trim($data['alamatsupp'] ?? '');

                if (! empty($namaSupp)) {
                    Supplier::firstOrCreate(
                        ['name' => $namaSupp],
                        [
                            'phone' => $telponSupp,
                            'address' => $alamatSupp,
                        ]
                    );
                }

                // 4. Clean Numeric Values (Prices & Conversions)
                $hargaBeli1 = $this->cleanNumber($data['hargabeli1'] ?? ($data['hargabelippn1'] ?? 0));
                $hargaBeli2 = $this->cleanNumber($data['hargabeli2'] ?? ($data['hargabelippn2'] ?? 0));
                $hargaBeli3 = $this->cleanNumber($data['hargabeli3'] ?? ($data['hargabelippn3'] ?? 0));

                $hargaJual1 = $this->cleanNumber($data['hargajual1'] ?? 0);
                $hargaJual2 = $this->cleanNumber($data['hargajual2'] ?? 0);
                $hargaJual3 = $this->cleanNumber($data['hargajual3'] ?? 0);

                $stok1 = $this->cleanDecimalNumber($data['stok1'] ?? 0);
                $stok2 = $this->cleanDecimalNumber($data['stok2'] ?? 0);
                $stok3 = $this->cleanDecimalNumber($data['stok3'] ?? 0);

                $isi1 = $this->cleanDecimalNumber($data['isi1'] ?? 0);
                $isi2 = $this->cleanDecimalNumber($data['isi2'] ?? 0);
                $isi3 = $this->cleanDecimalNumber($data['isi3'] ?? 1, 1);

                $isiPcsDalamPack = $isi2 > 0 ? $isi2 : 0;
                $isiPcsDalamDus = $isi1 > 0 ? $isi1 : 0;
                $isiPackDalamDus = ($isiPcsDalamDus > 0 && $isiPcsDalamPack > 0)
                    ? (float) round($isiPcsDalamDus / $isiPcsDalamPack, 3)
                    : 0;

                // Total stock calculation in base unit (pcs)
                $totalStockPcs = ($stok1 * ($isiPcsDalamDus > 0 ? $isiPcsDalamDus : 1))
                    + ($stok2 * ($isiPcsDalamPack > 0 ? $isiPcsDalamPack : 1))
                    + $stok3;

                // Base fallback prices
                $baseBuyPrice = $hargaBeli3 > 0 ? $hargaBeli3 : ($hargaBeli2 > 0 ? $hargaBeli2 : $hargaBeli1);
                $baseSellPrice = $hargaJual3 > 0 ? $hargaJual3 : ($hargaJual2 > 0 ? $hargaJual2 : $hargaJual1);

                // Base buying unit
                $satuanBeli = $satuan1 ?: ($satuan2 ?: ($satuan3 ?: 'Pcs'));

                // Build description with rak and expired if available
                $descParts = [];
                if (! empty($data['tempatrak'])) {
                    $descParts[] = 'Rak: '.trim($data['tempatrak']);
                }
                if (! empty($data['expired'])) {
                    $descParts[] = 'Exp: '.trim($data['expired']);
                }
                $description = implode(' | ', $descParts);

                // Upsert Product by Barcode or SKU
                $product = Product::where('barcode', $barcode)
                    ->orWhere('sku', $barcode)
                    ->first();

                $productPayload = [
                    'barcode' => $barcode,
                    'sku' => $barcode,
                    'title' => $title,
                    'description' => $description ?: null,
                    'category_id' => $category->id,
                    'buy_price' => $baseBuyPrice,
                    'sell_price' => $baseSellPrice,
                    'stock' => $totalStockPcs,
                    'satuan_beli' => $satuanBeli,

                    // Dus (Level 1)
                    'satuan_jual_dus' => $satuan1 ?: null,
                    'harga_beli_dus' => $hargaBeli1,
                    'harga_jual_dus' => $hargaJual1,
                    'stok_dus' => $stok1,
                    'isi_pcs_dalam_dus' => $isiPcsDalamDus,
                    'isi_pack_dalam_dus' => $isiPackDalamDus,

                    // Pack (Level 2)
                    'satuan_jual_pack' => $satuan2 ?: null,
                    'harga_beli_pack' => $hargaBeli2,
                    'harga_jual_pack' => $hargaJual2,
                    'stok_pack' => $stok2,
                    'isi_pcs_dalam_pack' => $isiPcsDalamPack,

                    // Pcs (Level 3)
                    'satuan_jual_pcs' => $satuan3 ?: 'Pcs',
                    'harga_beli_pcs' => $hargaBeli3,
                    'harga_jual_pcs' => $hargaJual3,
                    'stok_pcs' => $stok3,
                ];

                if ($product) {
                    $product->update($productPayload);
                    $updatedCount++;
                } else {
                    Product::create($productPayload);
                    $createdCount++;
                }
            }

            DB::commit();
        } catch (Exception $e) {
            DB::rollBack();
            throw new Exception('Gagal memproses baris CSV: '.$e->getMessage());
        }

        return [
            'created' => $createdCount,
            'updated' => $updatedCount,
            'total' => $createdCount + $updatedCount,
        ];
    }

    /**
     * Detect CSV Delimiter (; or , or \t)
     */
    protected function detectDelimiter(string $firstLine): string
    {
        $semicolons = substr_count($firstLine, ';');
        $commas = substr_count($firstLine, ',');
        $tabs = substr_count($firstLine, "\t");

        if ($semicolons >= $commas && $semicolons >= $tabs) {
            return ';';
        }
        if ($tabs >= $commas) {
            return "\t";
        }

        return ',';
    }

    /**
     * Normalize CSV header names to lowercased clean key
     */
    protected function normalizeHeaderName(string $name): string
    {
        $clean = strtolower(trim($name));
        $clean = preg_replace('/[^a-z0-9]/', '', $clean);

        return $clean;
    }

    /**
     * Extract row data using normalized header keys
     */
    protected function extractRowData(array $row, array $columnMap): array
    {
        $data = [];
        foreach ($columnMap as $cleanKey => $index) {
            $val = isset($row[$index]) ? trim((string) $row[$index]) : '';

            // Ensure valid UTF-8 string encoding
            if (! mb_check_encoding($val, 'UTF-8')) {
                $val = mb_convert_encoding($val, 'UTF-8', 'Windows-1252');
            }

            // Remove non-printable control characters except standard whitespace
            $val = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $val);

            $data[$cleanKey] = $val;
        }

        return $data;
    }

    /**
     * Parse decimal numbers (supporting fractional stocks / conversions)
     */
    protected function cleanDecimalNumber(mixed $value, float $default = 0): float
    {
        if (is_null($value) || $value === '') {
            return $default;
        }

        if (is_int($value) || is_float($value)) {
            return (float) $value;
        }

        $valStr = trim((string) $value);
        $valStr = preg_replace('/[^\d.,]/', '', $valStr);

        if (empty($valStr)) {
            return $default;
        }

        // Check if there are both dots and commas (e.g. "1.533.600,50" or "1,533,600.50")
        if (strpos($valStr, '.') !== false && strpos($valStr, ',') !== false) {
            $lastDotPos = strrpos($valStr, '.');
            $lastCommaPos = strrpos($valStr, ',');

            if ($lastCommaPos > $lastDotPos) {
                $valStr = str_replace('.', '', $valStr);
                $valStr = str_replace(',', '.', $valStr);
            } else {
                $valStr = str_replace(',', '', $valStr);
            }
        } elseif (substr_count($valStr, '.') > 1) {
            $valStr = str_replace('.', '', $valStr);
        } elseif (substr_count($valStr, ',') > 1) {
            $valStr = str_replace(',', '', $valStr);
        } elseif (strpos($valStr, ',') !== false) {
            $parts = explode(',', $valStr);
            if (isset($parts[1]) && strlen($parts[1]) === 3 && (int) $parts[0] > 0) {
                $valStr = str_replace(',', '', $valStr);
            } else {
                $valStr = str_replace(',', '.', $valStr);
            }
        }

        return (float) $valStr;
    }

    /**
     * Parse string numbers with thousand separators like "1.533.600" or "63.900" to integer
     */
    protected function cleanNumber(mixed $value): int
    {
        if (is_null($value) || $value === '') {
            return 0;
        }

        if (is_int($value) || is_float($value)) {
            return (int) round($value);
        }

        $valStr = trim((string) $value);

        // Remove any non-numeric and non-punctuation characters
        $valStr = preg_replace('/[^\d.,]/', '', $valStr);

        if (empty($valStr)) {
            return 0;
        }

        // Check if there are both dots and commas (e.g. "1.533.600,00" or "1,533,600.00")
        if (strpos($valStr, '.') !== false && strpos($valStr, ',') !== false) {
            $lastDotPos = strrpos($valStr, '.');
            $lastCommaPos = strrpos($valStr, ',');

            if ($lastCommaPos > $lastDotPos) {
                // "1.533.600,00" -> remove dot, replace comma with dot
                $valStr = str_replace('.', '', $valStr);
                $valStr = str_replace(',', '.', $valStr);
            } else {
                // "1,533,600.00" -> remove comma
                $valStr = str_replace(',', '', $valStr);
            }
        } elseif (substr_count($valStr, '.') > 1) {
            // "1.533.600" -> remove dots
            $valStr = str_replace('.', '', $valStr);
        } elseif (substr_count($valStr, ',') > 1) {
            // "1,533,600" -> remove commas
            $valStr = str_replace(',', '', $valStr);
        } elseif (strpos($valStr, '.') !== false) {
            // Single dot e.g. "63.900" or "5.325"
            $parts = explode('.', $valStr);
            if (isset($parts[1]) && strlen($parts[1]) === 3) {
                $valStr = str_replace('.', '', $valStr);
            }
        } elseif (strpos($valStr, ',') !== false) {
            // Single comma e.g. "63,900" or "5,325"
            $parts = explode(',', $valStr);
            if (isset($parts[1]) && strlen($parts[1]) === 3) {
                $valStr = str_replace(',', '', $valStr);
            }
        }

        return (int) round((float) $valStr);
    }

    /**
     * Ensure category exists (auto-create if missing)
     */
    protected function resolveCategory(string $categoryName): Category
    {
        if (empty($categoryName)) {
            $categoryName = 'Umum';
        }

        return Category::firstOrCreate(
            ['name' => $categoryName],
            [
                'image' => 'default.png',
                'description' => 'Kategori otomatis dari import CSV',
            ]
        );
    }

    /**
     * Ensure unit exists in units table (auto-create if missing)
     */
    protected function ensureUnitExists(string $unitName): void
    {
        if (! empty($unitName)) {
            Unit::firstOrCreate(['name' => trim($unitName)]);
        }
    }
}
