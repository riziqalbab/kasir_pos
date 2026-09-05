<?php

namespace Tests\Feature\Transactions;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class EceranProductTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::firstOrCreate(['name' => 'products-access', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'products-create', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'products-edit', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'transactions-access', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'cashier-shifts-access', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'cashier-shifts-open', 'guard_name' => 'web']);
    }

    public function test_can_create_and_update_eceran_product(): void
    {
        $admin = User::factory()->create();
        $admin->givePermissionTo(['products-access', 'products-create', 'products-edit']);

        $category = Category::create([
            'image' => 'default.png',
            'name' => 'Bahan Pokok',
            'description' => 'Kategori bahan pokok',
        ]);

        // 1. Create product with is_eceran = true
        $response = $this->actingAs($admin)->post(route('products.store'), [
            'barcode' => 'ECER-001',
            'title' => 'Minyak Goreng Curah',
            'category_id' => $category->id,
            'satuan_beli' => 'Liter',
            'satuan_jual_pcs' => 'Liter',
            'harga_beli_pcs' => 14000,
            'harga_jual_pcs' => 16000,
            'stok_pcs' => 100,
            'is_eceran' => 1,
        ]);

        $response->assertRedirect(route('products.index'));

        $product = Product::where('barcode', 'ECER-001')->firstOrFail();
        $this->assertTrue($product->is_eceran);

        // 2. Update product to is_eceran = false
        $updateResponse = $this->actingAs($admin)->put(route('products.update', $product->id), [
            'barcode' => 'ECER-001',
            'title' => 'Minyak Goreng Kemasan',
            'category_id' => $category->id,
            'satuan_beli' => 'Pcs',
            'satuan_jual_pcs' => 'Pcs',
            'harga_beli_pcs' => 15000,
            'harga_jual_pcs' => 18000,
            'stok_pcs' => 100,
            'is_eceran' => 0,
        ]);

        $updateResponse->assertRedirect(route('products.index'));

        $product->refresh();
        $this->assertFalse($product->is_eceran);
    }

    public function test_eceran_product_single_unit_and_decimal_checkout(): void
    {
        $cashier = User::factory()->create();
        $cashier->givePermissionTo([
            'transactions-access',
            'cashier-shifts-access',
            'cashier-shifts-open',
        ]);

        \App\Models\CashierShift::create([
            'user_id' => $cashier->id,
            'opened_by' => $cashier->id,
            'opened_at' => now(),
            'opening_cash' => 100000,
            'expected_cash' => 100000,
            'status' => 'open',
        ]);

        $category = Category::create([
            'image' => 'default.png',
            'name' => 'Bumbu & Curah',
            'description' => 'Kategori curah',
        ]);

        // Create eceran product: Minyak Goreng Curah, Unit = Liter, Stock = 50 Liter, Price = 16000 / Liter
        $product = Product::create([
            'category_id' => $category->id,
            'image' => 'product.png',
            'barcode' => 'ECER-LITER-01',
            'title' => 'Minyak Goreng Curah 1L',
            'is_eceran' => true,
            'satuan_beli' => 'Liter',
            'satuan_jual_pcs' => 'Liter',
            'harga_beli_pcs' => 14000,
            'harga_jual_pcs' => 16000,
            'stok_pcs' => 50,
            'stock' => 50,
            'buy_price' => 14000,
            'sell_price' => 16000,
        ]);

        // 1. Cashier adds 2.5 Liter to cart (2.5 * 16000 = 40000)
        $response = $this->actingAs($cashier)->post(route('transactions.addToCart'), [
            'product_id' => $product->id,
            'qty' => 2.5,
            'satuan_key' => 'pcs',
            'sell_price' => $product->harga_jual_pcs,
        ]);

        $response->assertRedirect(route('transactions.index'));
        $this->assertDatabaseHas('carts', [
            'cashier_id' => $cashier->id,
            'product_id' => $product->id,
            'qty' => 2.5,
            'satuan' => 'Liter',
            'price' => 40000,
        ]);

        // 2. Checkout
        $checkoutResponse = $this->actingAs($cashier)->post(route('transactions.store'), [
            'grand_total' => 40000,
            'cash' => 50000,
            'change' => 10000,
        ]);

        $transaction = \App\Models\Transaction::latest('id')->first();
        $this->assertNotNull($transaction);
        $checkoutResponse->assertRedirect(route('transactions.print', $transaction->invoice).'?autoprint=true');

        // Verify stock deducted accurately: 50 - 2.5 = 47.5 Liter
        $product->refresh();
        $this->assertEquals(47.5, (float) $product->stock);

        // Verify transaction detail records 2.5 Liter
        $this->assertDatabaseHas('transaction_details', [
            'transaction_id' => $transaction->id,
            'product_id' => $product->id,
            'qty' => 2.5,
            'satuan' => 'Liter',
            'price' => 40000,
        ]);
    }
}
