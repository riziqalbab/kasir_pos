<?php

namespace App\Services;

use App\Models\AgentTransaction;
use App\Models\BankAccount;
use App\Models\CashierShift;
use App\Models\CashierShiftBankAccount;
use App\Models\SalesReturn;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CashierShiftService
{
    public function getActiveShiftForUser(int $userId): ?CashierShift
    {
        return CashierShift::query()
            ->with(['user:id,name', 'openedBy:id,name'])
            ->open()
            ->where('user_id', $userId)
            ->latest('opened_at')
            ->first();
    }

    public function requireActiveShiftForUser(int $userId, bool $lockForUpdate = false): CashierShift
    {
        $query = CashierShift::query()
            ->open()
            ->where('user_id', $userId)
            ->latest('opened_at');

        if ($lockForUpdate) {
            $query->lockForUpdate();
        }

        $shift = $query->first();

        if (! $shift) {
            throw ValidationException::withMessages([
                'shift' => 'Shift kasir belum dibuka.',
            ]);
        }

        return $shift;
    }

    public function openShift(
        User $cashier,
        User $actor,
        int $openingCash,
        int $agentOpeningCash = 0,
        ?string $notes = null,
        array $bankBalances = []
    ): CashierShift {
        $existing = CashierShift::query()
            ->open()
            ->where('user_id', $cashier->id)
            ->exists();

        if ($existing) {
            throw ValidationException::withMessages([
                'opening_cash' => 'Kasir ini masih memiliki shift aktif.',
            ]);
        }

        return DB::transaction(function () use ($cashier, $actor, $openingCash, $agentOpeningCash, $notes, $bankBalances) {
            $shift = CashierShift::create([
                'user_id' => $cashier->id,
                'opened_by' => $actor->id,
                'opened_at' => now(),
                'opening_cash' => $openingCash,
                'agent_opening_cash' => $agentOpeningCash,
                'expected_cash' => $openingCash,
                'agent_expected_cash' => $agentOpeningCash,
                'notes' => $notes,
                'status' => CashierShift::STATUS_OPEN,
            ]);

            $activeBanks = BankAccount::active()->ordered()->get();
            foreach ($activeBanks as $bank) {
                $openingBalance = isset($bankBalances[$bank->id]) && $bankBalances[$bank->id] !== ''
                    ? (int) $bankBalances[$bank->id]
                    : (int) $bank->balance;

                if ($bank->balance !== $openingBalance) {
                    $bank->update(['balance' => $openingBalance]);
                }

                CashierShiftBankAccount::create([
                    'cashier_shift_id' => $shift->id,
                    'bank_account_id' => $bank->id,
                    'opening_balance' => $openingBalance,
                    'expected_balance' => $openingBalance,
                ]);
            }

            return $shift;
        });
    }

    public function calculateSummary(CashierShift $shift): array
    {
        $transactions = Transaction::query()
            ->where('cashier_shift_id', $shift->id);

        $salesReturns = SalesReturn::query()
            ->where('cashier_shift_id', $shift->id)
            ->where('status', 'completed');

        $cashSalesTotal = (int) (clone $transactions)
            ->where('payment_method', 'cash')
            ->where('payment_status', 'paid')
            ->sum('grand_total');

        $nonCashSalesTotal = (int) (clone $transactions)
            ->where('payment_method', '!=', 'cash')
            ->sum('grand_total');

        $cashRefundTotal = (int) (clone $salesReturns)
            ->where('return_type', 'refund_cash')
            ->sum('refund_amount');

        $nonCashRefundTotal = (int) (clone $salesReturns)
            ->where('return_type', '!=', 'refund_cash')
            ->sum(DB::raw('COALESCE(credited_amount, 0)'));

        $agentTransactions = AgentTransaction::query()
            ->where('cashier_shift_id', $shift->id)
            ->where('status', 'success');

        // Debet (e.g. Setor/Transfer): customer hands cash for the nominal, plus the fees
        // if paid cash. admin_fee_bank is reimbursed by the customer too (it's part of the
        // total charged, see the transaction list's "Total Bayar"), while the bank balance
        // is debited for nominal + admin_fee_bank.
        $agentDebetCashIn = (int) (clone $agentTransactions)
            ->whereHas('agentTransactionType', function ($query) {
                $query->where('type', 'debet');
            })
            ->sum(DB::raw("nominal + (case when admin_fee_payment_method = 'cash' then admin_fee_customer + admin_fee_bank else 0 end)"));

        // Kredit (e.g. Tarik Tunai): nominal is handed to the customer in cash -
        // always a cash outflow, regardless of how the admin fee is settled.
        $agentKreditCashOut = (int) (clone $agentTransactions)
            ->whereHas('agentTransactionType', function ($query) {
                $query->where('type', 'kredit');
            })
            ->sum('nominal');

        // When the fee is received in cash, admin_fee_customer lands in the cash
        // drawer regardless of the admin loket code; it only routes to the bank
        // balance when the fee itself is paid non-cash.
        $agentKreditLoketFeeCashIn = (int) (clone $agentTransactions)
            ->whereHas('agentTransactionType', function ($query) {
                $query->where('type', 'kredit');
            })
            ->where('admin_fee_payment_method', 'cash')
            ->sum('admin_fee_customer');

        $agentCashInTotal = $agentDebetCashIn + $agentKreditLoketFeeCashIn;

        $agentCashOutTotal = $agentKreditCashOut;

        // Kept for the UI's fee breakdown card - the loket-fee slice of kredit's cash-in
        // (already included in agent_cash_in_total above, not added again below).
        $agentFeesCashInTotal = $agentKreditLoketFeeCashIn;

        $transactionsCount = (int) (clone $transactions)->count();
        $salesReturnsCount = (int) (clone $salesReturns)->count();
        $agentTransactionsCount = (int) (clone $agentTransactions)->count();
        $expectedCash = (int) $shift->opening_cash + $cashSalesTotal - $cashRefundTotal;
        $agentExpectedCash = (int) $shift->agent_opening_cash + $agentCashInTotal - $agentCashOutTotal;

        return [
            'cash_sales_total' => $cashSalesTotal,
            'non_cash_sales_total' => $nonCashSalesTotal,
            'cash_refund_total' => $cashRefundTotal,
            'non_cash_refund_total' => $nonCashRefundTotal,
            'agent_cash_in_total' => $agentCashInTotal,
            'agent_cash_out_total' => $agentCashOutTotal,
            'agent_fees_cash_in_total' => $agentFeesCashInTotal,
            'transactions_count' => $transactionsCount,
            'sales_returns_count' => $salesReturnsCount,
            'agent_transactions_count' => $agentTransactionsCount,
            'expected_cash' => $expectedCash,
            'agent_expected_cash' => $agentExpectedCash,
        ];
    }

    public function closeShift(
        CashierShift $shift,
        User $actor,
        int $actualCash,
        int $agentActualCash = 0,
        array $bankActualBalances = [],
        ?string $closeNotes = null,
        bool $forceClose = false
    ): CashierShift {
        if (! $shift->isOpen()) {
            throw ValidationException::withMessages([
                'shift' => 'Shift yang sudah ditutup tidak dapat diubah.',
            ]);
        }

        return DB::transaction(function () use ($shift, $actor, $actualCash, $agentActualCash, $bankActualBalances, $closeNotes, $forceClose) {
            $lockedShift = CashierShift::query()->lockForUpdate()->findOrFail($shift->id);

            if (! $lockedShift->isOpen()) {
                throw ValidationException::withMessages([
                    'shift' => 'Shift yang sudah ditutup tidak dapat diubah.',
                ]);
            }

            $summary = $this->calculateSummary($lockedShift);
            $cashDifference = $actualCash - $summary['expected_cash'];
            $agentCashDifference = $agentActualCash - $summary['agent_expected_cash'];

            $lockedShift->update([
                ...$summary,
                'actual_cash' => $actualCash,
                'cash_difference' => $cashDifference,
                'agent_actual_cash' => $agentActualCash,
                'agent_cash_difference' => $agentCashDifference,
                'closed_at' => now(),
                'closed_by' => $actor->id,
                'close_notes' => $closeNotes,
                'status' => $forceClose
                    ? CashierShift::STATUS_FORCE_CLOSED
                    : CashierShift::STATUS_CLOSED,
            ]);

            // Reconcile and save bank/EDC balances
            $bankSummaries = $this->getBankBalancesSummary($lockedShift);
            foreach ($bankSummaries as $item) {
                $bankId = $item['bank_account_id'];
                $hasInput = array_key_exists($bankId, $bankActualBalances) && $bankActualBalances[$bankId] !== '' && $bankActualBalances[$bankId] !== null;
                $actualBalance = $hasInput ? (int) $bankActualBalances[$bankId] : null;
                $difference = $actualBalance !== null ? ($actualBalance - $item['expected_balance']) : null;

                CashierShiftBankAccount::updateOrCreate([
                    'cashier_shift_id' => $lockedShift->id,
                    'bank_account_id' => $bankId,
                ], [
                    'opening_balance' => $item['opening_balance'],
                    'expected_balance' => $item['expected_balance'],
                    'actual_balance' => $actualBalance,
                    'difference' => $difference,
                ]);
            }

            $backupFilename = null;
            // Automatic full background system ZIP backup on shift closure (Database SQL + Media/Storage)
            try {
                $backupFilename = app(BackupService::class)->createFullBackup();
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning('Auto full backup failed on shift close: '.$e->getMessage());
            }

            $refreshed = $lockedShift->fresh(['user:id,name', 'openedBy:id,name', 'closedBy:id,name', 'cashierShiftBankAccounts.bankAccount']);
            if ($backupFilename) {
                $refreshed->auto_backup_filename = $backupFilename;
            }

            return $refreshed;
        });
    }

    public function getBankBalancesSummary(CashierShift $shift): array
    {
        $shiftBanks = CashierShiftBankAccount::query()
            ->with('bankAccount')
            ->where('cashier_shift_id', $shift->id)
            ->get();

        $activeBanks = BankAccount::active()->ordered()->get();

        $bankMap = [];
        if ($shiftBanks->isNotEmpty()) {
            foreach ($shiftBanks as $sb) {
                if ($sb->bankAccount) {
                    $bankMap[$sb->bank_account_id] = [
                        'bank_account_id' => $sb->bank_account_id,
                        'bank_name' => $sb->bankAccount->bank_name,
                        'account_name' => $sb->bankAccount->account_name,
                        'account_number' => $sb->bankAccount->account_number,
                        'opening_balance' => (int) $sb->opening_balance,
                        'actual_balance' => $sb->actual_balance !== null ? (int) $sb->actual_balance : null,
                        'difference' => $sb->difference !== null ? (int) $sb->difference : null,
                    ];
                }
            }
        } else {
            foreach ($activeBanks as $bank) {
                $bankMap[$bank->id] = [
                    'bank_account_id' => $bank->id,
                    'bank_name' => $bank->bank_name,
                    'account_name' => $bank->account_name,
                    'account_number' => $bank->account_number,
                    'opening_balance' => (int) $bank->balance,
                    'actual_balance' => null,
                    'difference' => null,
                ];
            }
        }

        // Calculate mutations from Agent Transactions during this shift
        $agentTxList = AgentTransaction::query()
            ->with('agentTransactionType')
            ->where('cashier_shift_id', $shift->id)
            ->where('status', 'success')
            ->whereNotNull('bank_account_id')
            ->get();

        $bankMutations = [];
        foreach ($agentTxList as $tx) {
            $bankId = $tx->bank_account_id;
            if (! isset($bankMutations[$bankId])) {
                $bankMutations[$bankId] = [
                    'bank_inflow' => 0,
                    'bank_outflow' => 0,
                    'tx_count' => 0,
                ];
            }

            $isDebet = $tx->agentTransactionType && $tx->agentTransactionType->type === 'debet';
            if ($isDebet) {
                // Bank balance reduced: nominal + admin_fee_bank
                $bankMutations[$bankId]['bank_outflow'] += ($tx->nominal + $tx->admin_fee_bank);
            } else {
                // Bank balance increased: nominal + (fee if paid via bank)
                $feeBank = $tx->admin_fee_payment_method === 'bank' ? $tx->admin_fee_customer : 0;
                $bankMutations[$bankId]['bank_inflow'] += ($tx->nominal + $feeBank);
            }
            $bankMutations[$bankId]['tx_count'] += 1;
        }

        // Also check POS transactions with payment_method = 'bank_transfer'
        $posBankTransfers = Transaction::query()
            ->where('cashier_shift_id', $shift->id)
            ->where('payment_method', 'bank_transfer')
            ->where('payment_status', 'paid')
            ->whereNotNull('bank_account_id')
            ->select('bank_account_id', DB::raw('SUM(grand_total) as total_amount'), DB::raw('COUNT(*) as tx_count'))
            ->groupBy('bank_account_id')
            ->get();

        foreach ($posBankTransfers as $posTx) {
            $bankId = $posTx->bank_account_id;
            if (! isset($bankMutations[$bankId])) {
                $bankMutations[$bankId] = [
                    'bank_inflow' => 0,
                    'bank_outflow' => 0,
                    'tx_count' => 0,
                ];
            }
            $bankMutations[$bankId]['bank_inflow'] += (int) $posTx->total_amount;
            $bankMutations[$bankId]['tx_count'] += (int) $posTx->tx_count;
        }

        $results = [];
        foreach ($bankMap as $bankId => $data) {
            $mutations = $bankMutations[$bankId] ?? ['bank_inflow' => 0, 'bank_outflow' => 0, 'tx_count' => 0];
            $expectedBalance = $data['opening_balance'] + $mutations['bank_inflow'] - $mutations['bank_outflow'];
            $actualBalance = $data['actual_balance'];
            $difference = $data['difference'];

            if ($shift->isOpen()) {
                $difference = null;
            } elseif ($actualBalance !== null) {
                $difference = $actualBalance - $expectedBalance;
            }

            $results[] = [
                'bank_account_id' => $bankId,
                'bank_name' => $data['bank_name'],
                'account_name' => $data['account_name'],
                'account_number' => $data['account_number'],
                'opening_balance' => $data['opening_balance'],
                'bank_inflow' => $mutations['bank_inflow'],
                'bank_outflow' => $mutations['bank_outflow'],
                'tx_count' => $mutations['tx_count'],
                'expected_balance' => $expectedBalance,
                'actual_balance' => $actualBalance,
                'difference' => $difference,
            ];
        }

        return $results;
    }

    public function summarizeForDisplay(?CashierShift $shift): ?array
    {
        if (! $shift) {
            return null;
        }

        $summary = $this->calculateSummary($shift);

        return [
            'id' => $shift->id,
            'status' => $shift->status,
            'opening_cash' => (int) $shift->opening_cash,
            'agent_opening_cash' => (int) $shift->agent_opening_cash,
            'opened_at' => optional($shift->opened_at)?->toISOString(),
            'notes' => $shift->notes,
            'user' => $shift->user ? [
                'id' => $shift->user->id,
                'name' => $shift->user->name,
            ] : null,
            ...$summary,
        ];
    }

    public function visibleToUser(Builder $query, User $user): Builder
    {
        if ($user->isSuperAdmin() || $user->can('cashier-shifts-force-close')) {
            return $query;
        }

        return $query->where('user_id', $user->id);
    }

    public function getDetailedBreakdowns(CashierShift $shift): array
    {
        $transactions = Transaction::query()
            ->where('cashier_shift_id', $shift->id);

        $cashierBreakdown = [
            'cash' => [
                'name' => 'Tunai (Cash)',
                'amount' => (int) (clone $transactions)
                    ->where('payment_method', 'cash')
                    ->where('payment_status', 'paid')
                    ->sum('grand_total'),
            ],
            'qris' => [
                'name' => 'QRIS',
                'amount' => (int) (clone $transactions)
                    ->where('payment_method', 'qris')
                    ->sum('grand_total'),
            ],
            'bank_transfer' => [
                'name' => 'Transfer Bank (TF)',
                'amount' => (int) (clone $transactions)
                    ->where('payment_method', 'bank_transfer')
                    ->sum('grand_total'),
            ],
            'debit_credit' => [
                'name' => 'Kartu Debit (Debit)',
                'amount' => (int) (clone $transactions)
                    ->where('payment_method', 'debit_credit')
                    ->sum('grand_total'),
            ],
            'pay_later' => [
                'name' => 'Piutang (Pay Later)',
                'amount' => (int) (clone $transactions)
                    ->where('payment_method', 'pay_later')
                    ->sum('grand_total'),
            ],
        ];

        $agentTxList = AgentTransaction::query()
            ->with(['bankAccount', 'agentAdminLoket', 'agentTransactionType'])
            ->where('cashier_shift_id', $shift->id)
            ->where('status', 'success')
            ->get();

        $agentBankBreakdown = [];
        $agentLoketBreakdown = [];

        foreach ($agentTxList as $tx) {
            $type = $tx->agentTransactionType->type; // 'debet' or 'kredit'

            $cashIn = 0;
            $cashOut = 0;

            if ($type === 'debet') {
                $cashOut = 0;
                $cashIn = $tx->nominal + ($tx->admin_fee_payment_method === 'cash'
                    ? $tx->admin_fee_customer + $tx->admin_fee_bank
                    : 0);
            } else {
                // Kredit: nominal always leaves the cash drawer (handed to the
                // customer). admin_fee_customer lands in cash only if paid in cash,
                // otherwise it goes to the bank balance.
                $cashOut = $tx->nominal;
                $cashIn = $tx->admin_fee_payment_method === 'cash' ? $tx->admin_fee_customer : 0;
            }

            if ($tx->bankAccount) {
                $bankName = $tx->bankAccount->bank_name;
                if (! isset($agentBankBreakdown[$bankName])) {
                    $agentBankBreakdown[$bankName] = [
                        'bank_name' => $bankName,
                        'cash_in' => 0,
                        'cash_out' => 0,
                        'nominal' => 0,
                        'count' => 0,
                    ];
                }
                $agentBankBreakdown[$bankName]['cash_in'] += $cashIn;
                $agentBankBreakdown[$bankName]['cash_out'] += $cashOut;
                $agentBankBreakdown[$bankName]['nominal'] += $tx->nominal;
                $agentBankBreakdown[$bankName]['count'] += 1;
            }

            if ($tx->agentAdminLoket) {
                $loketCode = $tx->agentAdminLoket->code;
                if (! isset($agentLoketBreakdown[$loketCode])) {
                    $agentLoketBreakdown[$loketCode] = [
                        'code' => $loketCode,
                        'cash_in' => 0,
                        'cash_out' => 0,
                        'nominal' => 0,
                        'count' => 0,
                    ];
                }
                $agentLoketBreakdown[$loketCode]['cash_in'] += $cashIn;
                $agentLoketBreakdown[$loketCode]['cash_out'] += $cashOut;
                $agentLoketBreakdown[$loketCode]['nominal'] += $tx->nominal;
                $agentLoketBreakdown[$loketCode]['count'] += 1;
            }
        }

        return [
            'cashier_payment_breakdown' => $cashierBreakdown,
            'agent_bank_breakdown' => array_values($agentBankBreakdown),
            'agent_loket_breakdown' => array_values($agentLoketBreakdown),
        ];
    }
}
