<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class BackupTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::firstOrCreate(['name' => 'backups-access', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'backups-create', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'backups-restore', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'backups-delete', 'guard_name' => 'web']);
    }

    public function test_authorized_user_can_access_backups_page()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('backups-access');

        $response = $this->actingAs($user)->get(route('settings.backups.index'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page->component('Dashboard/Settings/Backups/Index'));
    }

    public function test_unauthorized_user_cannot_access_backups_page()
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('settings.backups.index'));

        $response->assertStatus(403);
    }

    public function test_authorized_user_can_create_database_backup()
    {
        $user = User::factory()->create();
        $user->givePermissionTo(['backups-access', 'backups-create']);

        $response = $this->actingAs($user)->post(route('settings.backups.store'), [
            'type' => 'database',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');
    }

    public function test_restore_requires_correct_password()
    {
        $user = User::factory()->create([
            'password' => bcrypt('password123'),
        ]);
        $user->givePermissionTo(['backups-access', 'backups-restore']);

        $response = $this->actingAs($user)->post(route('settings.backups.restore'), [
            'password' => 'wrong-password',
            'filename' => 'dummy.sql',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('error');
    }
}
