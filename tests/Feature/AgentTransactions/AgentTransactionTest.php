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

    public function test_admin_fee_bank_does_not_reduce_net_profit_for_kredit_transactions(): void
    {
        // admin_fee_bank only applies to debet (outbound transfer). A kredit
        // transaction (e.g. Tarik Tunai) keeps the full customer fee as profit,
        // matching how it's already ignored in getBalanceEffect().
        $kreditType = AgentTransactionType::create([
            'code' => 'JTA0002',
            'name' => 'Tarik Tunai',
            'type' => 'kredit',
        ]);

        $tx = AgentTransaction::create([
            'cashier_id' => $this->createUserWithPermissions([])->id,
            'agent_transaction_type_id' => $kreditType->id,
            'transaction_date' => now(),
            'nominal' => 100000,
            'admin_fee_customer' => 5000,
            'admin_fee_bank' => 2000,
            'admin_fee_payment_method' => 'cash',
            'status' => 'success',
        ]);

        $this->assertSame(5000, $tx->fresh()->net_profit);
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

        // 1. Debet (Setor) - nominal 200,000, fee 5,000 + bank fee 2,000 paid in cash.
        // Cash in laci increases by 207,000
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

        // 2. Kredit (Tarik) - nominal 100,000, admin_fee_bank 2,000, fee 5,000, paid in cash.
        // Nominal is cash OUT (handed to customer); fee (no TF loket) is cash IN.
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

        // 3. Kredit (Tarik) - nominal 50,000, fee paid non-cash.
        // Nominal is still handed to the customer in cash (cash OUT) regardless of
        // how the fee itself is settled; the fee doesn't touch cash since it's non-cash.
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
        // agent_opening_cash (0) + agentCashInTotal (212,000) - agentCashOutTotal (150,000) = 62,000
        $this->assertSame(62000, $summary['agent_expected_cash']);

        $this->assertSame(212000, $summary['agent_cash_in_total']);
        $this->assertSame(150000, $summary['agent_cash_out_total']);
        $this->assertSame(5000, $summary['agent_fees_cash_in_total']);
        $this->assertSame(3, $summary['agent_transactions_count']);
    }

    public function test_agent_transactions_impact_expected_cash_even_when_linked_to_a_bank_account(): void
    {
        // Being linked to a bank_account doesn't change the cash-drawer effect: debet
        // cash-in and kredit cash-in (when the fee is paid cash) both still apply.
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

        // Debet linked to a bank account - customer still hands over cash for the nominal.
        AgentTransaction::create([
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

        // Kredit linked to a bank account (EDC swipe), fee paid cash, no TF loket.
        AgentTransaction::create([
            'cashier_id' => $cashier->id,
            'cashier_shift_id' => $shift->id,
            'agent_transaction_type_id' => $kreditType->id,
            'bank_account_id' => $bank->id,
            'transaction_date' => now(),
            'nominal' => 100000,
            'admin_fee_customer' => 5000,
            'admin_fee_bank' => 2000,
            'admin_fee_payment_method' => 'cash',
            'status' => 'success',
        ]);

        $service = app(CashierShiftService::class);
        $summary = $service->calculateSummary($shift);

        // Debet cash-in (200,000 + 5,000 fee + 2,000 bank fee = 207,000) + kredit fee
        // cash-in (5,000); kredit nominal (100,000) is cash-out, handed to the customer.
        $this->assertSame(212000, $summary['agent_cash_in_total']);
        $this->assertSame(100000, $summary['agent_cash_out_total']);
        $this->assertSame(5000, $summary['agent_fees_cash_in_total']);
        $this->assertSame(112000, $summary['agent_expected_cash']);
    }

    public function test_kredit_transaction_cash_out_applies_even_when_fee_paid_non_cash(): void
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

        $kreditType = AgentTransactionType::create([
            'code' => 'JTA0002',
            'name' => 'Tarik Tunai',
            'type' => 'kredit',
        ]);

        // Fee paid via bank, so it never touches cash - but the nominal is still
        // handed to the customer in cash, draining the agent float below zero.
        AgentTransaction::create([
            'cashier_id' => $cashier->id,
            'cashier_shift_id' => $shift->id,
            'agent_transaction_type_id' => $kreditType->id,
            'transaction_date' => now(),
            'nominal' => 75000,
            'admin_fee_customer' => 3000,
            'admin_fee_bank' => 0,
            'admin_fee_payment_method' => 'bank',
            'status' => 'success',
        ]);

        $service = app(CashierShiftService::class);
        $summary = $service->calculateSummary($shift);

        $this->assertSame(0, $summary['agent_cash_in_total']);
        $this->assertSame(75000, $summary['agent_cash_out_total']);
        $this->assertSame(0, $summary['agent_fees_cash_in_total']);
        $this->assertSame(-75000, $summary['agent_expected_cash']);
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

        // 2. Kredit (Tarik) - nominal 100,000, customer fee 5,000 paid via bank.
        // admin_fee_bank (2,000) is not our cost here, so it's ignored.
        // Bank balance increases by: 100,000 + 5,000 = 105,000
        AgentTransaction::create([
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

        $this->assertEquals(10000000 - 202000 + 105000, $bank->fresh()->balance);

        // 3. Update tx1 status to failed
        // Reverts its effect: balance increases back by 202,000
        AgentTransaction::find($tx1->id)->update(['status' => 'failed']);
        $this->assertEquals(10000000 + 105000, $bank->fresh()->balance);
    }

    public function test_debet_admin_fee_customer_never_affects_bank_balance(): void
    {
        // admin_fee_customer never touches the bank balance for debet (e.g.
        // Transfer/Setor), regardless of admin_fee_payment_method - only nominal
        // and admin_fee_bank do.
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

        AgentTransaction::create([
            'cashier_id' => $this->createUserWithPermissions([])->id,
            'agent_transaction_type_id' => $debetType->id,
            'bank_account_id' => $bank->id,
            'transaction_date' => now(),
            'nominal' => 200000,
            'admin_fee_customer' => 5000,
            'admin_fee_bank' => 2000,
            'admin_fee_payment_method' => 'bank',
            'status' => 'success',
        ]);

        // Balance decreases by: 200,000 + 2,000 = 202,000 (admin_fee_customer ignored)
        $this->assertEquals(10000000 - 202000, $bank->fresh()->balance);
    }

    public function test_kredit_cash_fee_stays_in_cash_drawer_even_for_a_tf_loket(): void
    {
        // The admin loket code has no effect on routing: a cash-paid customer fee
        // goes to the cash drawer, so the bank balance only gains the nominal.
        // admin_fee_bank stays out of it entirely for kredit.
        $cashier = $this->createUserWithPermissions(['cashier-shifts-access']);

        $shift = CashierShift::create([
            'user_id' => $cashier->id,
            'opened_by' => $cashier->id,
            'opened_at' => now(),
            'opening_cash' => 0,
            'expected_cash' => 0,
            'agent_opening_cash' => 500000,
            'agent_expected_cash' => 500000,
            'status' => CashierShift::STATUS_OPEN,
        ]);

        $bank = \App\Models\BankAccount::create([
            'bank_name' => 'BCA',
            'account_number' => '123456',
            'account_name' => 'Test Account',
            'is_active' => true,
            'balance' => 1000000,
        ]);

        $tfLoket = \App\Models\AgentAdminLoket::create([
            'code' => 'TF02',
            'amount' => 3000,
            'description' => '501K s/d 1jt',
        ]);

        $kreditType = AgentTransactionType::create([
            'code' => 'JTA0002',
            'name' => 'Tarik Tunai',
            'type' => 'kredit',
        ]);

        AgentTransaction::create([
            'cashier_id' => $cashier->id,
            'cashier_shift_id' => $shift->id,
            'agent_transaction_type_id' => $kreditType->id,
            'agent_admin_loket_id' => $tfLoket->id,
            'bank_account_id' => $bank->id,
            'transaction_date' => now(),
            'nominal' => 100000,
            'admin_fee_customer' => 3000,
            'admin_fee_bank' => 2000,
            'admin_fee_payment_method' => 'cash',
            'status' => 'success',
        ]);

        // Bank balance: nominal only, admin_fee_bank and the cash-paid customer fee
        // both ignored = 1,000,000 + 100,000
        $this->assertEquals(1100000, $bank->fresh()->balance);

        // Cash drawer: 500,000 - 100,000 nominal + 3,000 fee = 403,000
        $summary = app(CashierShiftService::class)->calculateSummary($shift);
        $this->assertSame(403000, $summary['agent_expected_cash']);
    }

    public function test_trasfer_then_tarik_tunai_on_the_same_bank_moves_cash_and_bank_opposite_ways(): void
    {
        // Regression for the reported case: a Trasfer (debet) followed by a Tarik
        // Tunai (kredit) on the same BRI account, both nominal 50,000 with a 3,000
        // cash loket fee and a 5,000 admin_fee_bank.
        $cashier = $this->createUserWithPermissions([
            'agent-transactions-create',
            'cashier-shifts-access',
        ]);

        $shift = CashierShift::create([
            'user_id' => $cashier->id,
            'opened_by' => $cashier->id,
            'opened_at' => now(),
            'opening_cash' => 0,
            'expected_cash' => 0,
            'agent_opening_cash' => 100000,
            'agent_expected_cash' => 100000,
            'status' => CashierShift::STATUS_OPEN,
        ]);

        $bank = \App\Models\BankAccount::create([
            'bank_name' => 'BRI',
            'account_number' => '002401998877503',
            'account_name' => 'PT Maju Bersama Retail',
            'is_active' => true,
            'balance' => 100000,
        ]);

        $tfLoket = \App\Models\AgentAdminLoket::create([
            'code' => 'TF02',
            'amount' => 3000,
            'description' => '501K s/d 1jt',
        ]);

        $brivaLoket = \App\Models\AgentAdminLoket::create([
            'code' => 'BRIVA01',
            'amount' => 3000,
            'description' => 'Tarik tunai',
        ]);

        $debetType = AgentTransactionType::create([
            'code' => '001',
            'name' => 'Trasfer',
            'type' => 'debet',
        ]);

        $kreditType = AgentTransactionType::create([
            'code' => '002',
            'name' => 'Tarik Tunai',
            'type' => 'kredit',
        ]);

        // Trasfer (debet): customer hands over 50,000 + 3,000 loket fee + 5,000 bank fee
        // in cash, we send 50,000 out of BRI and the bank charges us 5,000 for it.
        AgentTransaction::create([
            'cashier_id' => $cashier->id,
            'cashier_shift_id' => $shift->id,
            'agent_transaction_type_id' => $debetType->id,
            'bank_account_id' => $bank->id,
            'agent_admin_loket_id' => $tfLoket->id,
            'transaction_date' => now(),
            'nominal' => 50000,
            'admin_fee_customer' => 3000,
            'admin_fee_bank' => 5000,
            'admin_fee_payment_method' => 'cash',
            'status' => 'success',
        ]);

        $service = app(CashierShiftService::class);

        // Cash 100,000 + 58,000 = 158,000; BRI 100,000 - 55,000 = 45,000
        $this->assertSame(158000, $service->calculateSummary($shift)['agent_expected_cash']);
        $this->assertEquals(45000, $bank->fresh()->balance);

        // Tarik Tunai (kredit): customer takes 50,000 cash out of the drawer and
        // pays a 3,000 fee in cash; BRI receives the full 50,000. admin_fee_bank
        // is the customer's own bank's charge, so it touches neither side.
        AgentTransaction::create([
            'cashier_id' => $cashier->id,
            'cashier_shift_id' => $shift->id,
            'agent_transaction_type_id' => $kreditType->id,
            'bank_account_id' => $bank->id,
            'agent_admin_loket_id' => $brivaLoket->id,
            'transaction_date' => now(),
            'nominal' => 50000,
            'admin_fee_customer' => 3000,
            'admin_fee_bank' => 5000,
            'admin_fee_payment_method' => 'cash',
            'status' => 'success',
        ]);

        // Cash 158,000 - 50,000 + 3,000 = 111,000; BRI 45,000 + 50,000 = 95,000
        $summary = $service->calculateSummary($shift);
        $this->assertSame(111000, $summary['agent_expected_cash']);
        $this->assertEquals(95000, $bank->fresh()->balance);

        // The two legs move in opposite directions, which is the whole point.
        $this->assertSame(61000, $summary['agent_cash_in_total']);
        $this->assertSame(50000, $summary['agent_cash_out_total']);
    }

    public function test_agent_transactions_index_filters_by_active_shift_by_default(): void
    {
        $cashier = $this->createUserWithPermissions([
            'agent-transactions-access',
            'agent-transactions-create',
            'cashier-shifts-access',
        ]);

        $type = AgentTransactionType::create([
            'code' => '001',
            'name' => 'Trasfer',
            'type' => 'debet',
        ]);

        // Old closed shift
        $oldShift = CashierShift::create([
            'user_id' => $cashier->id,
            'opened_by' => $cashier->id,
            'opened_at' => now()->subDay(),
            'closed_at' => now()->subDay()->addHours(8),
            'opening_cash' => 50000,
            'expected_cash' => 50000,
            'status' => CashierShift::STATUS_CLOSED,
        ]);

        $oldTx = AgentTransaction::create([
            'cashier_id' => $cashier->id,
            'cashier_shift_id' => $oldShift->id,
            'agent_transaction_type_id' => $type->id,
            'nominal' => 100000,
            'admin_fee_customer' => 3000,
            'admin_fee_bank' => 0,
            'admin_fee_payment_method' => 'cash',
            'status' => 'success',
            'transaction_date' => now()->subDay(),
        ]);

        // New active shift
        $newShift = CashierShift::create([
            'user_id' => $cashier->id,
            'opened_by' => $cashier->id,
            'opened_at' => now(),
            'opening_cash' => 100000,
            'expected_cash' => 100000,
            'status' => CashierShift::STATUS_OPEN,
        ]);

        $newTx = AgentTransaction::create([
            'cashier_id' => $cashier->id,
            'cashier_shift_id' => $newShift->id,
            'agent_transaction_type_id' => $type->id,
            'nominal' => 50000,
            'admin_fee_customer' => 3000,
            'admin_fee_bank' => 0,
            'admin_fee_payment_method' => 'cash',
            'status' => 'success',
            'transaction_date' => now(),
        ]);

        // By default (active shift), only newTx should be listed
        $res = $this->actingAs($cashier)->get(route('agent-transactions.index'));
        $res->assertOk();
        $transactions = $res->viewData('page')['props']['transactions']['data'];
        $this->assertCount(1, $transactions);
        $this->assertEquals($newTx->id, $transactions[0]['id']);

        // When requesting all history
        $resAll = $this->actingAs($cashier)->get(route('agent-transactions.index', ['shift_filter' => 'all']));
        $resAll->assertOk();
        $allTransactions = $resAll->viewData('page')['props']['transactions']['data'];
        $this->assertCount(2, $allTransactions);
    }

    private function createUserWithPermissions(array $permissions): User
    {
        $user = User::factory()->create();
        $user->givePermissionTo($permissions);

        return $user;
    }
}
