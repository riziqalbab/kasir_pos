<?php

namespace Tests\Feature\Transactions;

use App\Models\Cart;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Service;
use App\Models\ServicePrice;
use App\Models\Transaction;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class ServiceTransactionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Create standard units
        Unit::firstOrCreate(['name' => 'lbr']);
        Unit::firstOrCreate(['name' => 'rim']);

        // Create permissions
        foreach ([
            'services-access', 'services-create', 'services-edit', 'services-delete',
            'transactions-access', 'cashier-shifts-access', 'cashier-shifts-open', 'cashier-shifts-close'
        ] as $perm) {
            Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'web']);
        }
    }

    public function test_admin_can_manage_services(): void
    {
        $admin = User::factory()->create();
        $admin->givePermissionTo(['services-access', 'services-create', 'services-edit', 'services-delete']);

        $unitLbr = Unit::where('name', 'lbr')->first();
        $unitRim = Unit::where('name', 'rim')->first();

        // Store service
        $response = $this->actingAs($admin)->post(route('services.store'), [
            'name' => 'Jasa Print',
            'description' => 'Print hitam putih',
            'prices' => [
                ['unit_id' => $unitLbr->id, 'price' => 2000],
                ['unit_id' => $unitRim->id, 'price' => 100000],
            ],
        ]);

        $response->assertRedirect(route('services.index'));
        $this->assertDatabaseHas('services', ['name' => 'Jasa Print']);
        $this->assertDatabaseCount('service_prices', 2);

        $service = Service::latest()->first();

        // Update service
        $response = $this->actingAs($admin)->put(route('services.update', $service->id), [
            'name' => 'Jasa Print Premium',
            'description' => 'Print warna super tajam',
            'prices' => [
                ['unit_id' => $unitLbr->id, 'price' => 3000], // updated price
            ],
        ]);

        $response->assertRedirect(route('services.index'));
        $this->assertDatabaseHas('services', ['name' => 'Jasa Print Premium']);
        $this->assertDatabaseCount('service_prices', 1); // should delete old prices and keep only the new one

        // Destroy service
        $response = $this->actingAs($admin)->delete(route('services.destroy', $service->id));
        $response->assertRedirect(route('services.index'));
        $this->assertDatabaseCount('services', 0);
        $this->assertDatabaseCount('service_prices', 0);
    }

    public function test_cashier_can_transact_service_items(): void
    {
        $cashier = User::factory()->create();
        $cashier->givePermissionTo(['transactions-access']);

        // Create shift
        \App\Models\CashierShift::create([
            'user_id' => $cashier->id,
            'opened_by' => $cashier->id,
            'opened_at' => now(),
            'opening_cash' => 100000,
            'expected_cash' => 100000,
            'status' => 'open',
        ]);

        // Create service
        $service = Service::create(['name' => 'Jasa Print', 'description' => 'Print']);
        $unitLbr = Unit::where('name', 'lbr')->first();
        ServicePrice::create(['service_id' => $service->id, 'unit_id' => $unitLbr->id, 'price' => 2000]);

        // Add to cart
        $response = $this->actingAs($cashier)->post(route('transactions.addToCart'), [
            'service_id' => $service->id,
            'satuan_key' => $unitLbr->id,
            'qty' => 5,
        ]);

        $response->assertRedirect(route('transactions.index'));
        $this->assertDatabaseHas('carts', [
            'service_id' => $service->id,
            'qty' => 5,
            'price' => 10000, // 2000 * 5
            'satuan' => 'lbr',
            'satuan_key' => (string) $unitLbr->id,
        ]);

        $cart = Cart::latest()->first();

        // Update quantity in cart
        $response = $this->actingAs($cashier)->patch(route('transactions.updateCart', $cart->id), [
            'qty' => 10,
        ]);

        $this->assertDatabaseHas('carts', [
            'id' => $cart->id,
            'qty' => 10,
            'price' => 20000,
        ]);

        // Checkout
        $response = $this->actingAs($cashier)->post(route('transactions.store'), [
            'customer_id' => null,
            'discount' => 0,
            'grand_total' => 20000,
            'cash' => 50000,
            'change' => 30000,
        ]);

        $transaction = Transaction::with(['details', 'profits'])->latest('id')->first();
        $this->assertNotNull($transaction);

        $this->assertSame(1, $transaction->details->count());
        $detail = $transaction->details->first();
        $this->assertSame($service->id, $detail->service_id);
        $this->assertNull($detail->product_id);
        $this->assertSame(10, (int) $detail->qty);
        $this->assertSame(20000, (int) $detail->price);

        // Verify profit is 100% of selling price
        $this->assertSame(1, $transaction->profits->count());
        $profit = $transaction->profits->first();
        $this->assertSame(20000, (int) $profit->total);
    }
}
