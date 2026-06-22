<?php

namespace Tests\Feature\Crm;

use App\Models\Customer;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class CustomerCrudTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::firstOrCreate(['name' => 'customers-access', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'customers-create', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'customers-edit', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'customers-delete', 'guard_name' => 'web']);
    }

    public function test_authorized_user_can_create_customer_without_phone(): void
    {
        $user = User::factory()->create();
        $user->givePermissionTo(['customers-access', 'customers-create']);

        $response = $this
            ->actingAs($user)
            ->post(route('customers.store'), [
                'member_code' => 'CUST-001',
                'name' => 'John Doe',
                'no_telp' => '', // optional
                'address' => 'Jl. Merdeka No. 10',
            ]);

        $response->assertRedirect(route('customers.index'));
        $this->assertDatabaseHas('customers', [
            'member_code' => 'CUST-001',
            'name' => 'John Doe',
            'no_telp' => null,
            'address' => 'Jl. Merdeka No. 10',
        ]);
    }

    public function test_customer_creation_validation_requires_fields(): void
    {
        $user = User::factory()->create();
        $user->givePermissionTo(['customers-access', 'customers-create']);

        $response = $this
            ->actingAs($user)
            ->post(route('customers.store'), [
                'member_code' => '',
                'name' => '',
                'no_telp' => '',
                'address' => '',
            ]);

        $response->assertSessionHasErrors(['member_code', 'name', 'address']);
    }

    public function test_authorized_user_can_update_customer(): void
    {
        $user = User::factory()->create();
        $user->givePermissionTo(['customers-access', 'customers-edit']);

        $customer = Customer::create([
            'member_code' => 'CUST-100',
            'name' => 'Jane Smith',
            'no_telp' => '62812345678',
            'address' => 'Alamat Asli',
        ]);

        $response = $this
            ->actingAs($user)
            ->put(route('customers.update', $customer->id), [
                'member_code' => 'CUST-100-MODIFIED',
                'name' => 'Jane Smith Updated',
                'no_telp' => '', // update to empty
                'address' => 'Alamat Baru',
            ]);

        $response->assertRedirect(route('customers.index'));
        $this->assertDatabaseHas('customers', [
            'id' => $customer->id,
            'member_code' => 'CUST-100-MODIFIED',
            'name' => 'Jane Smith Updated',
            'no_telp' => null,
            'address' => 'Alamat Baru',
        ]);
    }

    public function test_create_customer_via_ajax(): void
    {
        $user = User::factory()->create();
        $user->givePermissionTo(['customers-access', 'customers-create']);

        $response = $this
            ->actingAs($user)
            ->postJson(route('customers.storeAjax'), [
                'member_code' => 'AJAX-001',
                'name' => 'Ajax Customer',
                'no_telp' => '6289999999',
                'address' => 'Jl. Ajax',
            ]);

        $response->assertOk();
        $response->assertJson([
            'success' => true,
            'customer' => [
                'name' => 'Ajax Customer',
                'no_telp' => '6289999999',
                'address' => 'Jl. Ajax',
            ],
        ]);

        $this->assertDatabaseHas('customers', [
            'member_code' => 'AJAX-001',
            'name' => 'Ajax Customer',
        ]);
    }
}
