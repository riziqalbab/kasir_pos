<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::firstOrCreate(['name' => 'users-access', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'users-create', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'users-update', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'users-delete', 'guard_name' => 'web']);

        Role::firstOrCreate(['name' => 'cashier', 'guard_name' => 'web']);
    }

    public function test_admin_creating_cashier_user_flow_with_step_up_password_confirmation(): void
    {
        $admin = User::factory()->create([
            'password' => 'adminpassword',
        ]);
        $admin->givePermissionTo(['users-access', 'users-create']);

        // 1. Admin visits create page without recent password confirmation -> redirected to confirm-password
        $createRes = $this
            ->actingAs($admin)
            ->get(route('users.create'));

        $createRes->assertRedirect(route('password.confirm'));

        // 2. Admin confirms password
        $confirmRes = $this
            ->actingAs($admin)
            ->post(route('password.confirm'), [
                'password' => 'adminpassword',
            ]);

        $confirmRes->assertRedirect(route('users.create'));

        // 3. Now admin visits create page and submits new cashier user form
        $createRes2 = $this
            ->actingAs($admin)
            ->get(route('users.create'));
        $createRes2->assertOk();

        $storeRes = $this
            ->actingAs($admin)
            ->post(route('users.store'), [
                'name' => 'Kasir Baru',
                'email' => 'kasirbaru@example.com',
                'password' => 'kasirpassword123',
                'password_confirmation' => 'kasirpassword123',
                'selectedRoles' => ['cashier'],
            ]);

        $storeRes->assertRedirect(route('users.index'));

        // 4. Verify cashier user was successfully stored in database
        $this->assertDatabaseHas('users', [
            'name' => 'Kasir Baru',
            'email' => 'kasirbaru@example.com',
        ]);

        $newUser = User::where('email', 'kasirbaru@example.com')->first();
        $this->assertNotNull($newUser);
        $this->assertTrue($newUser->hasRole('cashier'));

        // 5. Verify the new cashier user can successfully log in with their password (no double hashing issue)
        $this->assertTrue(Hash::check('kasirpassword123', $newUser->password));

        Auth::logout();
        $this->assertTrue(Auth::attempt([
            'email' => 'kasirbaru@example.com',
            'password' => 'kasirpassword123',
        ]));
    }

    public function test_admin_can_create_user_with_granular_direct_permissions(): void
    {
        Permission::firstOrCreate(['name' => 'products-access', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'products-create', 'guard_name' => 'web']);

        $admin = User::factory()->create([
            'password' => 'adminpassword',
        ]);
        $admin->givePermissionTo(['users-access', 'users-create']);

        // Set session password confirmed
        $this->actingAs($admin)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->post(route('users.store'), [
                'name' => 'Staff Produk',
                'email' => 'produk@example.com',
                'password' => 'staffpassword123',
                'password_confirmation' => 'staffpassword123',
                'selectedRoles' => [],
                'selectedPermissions' => ['products-access', 'products-create'],
            ])
            ->assertRedirect(route('users.index'));

        $user = User::where('email', 'produk@example.com')->first();
        $this->assertNotNull($user);
        $this->assertTrue($user->hasPermissionTo('products-access'));
        $this->assertTrue($user->hasPermissionTo('products-create'));
        $this->assertFalse($user->hasPermissionTo('users-access'));

        $perms = $user->getPermissions();
        $this->assertTrue($perms['products-access'] ?? false);
        $this->assertTrue($perms['products-create'] ?? false);
        $this->assertArrayNotHasKey('users-access', $perms);
    }

    public function test_admin_can_update_user_roles_and_permissions(): void
    {
        Permission::firstOrCreate(['name' => 'categories-access', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'products-access', 'guard_name' => 'web']);

        $admin = User::factory()->create();
        $admin->givePermissionTo(['users-access', 'users-update']);

        $targetUser = User::factory()->create([
            'email' => 'target@example.com',
        ]);
        $targetUser->givePermissionTo('categories-access');

        $this->actingAs($admin)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->put(route('users.update', $targetUser->id), [
                'name' => 'Target Updated',
                'email' => 'target@example.com',
                'selectedRoles' => ['cashier'],
                'selectedPermissions' => ['products-access'],
            ])
            ->assertRedirect(route('users.index'));

        $fresh = $targetUser->fresh();
        $this->assertTrue($fresh->hasRole('cashier'));
        $this->assertTrue($fresh->hasPermissionTo('products-access'));
        $this->assertFalse($fresh->hasDirectPermission('categories-access'));
    }
}
