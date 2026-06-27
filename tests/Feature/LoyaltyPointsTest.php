<?php

namespace Tests\Feature;

use App\Models\CashierShift;
use App\Models\Customer;
use App\Models\Setting;
use App\Models\Transaction;
use App\Models\User;
use App\Services\LoyaltyService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LoyaltyPointsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->artisan('db:seed', ['--class' => 'PermissionSeeder']);
        $this->artisan('db:seed', ['--class' => 'RoleSeeder']);
    }

    public function test_admin_can_access_loyalty_settings_page()
    {
        $admin = User::factory()->create();
        $admin->assignRole('super-admin');

        $response = $this->actingAs($admin)
            ->get(route('settings.loyalty'));

        $response->assertStatus(200);
    }

    public function test_admin_can_update_loyalty_settings()
    {
        $admin = User::factory()->create();
        $admin->assignRole('super-admin');

        $response = $this->actingAs($admin)
            ->post(route('settings.loyalty.update'), [
                'loyalty_points_enabled' => true,
                'loyalty_points_threshold' => 15000,
                'loyalty_points_awarded' => 2,
            ]);

        $response->assertRedirect();
        $this->assertTrue(Setting::getBool('loyalty_points_enabled'));
        $this->assertEquals(15000, Setting::getInt('loyalty_points_threshold'));
        $this->assertEquals(2, Setting::getInt('loyalty_points_awarded'));
    }

    public function test_calculate_points_returns_correct_points_based_on_settings()
    {
        Setting::set('loyalty_points_enabled', '1');
        Setting::set('loyalty_points_threshold', '10000');
        Setting::set('loyalty_points_awarded', '2');

        $loyaltyService = new LoyaltyService;

        // 25000 / 10000 = 2. 2 * 2 = 4 points.
        $this->assertEquals(4, $loyaltyService->calculatePoints(25000));
        // 9000 / 10000 = 0. 0 * 2 = 0 points.
        $this->assertEquals(0, $loyaltyService->calculatePoints(9000));

        // System disabled
        Setting::set('loyalty_points_enabled', '0');
        $this->assertEquals(0, $loyaltyService->calculatePoints(25000));
    }

    public function test_customer_creation_automatically_enables_loyalty_points()
    {
        $admin = User::factory()->create();
        $admin->assignRole('super-admin');

        $response = $this->actingAs($admin)
            ->post(route('customers.store'), [
                'member_code' => 'MEM-111',
                'name' => 'John Doe',
                'no_telp' => '081234567890',
                'address' => 'Test Address',
            ]);

        $response->assertRedirect(route('customers.index'));
        $customer = Customer::where('member_code', 'MEM-111')->first();
        $this->assertNotNull($customer);
        $this->assertTrue($customer->is_loyalty_member);
        $this->assertNotNull($customer->loyalty_member_since);
    }

    public function test_transaction_completed_immediately_awards_points_to_loyalty_member()
    {
        Setting::set('loyalty_points_enabled', '1');
        Setting::set('loyalty_points_threshold', '10000');
        Setting::set('loyalty_points_awarded', '1');

        $customer = Customer::create([
            'member_code' => 'MEM-222',
            'name' => 'Member Customer',
            'address' => 'Address',
            'is_loyalty_member' => true,
            'loyalty_member_since' => now(),
        ]);

        $cashier = User::factory()->create();
        $shift = CashierShift::create([
            'user_id' => $cashier->id,
            'start_amount' => 100000,
            'status' => 'open',
            'opened_at' => now(),
            'opened_by' => $cashier->id,
        ]);

        $transaction = Transaction::create([
            'cashier_id' => $cashier->id,
            'cashier_shift_id' => $shift->id,
            'customer_id' => $customer->id,
            'invoice' => 'TRX-TEST-1',
            'grand_total' => 25000,
            'discount' => 0,
            'shipping_cost' => 0,
            'payment_method' => 'cash',
            'payment_status' => 'paid',
            'cash' => 25000,
            'change' => 0,
            'loyalty_points_earned' => 2,
        ]);

        $loyaltyService = new LoyaltyService;
        $loyaltyService->awardPointsForTransaction($transaction);

        $customer->refresh();
        $this->assertEquals(2, $customer->loyalty_points);
        $this->assertEquals(25000, $customer->loyalty_total_spent);
        $this->assertEquals(1, $customer->loyalty_transaction_count);

        // Check history log
        $this->assertDatabaseHas('loyalty_point_histories', [
            'customer_id' => $customer->id,
            'transaction_id' => $transaction->id,
            'type' => 'earn',
            'points_delta' => 2,
            'balance_after' => 2,
            'amount_delta' => 25000,
            'reference' => 'TRX-TEST-1',
        ]);
    }

    public function test_newly_created_customer_without_explicit_member_flag_still_earns_points()
    {
        Setting::set('loyalty_points_enabled', '1');
        Setting::set('loyalty_points_threshold', '10000');
        Setting::set('loyalty_points_awarded', '1');

        // Customer created normally (is_loyalty_member defaults to true in DB)
        $customer = Customer::create([
            'member_code' => 'MEM-333',
            'name' => 'Default Customer',
            'address' => 'Address',
        ]);

        $cashier = User::factory()->create();
        $shift = CashierShift::create([
            'user_id' => $cashier->id,
            'start_amount' => 100000,
            'status' => 'open',
            'opened_at' => now(),
            'opened_by' => $cashier->id,
        ]);

        $transaction = Transaction::create([
            'cashier_id' => $cashier->id,
            'cashier_shift_id' => $shift->id,
            'customer_id' => $customer->id,
            'invoice' => 'TRX-TEST-2',
            'grand_total' => 25000,
            'discount' => 0,
            'shipping_cost' => 0,
            'payment_method' => 'cash',
            'payment_status' => 'paid',
            'cash' => 25000,
            'change' => 0,
            'loyalty_points_earned' => 2,
        ]);

        $loyaltyService = new LoyaltyService;
        $loyaltyService->awardPointsForTransaction($transaction);

        $customer->refresh();
        $this->assertEquals(2, $customer->loyalty_points);
    }

    public function test_admin_can_update_customer_loyalty_points()
    {
        $admin = User::factory()->create();
        $admin->assignRole('super-admin');

        $customer = Customer::create([
            'member_code' => 'MEM-444',
            'name' => 'Original Customer',
            'address' => 'Test Address',
            'is_loyalty_member' => true,
            'loyalty_points' => 10,
        ]);

        $response = $this->actingAs($admin)
            ->post(route('customers.update', $customer->id), [
                'member_code' => 'MEM-444',
                'name' => 'John Doe updated',
                'address' => 'Test Address',
                'loyalty_points' => 25,
                '_method' => 'PUT',
            ]);

        $response->assertRedirect(route('customers.index'));

        $customer->refresh();
        $this->assertEquals(25, $customer->loyalty_points);
        $this->assertTrue($customer->is_loyalty_member);

        $this->assertDatabaseHas('loyalty_point_histories', [
            'customer_id' => $customer->id,
            'type' => 'adjustment',
            'points_delta' => 15,
            'balance_after' => 25,
        ]);
    }
}
