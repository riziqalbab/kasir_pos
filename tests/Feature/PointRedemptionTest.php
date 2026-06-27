<?php

namespace Tests\Feature;

use App\Models\CashierShift;
use App\Models\Category;
use App\Models\Customer;
use App\Models\PointPrize;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PointRedemptionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('db:seed', ['--class' => 'PermissionSeeder']);
        $this->artisan('db:seed', ['--class' => 'RoleSeeder']);
    }

    private function createProduct(string $title, int $stock): Product
    {
        $category = Category::firstOrCreate([
            'name' => 'Test Category',
        ], [
            'image' => 'default.png',
            'description' => 'Test Category Description',
        ]);

        return Product::create([
            'category_id' => $category->id,
            'barcode' => 'BC-'.uniqid(),
            'title' => $title,
            'buy_price' => 1000,
            'sell_price' => 2000,
            'stock' => $stock,
        ]);
    }

    public function test_admin_can_crud_point_prizes()
    {
        $admin = User::factory()->create();
        $admin->assignRole('super-admin');

        $product1 = $this->createProduct('Mug Premium', 10);
        $product2 = $this->createProduct('Mug Premium Gold', 8);

        // Create
        $response = $this->actingAs($admin)
            ->post(route('point-prizes.store'), [
                'product_id' => $product1->id,
                'points_required' => 20,
            ]);

        $response->assertRedirect(route('point-prizes.index'));
        $this->assertDatabaseHas('point_prizes', [
            'product_id' => $product1->id,
            'points_required' => 20,
        ]);

        $prize = PointPrize::where('product_id', $product1->id)->first();

        // Update
        $response = $this->actingAs($admin)
            ->put(route('point-prizes.update', $prize->id), [
                'product_id' => $product2->id,
                'points_required' => 25,
            ]);

        $response->assertRedirect(route('point-prizes.index'));
        $this->assertDatabaseHas('point_prizes', [
            'id' => $prize->id,
            'product_id' => $product2->id,
            'points_required' => 25,
        ]);

        // Delete
        $response = $this->actingAs($admin)
            ->delete(route('point-prizes.destroy', $prize->id));

        $response->assertRedirect(route('point-prizes.index'));
        $this->assertDatabaseMissing('point_prizes', ['id' => $prize->id]);
    }

    public function test_cashier_can_redeem_points_with_open_shift()
    {
        $cashier = User::factory()->create();
        $cashier->assignRole('cashier');

        // Open shift for cashier
        $shift = CashierShift::create([
            'user_id' => $cashier->id,
            'opening_cash' => 100000,
            'status' => 'open',
            'opened_at' => now(),
            'opened_by' => $cashier->id,
        ]);

        $customer = Customer::create([
            'member_code' => 'MEM-999',
            'name' => 'Loyal Cust',
            'address' => 'Test Address',
            'is_loyalty_member' => true,
            'loyalty_points' => 100,
        ]);

        $product = $this->createProduct('Payung Premium', 5);

        $prize = PointPrize::create([
            'product_id' => $product->id,
            'points_required' => 40,
        ]);

        // Redeem
        $response = $this->actingAs($cashier)
            ->from(route('transactions.index'))
            ->post(route('point-redemptions.store'), [
                'customer_id' => $customer->id,
                'items' => [
                    [
                        'point_prize_id' => $prize->id,
                        'quantity' => 2,
                    ],
                ],
                'notes' => 'Tukar 2 payung',
            ]);

        $response->assertRedirect(route('transactions.index'));

        $customer->refresh();
        $product->refresh();

        // 100 - (40 * 2) = 20 points remaining
        $this->assertEquals(20, $customer->loyalty_points);
        // 5 - 2 = 3 stock remaining
        $this->assertEquals(3, $product->stock);

        $this->assertDatabaseHas('point_redemptions', [
            'customer_id' => $customer->id,
            'total_points' => 80,
            'notes' => 'Tukar 2 payung',
        ]);

        $this->assertDatabaseHas('loyalty_point_histories', [
            'customer_id' => $customer->id,
            'type' => 'redeem',
            'points_delta' => -80,
            'balance_after' => 20,
        ]);
    }

    public function test_cannot_redeem_without_open_shift()
    {
        $cashier = User::factory()->create();
        $cashier->assignRole('cashier');

        $customer = Customer::create([
            'member_code' => 'MEM-999',
            'name' => 'Loyal Cust',
            'address' => 'Test Address',
            'is_loyalty_member' => true,
            'loyalty_points' => 100,
        ]);

        $product = $this->createProduct('Payung Premium', 5);

        $prize = PointPrize::create([
            'product_id' => $product->id,
            'points_required' => 40,
        ]);

        $response = $this->actingAs($cashier)
            ->post(route('point-redemptions.store'), [
                'customer_id' => $customer->id,
                'items' => [
                    [
                        'point_prize_id' => $prize->id,
                        'quantity' => 2,
                    ],
                ],
            ]);

        $response->assertRedirect(route('transactions.index'));
        $this->assertEquals('Shift kasir belum dibuka.', session('error'));
    }

    public function test_cannot_redeem_if_insufficient_points()
    {
        $cashier = User::factory()->create();
        $cashier->assignRole('cashier');

        CashierShift::create([
            'user_id' => $cashier->id,
            'opening_cash' => 100000,
            'status' => 'open',
            'opened_at' => now(),
            'opened_by' => $cashier->id,
        ]);

        $customer = Customer::create([
            'member_code' => 'MEM-999',
            'name' => 'Loyal Cust',
            'address' => 'Test Address',
            'is_loyalty_member' => true,
            'loyalty_points' => 30, // only 30 points
        ]);

        $product = $this->createProduct('Payung Premium', 5);

        $prize = PointPrize::create([
            'product_id' => $product->id,
            'points_required' => 40,
        ]);

        $response = $this->actingAs($cashier)
            ->post(route('point-redemptions.store'), [
                'customer_id' => $customer->id,
                'items' => [
                    [
                        'point_prize_id' => $prize->id,
                        'quantity' => 1, // needs 40 points
                    ],
                ],
            ]);

        $response->assertSessionHasErrors(['customer_id']);
        $this->assertEquals(30, $customer->fresh()->loyalty_points); // points unchanged
    }

    public function test_cannot_redeem_if_insufficient_stock()
    {
        $cashier = User::factory()->create();
        $cashier->assignRole('cashier');

        CashierShift::create([
            'user_id' => $cashier->id,
            'opening_cash' => 100000,
            'status' => 'open',
            'opened_at' => now(),
            'opened_by' => $cashier->id,
        ]);

        $customer = Customer::create([
            'member_code' => 'MEM-999',
            'name' => 'Loyal Cust',
            'address' => 'Test Address',
            'is_loyalty_member' => true,
            'loyalty_points' => 100,
        ]);

        $product = $this->createProduct('Payung Premium', 1);

        $prize = PointPrize::create([
            'product_id' => $product->id,
            'points_required' => 40,
        ]);

        $response = $this->actingAs($cashier)
            ->post(route('point-redemptions.store'), [
                'customer_id' => $customer->id,
                'items' => [
                    [
                        'point_prize_id' => $prize->id,
                        'quantity' => 2, // requests 2
                    ],
                ],
            ]);

        $response->assertSessionHasErrors(['items']);
        $this->assertEquals(100, $customer->fresh()->loyalty_points); // points unchanged
    }
}
