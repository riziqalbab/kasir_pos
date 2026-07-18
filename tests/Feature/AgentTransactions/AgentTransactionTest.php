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
        // POS Store Expected Cash: remains 100,000 (no store sales, unaffected by agent transactions)
        $this->assertSame(100000, $summary['expected_cash']);

        // Agent Expected Cash:
        // agent_opening_cash (0) + agentCashInTotal (205,000) - agentCashOutTotal (150,000) + agentFeesCashInTotal (5,000) = 60,000
        $this->assertSame(60000, $summary['agent_expected_cash']);

        $this->assertSame(205000, $summary['agent_cash_in_total']);
        $this->assertSame(150000, $summary['agent_cash_out_total']);
        $this->assertSame(5000, $summary['agent_fees_cash_in_total']);
        $this->assertSame(3, $summary['agent_transactions_count']);
    }

    public function test_agent_transactions_correctly_impact_bank_account_balances(): void
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

        $bank = \App\Models\BankAccount::create([
            'bank_name' => 'BCA',
            'account_number' => '123456',
            'account_name' => 'Test Account',
            'is_active' => true,
            'balance' => 10000000,
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

        // 1. Debet (Setor) - nominal 200,000, bank fee 2,000.
        // Bank balance decreases by: 200,000 + 2,000 = 202,000
        $tx1 = AgentTransaction::create([
            'cashier_id' => $cashier->id,
            'cashier_shift_id' => $shift->id,
            'agent_transaction_type_id' => $debetType->id,
            'bank_account_id' => $bank->id,
            'transaction_date' => now(),
            'nominal' => 200000,
            'admin_fee_customer' => 5000,
            'admin_fee_bank' => 2000,
            'admin_fee_payment_method' => 'cash',
            'status' => 'success',
        ]);

        $this->assertEquals(10000000 - 202000, $bank->fresh()->balance);

        // 2. Kredit (Tarik) - nominal 100,000, bank fee 2,000, customer fee 5,000 paid via bank
        // Bank balance increases by: 100,000 - 2,000 + 5,000 = 103,000
        $tx2 = AgentTransaction::create([
            'cashier_id' => $cashier->id,
            'cashier_shift_id' => $shift->id,
            'agent_transaction_type_id' => $kreditType->id,
            'bank_account_id' => $bank->id,
            'transaction_date' => now(),
            'nominal' => 100000,
            'admin_fee_customer' => 5000,
            'admin_fee_bank' => 2000,
            'admin_fee_payment_method' => 'bank',
            'status' => 'success',
        ]);

        $this->assertEquals(10000000 - 202000 + 103000, $bank->fresh()->balance);

        // 3. Update tx1 status to failed
        // Reverts its effect: balance increases back by 202,000
        AgentTransaction::find($tx1->id)->update(['status' => 'failed']);
        $this->assertEquals(10000000 + 103000, $bank->fresh()->balance);
    }

    private function createUserWithPermissions(array $permissions): User
    {
        $user = User::factory()->create();
        $user->givePermissionTo($permissions);

        return $user;
    }
}
