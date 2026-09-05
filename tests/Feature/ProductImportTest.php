<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class ProductImportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::firstOrCreate(['name' => 'products-access', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'products-create', 'guard_name' => 'web']);
    }

    public function test_can_download_csv_template()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('products-access');

        $response = $this->actingAs($user)->get(route('products.import.template'));

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
    }

    public function test_can_import_products_from_csv_with_multi_units_and_string_prices()
    {
        $user = User::factory()->create();
        $user->givePermissionTo(['products-access', 'products-create']);

        $csvHeader = "Kode;Nama;Kategori;Satuan1;Satuan2;Satuan3;HargaBeli1;HargaBeli2;HargaBeli3;HargaJual1;HargaJual2;HargaJual3;stok1;stok2;stok3;isi1;isi2;isi3;Diskon1;Diskon2;Diskon3;PPN1;PPN2;PPN3;HargaBeliPPN1;HargaBeliPPN2;HargaBeliPPN3;KodeSupp;NamaSupp;AlamatSupp;TelponSupp;Expired;TempatRak;Foto;FotoSize\n";

        $csvRow = "8999901;Viva Foundation Kuning Pengantin 30ml;Kosmetik Kosmetik;dus;pack;pcs;1.533.600;63.900;5.325;1.535.000;65.000;6.500;6;0;0;288;24;1;0;0;0;0;0;0;1.533.600;63.900;5.325;SUP-001;PT Viva Indonesia;Jl. Industri No 12;08123456789;2027-12-31;Rak A-1;;\n";

        $csvContent = $csvHeader.$csvRow;
        $file = UploadedFile::fake()->createWithContent('import.csv', $csvContent);

        $response = $this->actingAs($user)->post(route('products.import'), [
            'csv_file' => $file,
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        // Verify product was created and prices formatted correctly
        $product = Product::where('barcode', '8999901')->first();
        $this->assertNotNull($product);
        $this->assertEquals('Viva Foundation Kuning Pengantin 30ml', $product->title);
        $this->assertEquals(1533600, $product->harga_beli_dus);
        $this->assertEquals(63900, $product->harga_beli_pack);
        $this->assertEquals(5325, $product->harga_beli_pcs);
        $this->assertEquals(1535000, $product->harga_jual_dus);
        $this->assertEquals(65000, $product->harga_jual_pack);
        $this->assertEquals(6500, $product->harga_jual_pcs);

        // Stock calculation: 6 dus * 288 pcs = 1728 pcs
        $this->assertEquals(1728, $product->stock);

        // Units auto-created
        $this->assertDatabaseHas('units', ['name' => 'dus']);
        $this->assertDatabaseHas('units', ['name' => 'pack']);
        $this->assertDatabaseHas('units', ['name' => 'pcs']);

        // Category auto-created
        $this->assertDatabaseHas('categories', ['name' => 'Kosmetik Kosmetik']);

        // Supplier auto-created
        $this->assertDatabaseHas('suppliers', ['name' => 'PT Viva Indonesia']);
    }

    public function test_can_import_products_from_windows_encoded_csv()
    {
        $user = User::factory()->create();
        $user->givePermissionTo(['products-access', 'products-create']);

        $csvHeader = "Kode;Nama;Kategori;Satuan1;Satuan2;Satuan3;HargaBeli1;HargaBeli2;HargaBeli3;HargaJual1;HargaJual2;HargaJual3;stok1;stok2;stok3;isi1;isi2;isi3;Diskon1;Diskon2;Diskon3;PPN1;PPN2;PPN3;HargaBeliPPN1;HargaBeliPPN2;HargaBeliPPN3;KodeSupp;NamaSupp;AlamatSupp;TelponSupp;Expired;TempatRak;Foto;FotoSize\n";

        // Non-UTF8 Windows-1252 characters (e.g. smart quotes \x93\x94, em-dash \x96, degree \xB0)
        $rawWin1252 = "WIN-001;Obat Flu & Batuk \x93Cap Kaki Tiga\x94 100\xB0;Farmasi;botol;;;5000;;;7500;;;10;;;1;;1;0;0;0;0;0;0;5000;;;;;;;;;;\n";

        $csvContent = $csvHeader.$rawWin1252;
        $file = UploadedFile::fake()->createWithContent('windows_import.csv', $csvContent);

        $response = $this->actingAs($user)->post(route('products.import'), [
            'csv_file' => $file,
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $product = Product::where('barcode', 'WIN-001')->first();
        $this->assertNotNull($product);
        // Assert valid UTF-8 string
        $this->assertTrue(mb_check_encoding($product->title, 'UTF-8'));
    }

    public function test_can_import_products_from_template_import_produk_2_file()
    {
        $user = User::factory()->create();
        $user->givePermissionTo(['products-access', 'products-create']);

        $filePath = base_path('template_import_produk (2).csv');
        $this->assertFileExists($filePath);

        $file = new UploadedFile($filePath, 'template_import_produk (2).csv', 'text/csv', null, true);

        $response = $this->actingAs($user)->post(route('products.import'), [
            'csv_file' => $file,
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $product = Product::where('barcode', '8999901')->first();
        $this->assertNotNull($product);
        $this->assertEquals('Viva Foundation Kuning Pengantin 30ml', $product->title);
        $this->assertEquals(1728, $product->stock);
        $this->assertTrue(mb_check_encoding($product->title, 'UTF-8'));
    }
}
