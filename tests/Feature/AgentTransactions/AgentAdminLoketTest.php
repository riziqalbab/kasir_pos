<?php

namespace Tests\Feature\AgentTransactions;

use App\Models\AgentAdminLoket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class AgentAdminLoketTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        foreach ([
            'agent-admin-lokets-access',
            'agent-admin-lokets-create',
            'agent-admin-lokets-edit',
            'agent-admin-lokets-delete',
        ] as $permission) {
            Permission::firstOrCreate([
                'name' => $permission,
                'guard_name' => 'web',
            ]);
        }
    }

    public function test_user_can_access_agent_admin_lokets_list(): void
    {
        $user = $this->createUserWithPermissions(['agent-admin-lokets-access']);

        AgentAdminLoket::create([
            'code' => 'BRIVA01',
            'amount' => 3000,
            'description' => '0K s/d 100K',
        ]);

        $response = $this
            ->actingAs($user)
            ->get(route('agent-admin-lokets.index'));

        $response->assertStatus(200);
        $this->assertDatabaseHas('agent_admin_lokets', [
            'code' => 'BRIVA01',
        ]);
    }

    public function test_user_can_create_agent_admin_loket(): void
    {
        $user = $this->createUserWithPermissions(['agent-admin-lokets-create']);

        $response = $this
            ->actingAs($user)
            ->post(route('agent-admin-lokets.store'), [
                'code' => 'BRIVA02',
                'amount' => 5000,
                'description' => '101K s/d 500K',
            ]);

        $response->assertRedirect(route('agent-admin-lokets.index'));
        $this->assertDatabaseHas('agent_admin_lokets', [
            'code' => 'BRIVA02',
            'amount' => 5000,
            'description' => '101K s/d 500K',
        ]);
    }

    public function test_user_can_update_agent_admin_loket(): void
    {
        $user = $this->createUserWithPermissions(['agent-admin-lokets-edit']);

        $loket = AgentAdminLoket::create([
            'code' => 'BRIVA03',
            'amount' => 8000,
            'description' => '501K s/d 1jt',
        ]);

        $response = $this
            ->actingAs($user)
            ->put(route('agent-admin-lokets.update', $loket->id), [
                'code' => 'BRIVA03',
                'amount' => 9000,
                'description' => 'Updated Description',
            ]);

        $response->assertRedirect(route('agent-admin-lokets.index'));
        $this->assertDatabaseHas('agent_admin_lokets', [
            'id' => $loket->id,
            'amount' => 9000,
            'description' => 'Updated Description',
        ]);
    }

    public function test_user_can_delete_agent_admin_loket(): void
    {
        $user = $this->createUserWithPermissions(['agent-admin-lokets-delete']);

        $loket = AgentAdminLoket::create([
            'code' => 'BRIVA04',
            'amount' => 10000,
            'description' => '1.1jt s/d 2jt',
        ]);

        $response = $this
            ->actingAs($user)
            ->delete(route('agent-admin-lokets.destroy', $loket->id));

        $response->assertRedirect(route('agent-admin-lokets.index'));
        $this->assertDatabaseMissing('agent_admin_lokets', [
            'id' => $loket->id,
        ]);
    }

    private function createUserWithPermissions(array $permissions): User
    {
        $user = User::factory()->create();
        $user->givePermissionTo($permissions);

        return $user;
    }
}
