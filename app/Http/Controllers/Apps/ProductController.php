<?php

namespace App\Http\Controllers\Apps;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use App\Models\Unit;
use App\Services\AuditLogService;
use App\Services\ProductImportService;
use App\Services\StockMutationService;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class ProductController extends Controller
{
    public function __construct(
        private readonly StockMutationService $stockMutationService,
        private readonly AuditLogService $auditLogService,
        private readonly ProductImportService $productImportService
    ) {}

    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index()
    {
        $sort = request()->input('sort', 'created_at_desc');

        // get products
        $products = Product::when(request()->search, function ($products) {
            $products->where('title', 'like', '%'.request()->search.'%');
        })
            ->when(request()->category_id, function ($products) {
                $products->where('category_id', request()->category_id);
            })
            ->when($sort, function ($query, $sort) {
                match ($sort) {
                    'updated_at_desc' => $query->orderBy('updated_at', 'desc')->orderBy('id', 'desc'),
                    'created_at_asc' => $query->orderBy('created_at', 'asc')->orderBy('id', 'asc'),
                    'title_asc' => $query->orderBy('title', 'asc')->orderBy('id', 'asc'),
                    'title_desc' => $query->orderBy('title', 'desc')->orderBy('id', 'desc'),
                    'stock_asc' => $query->orderBy('stock', 'asc')->orderBy('id', 'asc'),
                    'stock_desc' => $query->orderBy('stock', 'desc')->orderBy('id', 'desc'),
                    'price_asc' => $query->orderBy('sell_price', 'asc')->orderBy('id', 'asc'),
                    'price_desc' => $query->orderBy('sell_price', 'desc')->orderBy('id', 'desc'),
                    default => $query->orderBy('created_at', 'desc')->orderBy('id', 'desc'),
                };
            })
            ->with('category')->paginate(10)->withQueryString();

        $categories = Category::all();

        // return inertia
        return Inertia::render('Dashboard/Products/Index', [
            'products' => $products,
            'categories' => $categories,
            'filters' => request()->all(['search', 'category_id', 'sort']),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function create()
    {
        // get categories
        $categories = Category::all();

        // ensure default units exist
        foreach (['Dus', 'Pak', 'Pcs'] as $name) {
            Unit::firstOrCreate(['name' => $name]);
        }

        // get units
        $units = Unit::orderBy('name')->get();

        // return inertia
        return Inertia::render('Dashboard/Products/Create', [
            'categories' => $categories,
            'units' => $units,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     *
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
        /**
         * validate
         */
        $request->validate([
            'barcode' => 'required|unique:products,barcode',
            'sku' => 'nullable|unique:products,sku',
            'title' => 'required',
            'category_id' => 'required',
            'image' => 'nullable|image|mimes:jpeg,jpg,png|max:2048',
            'satuan_beli' => 'nullable|string',
            'isi_pcs_dalam_pack' => 'nullable|numeric|min:0',
            'isi_pack_dalam_dus' => 'nullable|numeric|min:0',
            'isi_pcs_dalam_dus' => 'nullable|numeric|min:0',

            'satuan_jual_dus' => 'nullable|string',
            'harga_beli_dus' => 'nullable|integer|min:0',
            'harga_jual_dus' => 'nullable|integer|min:0',
            'stok_dus' => 'nullable|numeric|min:0',

            'satuan_jual_pack' => 'nullable|string',
            'harga_beli_pack' => 'nullable|integer|min:0',
            'harga_jual_pack' => 'nullable|integer|min:0',
            'stok_pack' => 'nullable|numeric|min:0',

            'satuan_jual_pcs' => 'nullable|string',
            'harga_beli_pcs' => 'nullable|integer|min:0',
            'harga_jual_pcs' => 'nullable|integer|min:0',
            'stok_pcs' => 'nullable|numeric|min:0',

            // Fallback inputs for backward compatibility
            'buy_price' => 'nullable|integer|min:0',
            'sell_price' => 'nullable|integer|min:0',
            'stock' => 'nullable|numeric|min:0',
            'is_stock_synced' => 'nullable|boolean',
            'is_eceran' => 'nullable|boolean',
        ]);

        // upload image
        $imageName = null;
        if ($request->hasFile('image')) {
            $image = $request->file('image');
            $image->storeAs('public/products', $image->hashName());
            $imageName = $image->hashName();
        }

        if ($request->boolean('is_eceran')) {
            $satuanEceran = $request->input('satuan_jual_pcs') ?: ($request->input('satuan_beli') ?: 'Pcs');
            $isiPcsDalamPack = 0;
            $isiPackDalamDus = 1;
            $isiPcsDalamDus = 0;
            $satuanBeli = $satuanEceran;
            $satuanJualPcs = $satuanEceran;
            $satuanJualDus = null;
            $satuanJualPack = null;
            $hargaBeliDus = 0;
            $hargaJualDus = 0;
            $stokDus = 0;
            $hargaBeliPack = 0;
            $hargaJualPack = 0;
            $stokPack = 0;
            $buyPricePcs = (int) ($request->filled('harga_beli_pcs') ? $request->harga_beli_pcs : $request->input('buy_price', 0));
            $sellPricePcs = (int) ($request->filled('harga_jual_pcs') ? $request->harga_jual_pcs : $request->input('sell_price', 0));
            $stokPcs = (float) ($request->filled('stok_pcs') ? $request->stok_pcs : $request->input('stock', 0));
            $computedStock = $stokPcs;
        } else {
            $isiPcsDalamPack = (float) $request->input('isi_pcs_dalam_pack', 0);
            $isiPackDalamDus = (float) $request->input('isi_pack_dalam_dus', 1);
            $isiPcsDalamDus = (float) $request->input('isi_pcs_dalam_dus', 0);
            if ($isiPcsDalamDus == 0 && $isiPcsDalamPack > 0) {
                $isiPcsDalamDus = $isiPcsDalamPack * $isiPackDalamDus;
            }

            $satuanBeli = $request->input('satuan_beli') ?: 'Pcs';
            $satuanJualPcs = $request->input('satuan_jual_pcs') ?: 'Pcs';
            $satuanJualDus = $request->satuan_jual_dus;
            $satuanJualPack = $request->satuan_jual_pack;
            $hargaBeliDus = (int) $request->input('harga_beli_dus', 0);
            $hargaJualDus = (int) $request->input('harga_jual_dus', 0);
            $stokDus = (float) $request->input('stok_dus', 0);
            $hargaBeliPack = (int) $request->input('harga_beli_pack', 0);
            $hargaJualPack = (int) $request->input('harga_jual_pack', 0);
            $stokPack = (float) $request->input('stok_pack', 0);

            $buyPricePcs = (int) ($request->filled('harga_beli_pcs') ? $request->harga_beli_pcs : $request->input('buy_price', 0));
            $sellPricePcs = (int) ($request->filled('harga_jual_pcs') ? $request->harga_jual_pcs : $request->input('sell_price', 0));
            $stokPcs = (float) ($request->filled('stok_pcs') ? $request->stok_pcs : $request->input('stock', 0));

            if ($request->input('is_stock_synced')) {
                $computedStock = (float) $request->input('stock', $stokPcs);
            } else {
                $computedStock = ($stokDus * $isiPcsDalamDus) + ($stokPack * $isiPcsDalamPack) + $stokPcs;
            }
        }

        $sku = $request->input('sku');
        if (empty($sku)) {
            do {
                $sku = 'SKU-'.strtoupper(\Illuminate\Support\Str::random(8));
            } while (Product::where('sku', $sku)->exists());
        }

        // create product
        $product = Product::create([
            'image' => $imageName,
            'barcode' => $request->barcode,
            'sku' => $sku,
            'title' => $request->title,
            'description' => $request->description,
            'category_id' => $request->category_id,
            'buy_price' => $buyPricePcs,
            'sell_price' => $sellPricePcs,
            'stock' => $computedStock,
            'satuan_beli' => $satuanBeli,
            'isi_pcs_dalam_pack' => $isiPcsDalamPack,
            'isi_pack_dalam_dus' => $isiPackDalamDus,
            'isi_pcs_dalam_dus' => $isiPcsDalamDus,
            'satuan_jual_dus' => $satuanJualDus,
            'harga_beli_dus' => $hargaBeliDus,
            'harga_jual_dus' => $hargaJualDus,
            'stok_dus' => $stokDus,
            'satuan_jual_pack' => $satuanJualPack,
            'harga_beli_pack' => $hargaBeliPack,
            'harga_jual_pack' => $hargaJualPack,
            'stok_pack' => $stokPack,
            'is_eceran' => $request->boolean('is_eceran'),
            'satuan_jual_pcs' => $satuanJualPcs,
            'harga_beli_pcs' => $buyPricePcs,
            'harga_jual_pcs' => $sellPricePcs,
            'stok_pcs' => $stokPcs,
        ]);

        $this->stockMutationService->recordInitialStock($product, $request->user()?->id);
        $this->auditLogService->log(
            event: 'product.created',
            module: 'products',
            auditable: $product,
            description: 'Produk baru dibuat.',
            after: $this->productAuditPayload($product->fresh())
        );

        // redirect
        return to_route('products.index');
    }

    /**
     * Show the form for editing the specified resource.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function edit(Product $product)
    {
        // get categories
        $categories = Category::all();

        // ensure default units exist
        foreach (['Dus', 'Pak', 'Pcs'] as $name) {
            Unit::firstOrCreate(['name' => $name]);
        }

        // get units
        $units = Unit::orderBy('name')->get();

        return Inertia::render('Dashboard/Products/Edit', [
            'product' => $product,
            'categories' => $categories,
            'units' => $units,
        ]);
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function update(Request $request, Product $product)
    {
        $before = $this->productAuditPayload($product);

        /**
         * validate
         */
        $request->validate([
            'barcode' => 'required|unique:products,barcode,'.$product->id,
            'sku' => 'nullable|unique:products,sku,'.$product->id,
            'title' => 'required',
            'category_id' => 'required',
            'satuan_beli' => 'nullable|string',
            'isi_pcs_dalam_pack' => 'nullable|numeric|min:0',
            'isi_pack_dalam_dus' => 'nullable|numeric|min:0',
            'isi_pcs_dalam_dus' => 'nullable|numeric|min:0',

            'satuan_jual_dus' => 'nullable|string',
            'harga_beli_dus' => 'nullable|integer|min:0',
            'harga_jual_dus' => 'nullable|integer|min:0',
            'stok_dus' => 'nullable|numeric|min:0',

            'satuan_jual_pack' => 'nullable|string',
            'harga_beli_pack' => 'nullable|integer|min:0',
            'harga_jual_pack' => 'nullable|integer|min:0',
            'stok_pack' => 'nullable|numeric|min:0',

            'satuan_jual_pcs' => 'nullable|string',
            'harga_beli_pcs' => 'nullable|integer|min:0',
            'harga_jual_pcs' => 'nullable|integer|min:0',
            'stok_pcs' => 'nullable|numeric|min:0',

            // Fallback inputs for backward compatibility
            'buy_price' => 'nullable|integer|min:0',
            'sell_price' => 'nullable|integer|min:0',
            'stock' => 'nullable|numeric|min:0',
            'is_stock_synced' => 'nullable|boolean',
            'is_eceran' => 'nullable|boolean',
        ]);

        if ($request->boolean('is_eceran')) {
            $satuanEceran = $request->input('satuan_jual_pcs') ?: ($request->input('satuan_beli') ?: ($product->satuan_jual_pcs ?: 'Pcs'));
            $isiPcsDalamPack = 0;
            $isiPackDalamDus = 1;
            $isiPcsDalamDus = 0;
            $satuanBeli = $satuanEceran;
            $satuanJualPcs = $satuanEceran;
            $satuanJualDus = null;
            $satuanJualPack = null;
            $hargaBeliDus = 0;
            $hargaJualDus = 0;
            $stokDus = 0;
            $hargaBeliPack = 0;
            $hargaJualPack = 0;
            $stokPack = 0;
            $buyPricePcs = (int) ($request->filled('harga_beli_pcs') ? $request->harga_beli_pcs : $request->input('buy_price', $product->buy_price));
            $sellPricePcs = (int) ($request->filled('harga_jual_pcs') ? $request->harga_jual_pcs : $request->input('sell_price', $product->sell_price));
            $stokPcs = (float) ($request->filled('stok_pcs') ? $request->stok_pcs : $request->input('stock', $product->stok_pcs));
            $computedStock = $stokPcs;
        } else {
            $isiPcsDalamPack = (float) $request->input('isi_pcs_dalam_pack', 0);
            $isiPackDalamDus = (float) $request->input('isi_pack_dalam_dus', 1);
            $isiPcsDalamDus = (float) $request->input('isi_pcs_dalam_dus', 0);
            if ($isiPcsDalamDus == 0 && $isiPcsDalamPack > 0) {
                $isiPcsDalamDus = $isiPcsDalamPack * $isiPackDalamDus;
            }

            $satuanBeli = $request->input('satuan_beli') ?: ($product->satuan_beli ?: 'Pcs');
            $satuanJualPcs = $request->input('satuan_jual_pcs') ?: ($product->satuan_jual_pcs ?: 'Pcs');
            $satuanJualDus = $request->satuan_jual_dus;
            $satuanJualPack = $request->satuan_jual_pack;
            $hargaBeliDus = (int) $request->input('harga_beli_dus', 0);
            $hargaJualDus = (int) $request->input('harga_jual_dus', 0);
            $stokDus = (float) $request->input('stok_dus', $product->stok_dus);
            $hargaBeliPack = (int) $request->input('harga_beli_pack', 0);
            $hargaJualPack = (int) $request->input('harga_jual_pack', 0);
            $stokPack = (float) $request->input('stok_pack', $product->stok_pack);

            $buyPricePcs = (int) ($request->filled('harga_beli_pcs') ? $request->harga_beli_pcs : $request->input('buy_price', $product->buy_price));
            $sellPricePcs = (int) ($request->filled('harga_jual_pcs') ? $request->harga_jual_pcs : $request->input('sell_price', $product->sell_price));
            $stokPcs = (float) ($request->filled('stok_pcs') ? $request->stok_pcs : $request->input('stock', $product->stok_pcs));

            if ($request->input('is_stock_synced')) {
                $computedStock = (float) $request->input('stock', $stokPcs);
            } else {
                $computedStock = ($stokDus * $isiPcsDalamDus) + ($stokPack * $isiPcsDalamPack) + $stokPcs;
            }
        }

        if ($computedStock !== (float) $product->stock) {
            \App\Models\StockMutation::create([
                'product_id' => $product->id,
                'reference_type' => 'product_update',
                'reference_id' => $product->id,
                'mutation_type' => $computedStock > $product->stock ? 'in' : 'out',
                'qty' => abs($computedStock - (float) $product->stock),
                'stock_before' => $product->stock,
                'stock_after' => $computedStock,
                'notes' => 'Penyesuaian stok saat update produk.',
                'created_by' => $request->user()?->id,
            ]);
        }

        $sku = $request->input('sku');
        if (empty($sku)) {
            do {
                $sku = 'SKU-'.strtoupper(\Illuminate\Support\Str::random(8));
            } while (Product::where('sku', $sku)->exists());
        }

        $updateData = [
            'barcode' => $request->barcode,
            'sku' => $sku,
            'title' => $request->title,
            'description' => $request->description,
            'category_id' => $request->category_id,
            'buy_price' => $buyPricePcs,
            'sell_price' => $sellPricePcs,
            'stock' => $computedStock,
            'satuan_beli' => $satuanBeli,
            'isi_pcs_dalam_pack' => $isiPcsDalamPack,
            'isi_pack_dalam_dus' => $isiPackDalamDus,
            'isi_pcs_dalam_dus' => $isiPcsDalamDus,
            'satuan_jual_dus' => $satuanJualDus,
            'harga_beli_dus' => $hargaBeliDus,
            'harga_jual_dus' => $hargaJualDus,
            'stok_dus' => $stokDus,
            'satuan_jual_pack' => $satuanJualPack,
            'harga_beli_pack' => $hargaBeliPack,
            'harga_jual_pack' => $hargaJualPack,
            'stok_pack' => $stokPack,
            'satuan_jual_pcs' => $satuanJualPcs,
            'is_eceran' => $request->boolean('is_eceran'),
            'harga_beli_pcs' => $buyPricePcs,
            'harga_jual_pcs' => $sellPricePcs,
            'stok_pcs' => $stokPcs,
        ];

        // check image update
        if ($request->file('image')) {

            // remove old image
            Storage::disk('local')->delete('public/products/'.basename($product->image));

            // upload new image
            $image = $request->file('image');
            $image->storeAs('public/products', $image->hashName());
            $updateData['image'] = $image->hashName();
        }

        $product->update($updateData);

        $this->logProductUpdate($product, $before);

        return to_route('products.index');
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function destroy($id)
    {
        // find by ID
        $product = Product::findOrFail($id);
        $before = $this->productAuditPayload($product);

        // remove image
        Storage::disk('local')->delete('public/products/'.basename($product->image));

        // delete
        $product->delete();

        $this->auditLogService->log(
            event: 'product.deleted',
            module: 'products',
            auditable: $product,
            description: 'Produk dihapus.',
            before: $before
        );

        // redirect
        return back();
    }

    private function logProductUpdate(Product $product, array $before): void
    {
        $after = $this->productAuditPayload($product->fresh());

        $this->auditLogService->log(
            event: 'product.updated',
            module: 'products',
            auditable: $product,
            description: 'Data produk diperbarui.',
            before: $before,
            after: $after
        );

        if (
            (int) $before['buy_price'] !== (int) $after['buy_price']
            || (int) $before['sell_price'] !== (int) $after['sell_price']
        ) {
            $this->auditLogService->log(
                event: 'product.price_updated',
                module: 'products',
                auditable: $product,
                description: 'Harga produk diperbarui.',
                before: [
                    'buy_price' => $before['buy_price'],
                    'sell_price' => $before['sell_price'],
                ],
                after: [
                    'buy_price' => $after['buy_price'],
                    'sell_price' => $after['sell_price'],
                ]
            );
        }
    }

    private function productAuditPayload(Product $product): array
    {
        return $this->auditLogService->only($product->toArray(), [
            'title',
            'barcode',
            'sku',
            'buy_price',
            'sell_price',
            'stock',
            'category_id',
            'satuan_beli',
            'isi_pcs_dalam_pack',
            'isi_pack_dalam_dus',
            'isi_pcs_dalam_dus',
            'satuan_jual_dus',
            'harga_beli_dus',
            'harga_jual_dus',
            'satuan_jual_pack',
            'harga_beli_pack',
            'harga_jual_pack',
            'satuan_jual_pcs',
            'harga_beli_pcs',
            'harga_jual_pcs',
            'is_eceran',
        ]);
    }

    /**
     * Import products from CSV file.
     */
    public function import(Request $request)
    {
        $request->validate([
            'csv_file' => 'required|file|mimes:csv,txt|max:10240',
        ]);

        try {
            $file = $request->file('csv_file');
            $result = $this->productImportService->importFromCsv($file->getRealPath());

            $this->auditLogService->log(
                'import',
                'products',
                $result,
                "Mengimpor {$result['total']} produk dari CSV ({$result['created']} baru, {$result['updated']} diperbarui)."
            );

            return back()->with('success', "Berhasil mengimpor {$result['total']} produk ({$result['created']} baru, {$result['updated']} diperbarui).");
        } catch (Exception $e) {
            return back()->with('error', 'Gagal mengimpor CSV: '.$e->getMessage());
        }
    }

    /**
     * Download CSV template for product import.
     */
    public function downloadTemplate()
    {
        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="template_import_produk.csv"',
        ];

        $columns = [
            'Kode', 'Nama', 'Kategori',
            'Satuan1', 'Satuan2', 'Satuan3',
            'HargaBeli1', 'HargaBeli2', 'HargaBeli3',
            'HargaJual1', 'HargaJual2', 'HargaJual3',
            'stok1', 'stok2', 'stok3',
            'isi1', 'isi2', 'isi3',
            'Diskon1', 'Diskon2', 'Diskon3',
            'PPN1', 'PPN2', 'PPN3',
            'HargaBeliPPN1', 'HargaBeliPPN2', 'HargaBeliPPN3',
            'KodeSupp', 'NamaSupp', 'AlamatSupp', 'TelponSupp',
            'Expired', 'TempatRak', 'Foto', 'FotoSize',
        ];

        $sampleRow = [
            '8999901', 'Viva Foundation Kuning Pengantin 30ml', 'Kosmetik',
            'dus', 'pack', 'pcs',
            '1.533.600', '63.900', '5.325',
            '1.535.000', '65.000', '6.500',
            '6', '0', '0',
            '288', '24', '1',
            '0', '0', '0',
            '0', '0', '0',
            '1.533.600', '63.900', '5.325',
            'SUP-001', 'PT Viva Indonesia', 'Jl. Industri No. 12', '08123456789',
            '2027-12-31', 'Rak A-1', '', '',
        ];

        $callback = function () use ($columns, $sampleRow) {
            $file = fopen('php://output', 'w');
            fputcsv($file, $columns, ';');
            fputcsv($file, $sampleRow, ';');
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
