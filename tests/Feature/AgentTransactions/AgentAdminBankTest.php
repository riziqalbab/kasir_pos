<?php

namespace Tests\Feature\AgentTransactions;

use App\Models\AgentAdminBank;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class AgentAdminBankTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        foreach ([
            'agent-admin-banks-access',
            'agent-admin-banks-create',
            'agent-admin-banks-edit',
            'agent-admin-banks-delete',
        ] as $permission) {
            Permission::firstOrCreate([
                'name' => $permission,
                'guard_name' => 'web',
            ]);
        }
    }

    public function test_user_can_access_agent_admin_banks_list(): void
    {
        $user = $this->createUserWithPermissions(['agent-admin-banks-access']);

        AgentAdminBank::create([
            'code' => 'ADM0001',
            'amount' => 1000,
        ]);

        $response = $this
            ->actingAs($user)
            ->get(route('agent-admin-banks.index'));

        $response->assertStatus(200);
        $this->assertDatabaseHas('agent_admin_banks', [
            'code' => 'ADM0001',
        ]);
    }

    public function test_user_can_create_agent_admin_bank(): void
    {
        $user = $this->createUserWithPermissions(['agent-admin-banks-create']);

        $response = $this
            ->actingAs($user)
            ->post(route('agent-admin-banks.store'), [
                'code' => 'ADM0002',
                'amount' => 1500,
            ]);

        $response->assertRedirect(route('agent-admin-banks.index'));
        $this->assertDatabaseHas('agent_admin_banks', [
            'code' => 'ADM0002',
            'amount' => 1500,
        ]);
    }

    public function test_user_can_update_agent_admin_bank(): void
    {
        $user = $this->createUserWithPermissions(['agent-admin-banks-edit']);

        $bank = AgentAdminBank::create([
            'code' => 'ADM0003',
            'amount' => 2000,
        ]);

        $response = $this
            ->actingAs($user)
            ->put(route('agent-admin-banks.update', $bank->id), [
                'code' => 'ADM0003',
                'amount' => 2500,
            ]);

        $response->assertRedirect(route('agent-admin-banks.index'));
        $this->assertDatabaseHas('agent_admin_banks', [
            'id' => $bank->id,
            'amount' => 2500,
        ]);
    }

    public function test_user_can_delete_agent_admin_bank(): void
    {
        $user = $this->createUserWithPermissions(['agent-admin-banks-delete']);

        $bank = AgentAdminBank::create([
            'code' => 'ADM0004',
            'amount' => 3000,
        ]);

        $response = $this
            ->actingAs($user)
            ->delete(route('agent-admin-banks.destroy', $bank->id));

        $response->assertRedirect(route('agent-admin-banks.index'));
        $this->assertDatabaseMissing('agent_admin_banks', [
            'id' => $bank->id,
        ]);
    }

    private function createUserWithPermissions(array $permissions): User
    {
        $user = User::factory()->create();
        $user->givePermissionTo($permissions);

        return $user;
    }
}
