<?php

namespace Tests\Feature\AgentTransactions;

use App\Models\AgentTransaction;
use App\Models\AgentTransactionType;
use App\Models\CashierShift;
use App\Models\User;
use App\Services\CashierShiftService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class AgentTransactionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        foreach ([
            'agent-transactions-access',
            'agent-transactions-create',
            'agent-transactions-edit',
            'agent-transactions-delete',
            'cashier-shifts-access',
        ] as $permission) {
            Permission::firstOrCreate([
                'name' => $permission,
                'guard_name' => 'web',
            ]);
        }
    }

    public function test_cashier_must_have_active_shift_to_create_transaction(): void
    {
        $cashier = $this->createUserWithPermissions(['agent-transactions-create']);

        $type = AgentTransactionType::create([
            'code' => 'JTA0001',
            'name' => 'Setor Tunai',
            'type' => 'debet',
        ]);

        $response = $this
            ->actingAs($cashier)
            ->post(route('agent-transactions.store'), [
                'agent_transaction_type_id' => $type->id,
                'nominal' => 500000,
                'admin_fee_customer' => 5000,
                'admin_fee_bank' => 2000,
                'admin_fee_payment_method' => 'cash',
                'status' => 'success',
            ]);

        $response->assertSessionHas('error', 'Shift kasir belum dibuka.');
        $this->assertDatabaseCount('agent_transactions', 0);
    }

    public function test_cashier_can_create_transaction_during_active_shift(): void
    {
        $cashier = $this->createUserWithPermissions([
            'agent-transactions-create',
            'cashier-shifts-access',
        ]);

        $shift = CashierShift::create([
            'user_id' => $cashier->id,
            'opened_by' => $cashier->id,
            'opened_at' => now(),
            'opening_cash' => 100000,
            'expected_cash' => 100000,
            'status' => CashierShift::STATUS_OPEN,
        ]);

        $type = AgentTransactionType::create([
            'code' => 'JTA0001',
            'name' => 'Setor Tunai',
            'type' => 'debet',
        ]);

        $response = $this
            ->actingAs($cashier)
            ->post(route('agent-transactions.store'), [
                'agent_transaction_type_id' => $type->id,
                'nominal' => 500000,
                'admin_fee_customer' => 5000,
                'admin_fee_bank' => 2000,
                'admin_fee_payment_method' => 'cash',
                'status' => 'success',
            ]);

        $response->assertRedirect(route('agent-transactions.index'));
        $this->assertDatabaseHas('agent_transactions', [
            'nominal' => 500000,
            'admin_fee_customer' => 5000,
            'admin_fee_bank' => 2000,
            'net_profit' => 3000,
            'cashier_shift_id' => $shift->id,
        ]);
    }

    public function test_agent_transactions_correctly_impact_expected_cash(): void
    {
        $cashier = $this->createUserWithPermissions([
            'agent-transactions-create',
            'cashier-shifts-access',
        ]);

        $shift = CashierShift::create([
            'user_id' => $cashier->id,
            'opened_by' => $cashier->id,
            'opened_at' => now(),
            'opening_cash' => 100000,
            'expected_cash' => 100000,
            'status' => CashierShift::STATUS_OPEN,
        ]);

        $debetType = AgentTransactionType::create([
            'code' => 'JTA0001',
            'name' => 'Setor Tunai',
            'type' => 'debet',
        ]);

        $kreditType = AgentTransactionType::create([
            'code' => 'JTA0002',
            'name' => 'Tarik Tunai',
            'type' => 'kredit',
        ]);

        // 1. Debet (Setor) - nominal 200,000, fee 5,000 paid in cash.
        // Cash in laci increases by 205,000
        AgentTransaction::create([
            'cashier_id' => $cashier->id,
            'cashier_shift_id' => $shift->id,
            'agent_transaction_type_id' => $debetType->id,
            'transaction_date' => now(),
            'nominal' => 200000,
            'admin_fee_customer' => 5000,
            'admin_fee_bank' => 2000,
            'admin_fee_payment_method' => 'cash',
            'status' => 'success',
        ]);

        // 2. Kredit (Tarik) - nominal 100,000, fee 5,000 paid in cash.
        // Cash in laci decreases by 100,000, increases by 5,000 (net -95,000)
        AgentTransaction::create([
            'cashier_id' => $cashier->id,
            'cashier_shift_id' => $shift->id,
            'agent_transaction_type_id' => $kreditType->id,
            'transaction_date' => now(),
            'nominal' => 100000,
            'admin_fee_customer' => 5000,
            'admin_fee_bank' => 2000,
            'admin_fee_payment_method' => 'cash',
            'status' => 'success',
        ]);

        // 3. Kredit (Tarik) - nominal 50,000, fee 5,000 paid non-cash (added to swipe).
        // Cash in laci decreases by 50,000
        AgentTransaction::create([
            'cashier_id' => $cashier->id,
            'cashier_shift_id' => $shift->id,
            'agent_transaction_type_id' => $kreditType->id,
            'transaction_date' => now(),
            'nominal' => 50000,
            'admin_fee_customer' => 5000,
            'admin_fee_bank' => 2000,
            'admin_fee_payment_method' => 'bank',
            'status' => 'success',
        ]);

        $service = app(CashierShiftService::class);
        $summary = $service->calculateSummary($shift);

        // Expected cash calculation:
        // Start: 100,000
        // + Debet setoran: 205,000 (nominal 200,000 + fee 5,000)
        // - Kredit tarik cash fee: 95,000 (nominal 100,000 - fee 5,000)
        // - Kredit tarik bank fee: 50,000 (nominal 50,000)
        // Total expected = 100,000 + 205,000 - 95,000 - 50,000 = 160,000
        $this->assertSame(160000, $summary['expected_cash']);
        $this->assertSame(205000, $summary['agent_cash_in_total']);
        $this->assertSame(150000, $summary['agent_cash_out_total']);
        $this->assertSame(5000, $summary['agent_fees_cash_in_total']);
        $this->assertSame(3, $summary['agent_transactions_count']);
    }

    private function createUserWithPermissions(array $permissions): User
    {
        $user = User::factory()->create();
        $user->givePermissionTo($permissions);

        return $user;
    }
}
