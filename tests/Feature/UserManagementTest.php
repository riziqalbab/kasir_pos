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
}
