<?php

namespace Tests\Feature\Transactions;

use App\Models\CashierShift;
use App\Models\Category;
use App\Models\Product;
use App\Models\Transaction;
use App\Models\TransactionDetail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class DecimalStockAndQuantityTest extends TestCase
{
    use RefreshDatabase;

    protected User $cashier;
    protected Product $fuelProduct;

    protected function setUp(): void
    {
        parent::setUp();

        // Create permissions
        Permission::firstOrCreate(['name' => 'transactions-access']);

        // Create user
        $this->cashier = User::factory()->create();
        $this->cashier->givePermissionTo('transactions-access');

        // Create active cashier shift
        CashierShift::create([
            'user_id' => $this->cashier->id,
            'opened_by' => $this->cashier->id,
            'opening_cash' => 100000,
            'opened_at' => now(),
            'status' => 'open',
        ]);

        $category = Category::create([
            'image' => 'categories/default.png',
            'name' => 'BBM & Minyak Curah',
            'description' => 'Produk dengan takaran desimal',
        ]);

        // Create fuel product: Rp 12.500 per Liter, initial stock: 100 Liters
        $this->fuelProduct = Product::create([
            'barcode' => 'BBM-PERTALITE',
            'title' => 'Pertalite',
            'category_id' => $category->id,
            'buy_price' => 11000,
            'sell_price' => 12500,
            'stock' => 100.000,
            'satuan_beli' => 'Liter',
            'satuan_jual_pcs' => 'Liter',
            'harga_beli_pcs' => 11000,
            'harga_jual_pcs' => 12500,
            'stok_pcs' => 100.000,
        ]);
    }

    public function test_can_add_decimal_quantity_to_cart()
    {
        // Pembeli membeli 1.52 Liter (senilai Rp 19.000)
        $response = $this->actingAs($this->cashier)
            ->postJson(route('transactions.addToCart'), [
                'product_id' => $this->fuelProduct->id,
                'qty' => 1.52,
                'satuan_key' => 'pcs',
            ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('carts', [
            'product_id' => $this->fuelProduct->id,
            'qty' => 1.52,
            'price' => (int) round(12500 * 1.52), // Rp 19.000
        ]);
    }

    public function test_can_update_cart_to_decimal_quantity()
    {
        // Add 1 liter
        $this->actingAs($this->cashier)
            ->postJson(route('transactions.addToCart'), [
                'product_id' => $this->fuelProduct->id,
                'qty' => 1,
            ]);

        $cart = \App\Models\Cart::where('product_id', $this->fuelProduct->id)->first();

        // Update to 0.4 liter (senilai Rp 5.000)
        $response = $this->actingAs($this->cashier)
            ->patchJson(route('transactions.updateCart', $cart->id), [
                'qty' => 0.4,
            ]);

        $response->assertStatus(200);

        $cart->refresh();
        $this->assertEquals(0.4, $cart->qty);
        $this->assertEquals(5000, $cart->price);
    }

    public function test_checkout_decimal_quantity_deducts_stock_accurately()
    {
        // Beli 1.52 Liter (Rp 19.000)
        $this->actingAs($this->cashier)
            ->postJson(route('transactions.addToCart'), [
                'product_id' => $this->fuelProduct->id,
                'qty' => 1.52,
            ]);

        $response = $this->actingAs($this->cashier)
            ->post(route('transactions.store'), [
                'cash' => 20000,
                'payment_method' => 'cash',
            ]);

        $response->assertSessionHasNoErrors();

        // Verify stock deducted accurately: 100 - 1.52 = 98.48 Liter
        $this->fuelProduct->refresh();
        $this->assertEquals(98.48, $this->fuelProduct->stock);

        // Verify transaction total and details
        $detail = TransactionDetail::first();
        $this->assertEquals(1.52, $detail->qty);
        $this->assertEquals(19000, $detail->price);
    }
}
