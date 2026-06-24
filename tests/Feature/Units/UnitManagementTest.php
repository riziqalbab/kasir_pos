<?php

namespace Tests\Feature\Units;

use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class UnitManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Create permissions
        Permission::firstOrCreate(['name' => 'dashboard-access', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'units-access', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'units-create', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'units-delete', 'guard_name' => 'web']);
    }

    public function test_admin_with_permission_can_access_units_page(): void
    {
        $admin = User::factory()->create();
        $adminRole = Role::firstOrCreate(['name' => 'super-admin']);
        $adminRole->syncPermissions(Permission::all());
        $admin->assignRole($adminRole);

        $response = $this->actingAs($admin)->get(route('units.index'));

        $response->assertStatus(200);
    }

    public function test_user_without_permission_cannot_access_units_page(): void
    {
        $user = User::factory()->create();
        // Give basic access but not units access
        $userRole = Role::firstOrCreate(['name' => 'cashier']);
        $userRole->syncPermissions(['dashboard-access']);
        $user->assignRole($userRole);

        $response = $this->actingAs($user)->get(route('units.index'));

        $response->assertStatus(403);
    }

    public function test_admin_can_create_new_unit(): void
    {
        $admin = User::factory()->create();
        $adminRole = Role::firstOrCreate(['name' => 'super-admin']);
        $adminRole->syncPermissions(Permission::all());
        $admin->assignRole($adminRole);

        $response = $this->actingAs($admin)->post(route('units.store'), [
            'name' => 'karton',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('units', [
            'name' => 'karton',
        ]);
    }

    public function test_admin_cannot_create_duplicate_unit(): void
    {
        Unit::create(['name' => 'lusin']);

        $admin = User::factory()->create();
        $adminRole = Role::firstOrCreate(['name' => 'super-admin']);
        $adminRole->syncPermissions(Permission::all());
        $admin->assignRole($adminRole);

        $response = $this->actingAs($admin)->post(route('units.store'), [
            'name' => 'lusin',
        ]);

        $response->assertSessionHasErrors(['name']);
        $this->assertEquals(1, Unit::where('name', 'lusin')->count());
    }

    public function test_admin_can_delete_unit(): void
    {
        $unit = Unit::create(['name' => 'dus']);

        $admin = User::factory()->create();
        $adminRole = Role::firstOrCreate(['name' => 'super-admin']);
        $adminRole->syncPermissions(Permission::all());
        $admin->assignRole($adminRole);

        $response = $this->actingAs($admin)->delete(route('units.destroy', $unit->id));

        $response->assertRedirect();
        $this->assertDatabaseMissing('units', [
            'id' => $unit->id,
        ]);
    }
}
