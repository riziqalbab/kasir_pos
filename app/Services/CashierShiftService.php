<?php

namespace App\Services;

use App\Models\AgentTransaction;
use App\Models\CashierShift;
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

    public function openShift(User $cashier, User $actor, int $openingCash, ?string $notes = null): CashierShift
    {
        $existing = CashierShift::query()
            ->open()
            ->where('user_id', $cashier->id)
            ->exists();

        if ($existing) {
            throw ValidationException::withMessages([
                'opening_cash' => 'Kasir ini masih memiliki shift aktif.',
            ]);
        }

        return CashierShift::create([
            'user_id' => $cashier->id,
            'opened_by' => $actor->id,
            'opened_at' => now(),
            'opening_cash' => $openingCash,
            'expected_cash' => $openingCash,
            'notes' => $notes,
            'status' => CashierShift::STATUS_OPEN,
        ]);
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

        $agentCashInTotal = (int) (clone $agentTransactions)
            ->whereHas('agentTransactionType', function ($query) {
                $query->where('type', 'debet');
            })
            ->sum(DB::raw('nominal + (case when admin_fee_payment_method = "cash" then admin_fee_customer else 0 end)'));

        $agentCashOutTotal = (int) (clone $agentTransactions)
            ->whereHas('agentTransactionType', function ($query) {
                $query->where('type', 'kredit');
            })
            ->sum('nominal');

        $agentFeesCashInTotal = (int) (clone $agentTransactions)
            ->whereHas('agentTransactionType', function ($query) {
                $query->where('type', 'kredit');
            })
            ->where('admin_fee_payment_method', 'cash')
            ->sum('admin_fee_customer');

        $transactionsCount = (int) (clone $transactions)->count();
        $salesReturnsCount = (int) (clone $salesReturns)->count();
        $agentTransactionsCount = (int) (clone $agentTransactions)->count();
        $expectedCash = (int) $shift->opening_cash + $cashSalesTotal - $cashRefundTotal + $agentCashInTotal - $agentCashOutTotal + $agentFeesCashInTotal;

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
        ];
    }

    public function closeShift(
        CashierShift $shift,
        User $actor,
        int $actualCash,
        ?string $closeNotes = null,
        bool $forceClose = false
    ): CashierShift {
        if (! $shift->isOpen()) {
            throw ValidationException::withMessages([
                'shift' => 'Shift yang sudah ditutup tidak dapat diubah.',
            ]);
        }

        return DB::transaction(function () use ($shift, $actor, $actualCash, $closeNotes, $forceClose) {
            $lockedShift = CashierShift::query()->lockForUpdate()->findOrFail($shift->id);

            if (! $lockedShift->isOpen()) {
                throw ValidationException::withMessages([
                    'shift' => 'Shift yang sudah ditutup tidak dapat diubah.',
                ]);
            }

            $summary = $this->calculateSummary($lockedShift);
            $cashDifference = $actualCash - $summary['expected_cash'];

            $lockedShift->update([
                ...$summary,
                'actual_cash' => $actualCash,
                'cash_difference' => $cashDifference,
                'closed_at' => now(),
                'closed_by' => $actor->id,
                'close_notes' => $closeNotes,
                'status' => $forceClose
                    ? CashierShift::STATUS_FORCE_CLOSED
                    : CashierShift::STATUS_CLOSED,
            ]);

            return $lockedShift->fresh(['user:id,name', 'openedBy:id,name', 'closedBy:id,name']);
        });
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
                $cashIn = $tx->nominal + ($tx->admin_fee_payment_method === 'cash' ? $tx->admin_fee_customer : 0);
            } else {
                $cashOut = $tx->nominal;
                $cashIn = ($tx->admin_fee_payment_method === 'cash' ? $tx->admin_fee_customer : 0);
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
