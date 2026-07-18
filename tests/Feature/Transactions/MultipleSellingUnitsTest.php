<?php

namespace Tests\Feature\Transactions;

use App\Models\Cart;
use App\Models\Category;
use App\Models\Product;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class MultipleSellingUnitsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::firstOrCreate([
            'name' => 'transactions-access',
            'guard_name' => 'web',
        ]);
        Permission::firstOrCreate([
            'name' => 'cashier-shifts-access',
            'guard_name' => 'web',
        ]);
        Permission::firstOrCreate([
            'name' => 'cashier-shifts-open',
            'guard_name' => 'web',
        ]);
        Permission::firstOrCreate([
            'name' => 'cashier-shifts-close',
            'guard_name' => 'web',
        ]);
    }

    public function test_cashier_can_add_product_to_cart_with_different_units(): void
    {
        $cashier = $this->createCashier();
        $this->openShiftFor($cashier);
        $product = $this->createMultiUnitProduct();

        // 1. Add PCS to cart
        $response = $this
            ->actingAs($cashier)
            ->post(route('transactions.addToCart'), [
                'product_id' => $product->id,
                'qty' => 5,
                'satuan_key' => 'pcs',
                'sell_price' => $product->harga_jual_pcs,
            ]);

        $response->assertRedirect(route('transactions.index'));
        $this->assertDatabaseHas('carts', [
            'cashier_id' => $cashier->id,
            'product_id' => $product->id,
            'qty' => 5,
            'satuan_key' => 'pcs',
            'satuan' => 'Pcs',
            'price' => $product->harga_jual_pcs * 5,
        ]);

        // 2. Add DUS to cart
        $response2 = $this
            ->actingAs($cashier)
            ->post(route('transactions.addToCart'), [
                'product_id' => $product->id,
                'qty' => 1,
                'satuan_key' => 'dus',
                'sell_price' => $product->harga_jual_dus,
            ]);

        $response2->assertRedirect(route('transactions.index'));
        $this->assertDatabaseHas('carts', [
            'cashier_id' => $cashier->id,
            'product_id' => $product->id,
            'qty' => 1,
            'satuan_key' => 'dus',
            'satuan' => 'Dus',
            'price' => $product->harga_jual_dus * 1,
        ]);

        // Verify there are 2 separate cart lines for the same product due to different units
        $this->assertSame(2, Cart::where('product_id', $product->id)->count());
    }

    public function test_cashier_can_update_cart_unit(): void
    {
        $cashier = $this->createCashier();
        $this->openShiftFor($cashier);
        $product = $this->createMultiUnitProduct();

        $cart = Cart::create([
            'cashier_id' => $cashier->id,
            'product_id' => $product->id,
            'qty' => 2,
            'price' => $product->harga_jual_pcs * 2,
            'satuan' => 'Pcs',
            'satuan_key' => 'pcs',
        ]);

        // Update the unit from PCS to DUS
        $response = $this
            ->actingAs($cashier)
            ->patch(route('transactions.updateCart', $cart->id), [
                'qty' => 2,
                'satuan_key' => 'dus',
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('carts', [
            'id' => $cart->id,
            'qty' => 2,
            'satuan_key' => 'dus',
            'satuan' => 'Dus',
            'price' => $product->harga_jual_dus * 2,
        ]);
    }

    public function test_checkout_deducts_unified_stock_based_on_conversion_rules(): void
    {
        $cashier = $this->createCashier();
        $this->openShiftFor($cashier);
        $product = $this->createMultiUnitProduct(); // Stock is 260 Pcs

        // Add 1 Dus to cart (1 Dus = 100 Pcs)
        Cart::create([
            'cashier_id' => $cashier->id,
            'product_id' => $product->id,
            'qty' => 1,
            'price' => $product->harga_jual_dus,
            'satuan' => 'Dus',
            'satuan_key' => 'dus',
        ]);

        // Add 2 Pak to cart (1 Pak = 10 Pcs)
        Cart::create([
            'cashier_id' => $cashier->id,
            'product_id' => $product->id,
            'qty' => 2,
            'price' => $product->harga_jual_pack * 2,
            'satuan' => 'Pak',
            'satuan_key' => 'pack',
        ]);

        // Checkout
        $grandTotal = $product->harga_jual_dus + ($product->harga_jual_pack * 2);
        $response = $this
            ->actingAs($cashier)
            ->post(route('transactions.store'), [
                'grand_total' => $grandTotal,
                'cash' => $grandTotal + 10000,
                'change' => 10000,
            ]);

        $transaction = Transaction::latest('id')->first();
        $this->assertNotNull($transaction);
        $response->assertRedirect(route('transactions.print', $transaction->invoice) . '?autoprint=true');

        // Deducted stock check: Initial stock is 260 Pcs
        // Checkout includes: 1 Dus (100 Pcs) + 2 Pak (20 Pcs) = 120 Pcs
        // Remaining stock should be: 260 - 120 = 140 Pcs
        $product->refresh();
        $this->assertSame(140, $product->stock);

        // Verify transaction details have the correct units
        $this->assertSame(2, $transaction->details->count());
        $this->assertDatabaseHas('transaction_details', [
            'transaction_id' => $transaction->id,
            'product_id' => $product->id,
            'qty' => 1,
            'satuan_key' => 'dus',
            'satuan' => 'Dus',
        ]);
        $this->assertDatabaseHas('transaction_details', [
            'transaction_id' => $transaction->id,
            'product_id' => $product->id,
            'qty' => 2,
            'satuan_key' => 'pack',
            'satuan' => 'Pak',
        ]);
    }

    protected function createCashier(): User
    {
        $user = User::factory()->create();
        $user->givePermissionTo([
            'transactions-access',
            'cashier-shifts-access',
            'cashier-shifts-open',
            'cashier-shifts-close',
        ]);

        return $user;
    }

    protected function openShiftFor(User $cashier)
    {
        return \App\Models\CashierShift::create([
            'user_id' => $cashier->id,
            'opened_by' => $cashier->id,
            'opened_at' => now(),
            'opening_cash' => 100000,
            'expected_cash' => 100000,
            'status' => 'open',
        ]);
    }

    protected function createMultiUnitProduct(): Product
    {
        $category = Category::create([
            'name' => 'Sembako',
            'description' => 'Kategori pengujian',
            'image' => 'category.png',
        ]);

        return Product::create([
            'category_id' => $category->id,
            'image' => 'product.png',
            'barcode' => 'BRCD-'.Str::upper(Str::random(10)),
            'title' => 'Indomie Goreng Multi Unit',
            'satuan_beli' => 'Dus',
            'isi_pcs_dalam_pack' => 10,
            'isi_pack_dalam_dus' => 10,
            'isi_pcs_dalam_dus' => 100,

            // DUS
            'satuan_jual_dus' => 'Dus',
            'harga_beli_dus' => 250000,
            'harga_jual_dus' => 280000,
            'stok_dus' => 2,

            // PAK
            'satuan_jual_pack' => 'Pak',
            'harga_beli_pack' => 27000,
            'harga_jual_pack' => 30000,
            'stok_pack' => 5,

            // PCS
            'satuan_jual_pcs' => 'Pcs',
            'harga_beli_pcs' => 2800,
            'harga_jual_pcs' => 3200,
            'stok_pcs' => 10,

            // Overall stock: (2 * 100) + (5 * 10) + 10 = 260
            'stock' => 260,
            'buy_price' => 2800,
            'sell_price' => 3200,
        ]);
    }

    public function test_sku_is_optional_and_auto_generated_if_empty(): void
    {
        $admin = User::factory()->create();
        $admin->givePermissionTo([
            Permission::firstOrCreate(['name' => 'products-access', 'guard_name' => 'web']),
            Permission::firstOrCreate(['name' => 'products-create', 'guard_name' => 'web']),
            Permission::firstOrCreate(['name' => 'products-edit', 'guard_name' => 'web']),
        ]);

        $category = Category::create([
            'name' => 'Makanan',
            'description' => 'Deskripsi Makanan',
            'image' => 'category.png',
        ]);

        $image = \Illuminate\Http\UploadedFile::fake()->image('product.png');

        // 1. Post request without sku
        $response = $this
            ->actingAs($admin)
            ->post(route('products.store'), [
                'barcode' => 'BARCODE-XYZ',
                'title' => 'Product without SKU',
                'category_id' => $category->id,
                'image' => $image,
                'buy_price' => 1000,
                'sell_price' => 2000,
                'stock' => 10,
            ]);

        $response->assertRedirect(route('products.index'));

        // Retrieve and check the product
        $product = Product::where('barcode', 'BARCODE-XYZ')->first();
        $this->assertNotNull($product);
        $this->assertNotEmpty($product->sku);
        $this->assertStringStartsWith('SKU-', $product->sku);

        // 2. Put/Patch update with empty sku
        $response2 = $this
            ->actingAs($admin)
            ->put(route('products.update', $product->id), [
                'barcode' => 'BARCODE-XYZ',
                'title' => 'Product with Updated SKU',
                'category_id' => $category->id,
                'buy_price' => 1000,
                'sell_price' => 2000,
                'sku' => '', // empty SKU to trigger auto-generation
            ]);

        $response2->assertRedirect(route('products.index'));

        $product->refresh();
        $this->assertNotEmpty($product->sku);
        $this->assertStringStartsWith('SKU-', $product->sku);
        $this->assertEquals('Product with Updated SKU', $product->title);
    }

    public function test_store_product_with_synced_stock()
    {
        $admin = User::factory()->create();
        $admin->givePermissionTo([
            Permission::firstOrCreate(['name' => 'products-access', 'guard_name' => 'web']),
            Permission::firstOrCreate(['name' => 'products-create', 'guard_name' => 'web']),
        ]);

        $category = Category::create([
            'name' => 'Makanan Ringan',
            'description' => 'Deskripsi Makanan Ringan',
            'image' => 'category.png',
        ]);

        // Post request with is_stock_synced => true
        $response = $this
            ->actingAs($admin)
            ->post(route('products.store'), [
                'barcode' => 'BARCODE-SYNCED',
                'title' => 'Synced Stock Product',
                'category_id' => $category->id,
                'satuan_beli' => 'Dus',
                'isi_pcs_dalam_pack' => 10,
                'isi_pack_dalam_dus' => 10,
                'isi_pcs_dalam_dus' => 100,

                // DUS
                'satuan_jual_dus' => 'Dus',
                'harga_beli_dus' => 250000,
                'harga_jual_dus' => 280000,
                'stok_dus' => 5,

                // PAK
                'satuan_jual_pack' => 'Pak',
                'harga_beli_pack' => 27000,
                'harga_jual_pack' => 30000,
                'stok_pack' => 50,

                // PCS
                'satuan_jual_pcs' => 'Pcs',
                'harga_beli_pcs' => 2800,
                'harga_jual_pcs' => 3200,
                'stok_pcs' => 500,

                'stock' => 500,
                'is_stock_synced' => true,
            ]);

        $response->assertRedirect(route('products.index'));

        // Retrieve and check the product
        $product = Product::where('barcode', 'BARCODE-SYNCED')->first();
        $this->assertNotNull($product);
        $this->assertEquals(500, $product->stock);
        $this->assertEquals(5, $product->stok_dus);
        $this->assertEquals(50, $product->stok_pack);
        $this->assertEquals(500, $product->stok_pcs);
    }

    public function test_cashier_can_add_product_to_cart_with_manual_discount(): void
    {
        $cashier = $this->createCashier();
        $this->openShiftFor($cashier);

        $product = $this->createMultiUnitProduct();

        // Add to cart with a manual discount of 500 per unit
        $response = $this
            ->actingAs($cashier)
            ->post(route('transactions.addToCart'), [
                'product_id' => $product->id,
                'qty' => 3,
                'satuan_key' => 'pcs',
                'discount' => 500,
            ]);

        $response->assertRedirect(route('transactions.index'));
        $this->assertDatabaseHas('carts', [
            'cashier_id' => $cashier->id,
            'product_id' => $product->id,
            'qty' => 3,
            'satuan_key' => 'pcs',
            'discount' => 500,
        ]);

        // Retrieve cart and check PricingService preview output
        $cartItem = Cart::where('cashier_id', $cashier->id)->first();
        $pricingService = app(\App\Services\PricingService::class);
        $preview = $pricingService->previewCart([$cartItem]);

        $this->assertEquals(3200 * 3, $preview['summary']['base_subtotal']);
        $this->assertEquals(1500, $preview['summary']['promo_discount_total']);
        $this->assertEquals(8100, $preview['summary']['subtotal_after_promo']);
    }
}

