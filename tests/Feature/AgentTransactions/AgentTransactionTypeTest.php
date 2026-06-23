<?php

namespace Tests\Feature\AgentTransactions;

use App\Models\AgentTransactionType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class AgentTransactionTypeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        foreach ([
            'agent-transaction-types-access',
            'agent-transaction-types-create',
            'agent-transaction-types-edit',
            'agent-transaction-types-delete',
        ] as $permission) {
            Permission::firstOrCreate([
                'name' => $permission,
                'guard_name' => 'web',
            ]);
        }
    }

    public function test_user_can_access_agent_transaction_types_list(): void
    {
        $user = $this->createUserWithPermissions(['agent-transaction-types-access']);

        AgentTransactionType::create([
            'code' => 'JTA0001',
            'name' => 'Tarik Tunai BRI',
            'type' => 'kredit',
            'default_admin_fee_customer' => 5000,
            'default_admin_fee_bank' => 3000,
            'is_active' => true,
        ]);

        $response = $this
            ->actingAs($user)
            ->get(route('agent-transaction-types.index'));

        $response->assertStatus(200);
        $this->assertDatabaseHas('agent_transaction_types', [
            'code' => 'JTA0001',
        ]);
    }

    public function test_user_can_create_agent_transaction_type(): void
    {
        $user = $this->createUserWithPermissions(['agent-transaction-types-create']);

        $response = $this
            ->actingAs($user)
            ->post(route('agent-transaction-types.store'), [
                'code' => 'JTA0002',
                'name' => 'Transfer Bank Lain',
                'type' => 'debet',
                'default_admin_fee_customer' => 7000,
                'default_admin_fee_bank' => 4000,
                'is_active' => true,
            ]);

        $response->assertRedirect(route('agent-transaction-types.index'));
        $this->assertDatabaseHas('agent_transaction_types', [
            'code' => 'JTA0002',
            'type' => 'debet',
        ]);
    }

    public function test_user_can_update_agent_transaction_type(): void
    {
        $user = $this->createUserWithPermissions(['agent-transaction-types-edit']);

        $type = AgentTransactionType::create([
            'code' => 'JTA0003',
            'name' => 'Listrik',
            'type' => 'kredit',
            'default_admin_fee_customer' => 3000,
            'default_admin_fee_bank' => 1500,
            'is_active' => true,
        ]);

        $response = $this
            ->actingAs($user)
            ->put(route('agent-transaction-types.update', $type->id), [
                'code' => 'JTA0003',
                'name' => 'Token Listrik PLN',
                'type' => 'kredit',
                'default_admin_fee_customer' => 3500,
                'default_admin_fee_bank' => 2000,
                'is_active' => false,
            ]);

        $response->assertRedirect(route('agent-transaction-types.index'));
        $this->assertDatabaseHas('agent_transaction_types', [
            'id' => $type->id,
            'name' => 'Token Listrik PLN',
            'is_active' => false,
        ]);
    }

    public function test_user_can_delete_agent_transaction_type(): void
    {
        $user = $this->createUserWithPermissions(['agent-transaction-types-delete']);

        $type = AgentTransactionType::create([
            'code' => 'JTA0004',
            'name' => 'Top Up Ovo',
            'type' => 'debet',
            'default_admin_fee_customer' => 2000,
            'default_admin_fee_bank' => 1000,
            'is_active' => true,
        ]);

        $response = $this
            ->actingAs($user)
            ->delete(route('agent-transaction-types.destroy', $type->id));

        $response->assertRedirect(route('agent-transaction-types.index'));
        $this->assertDatabaseMissing('agent_transaction_types', [
            'id' => $type->id,
        ]);
    }

    private function createUserWithPermissions(array $permissions): User
    {
        $user = User::factory()->create();
        $user->givePermissionTo($permissions);

        return $user;
    }
}
