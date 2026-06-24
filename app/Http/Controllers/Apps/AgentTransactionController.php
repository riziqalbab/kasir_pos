<?php

namespace App\Http\Controllers\Apps;

use App\Http\Controllers\Controller;
use App\Models\AgentTransaction;
use App\Models\AgentTransactionType;
use App\Models\BankAccount;
use App\Services\AuditLogService;
use App\Services\CashierShiftService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AgentTransactionController extends Controller
{
    public function __construct(
        private readonly CashierShiftService $cashierShiftService,
        private readonly AuditLogService $auditLogService
    ) {}

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $userId = $request->user()->id;
        $activeShift = $this->cashierShiftService->getActiveShiftForUser($userId);

        $filters = [
            'search' => $request->input('search'),
            'start_date' => $request->input('start_date'),
            'end_date' => $request->input('end_date'),
            'type_id' => $request->input('type_id'),
            'bank_account_id' => $request->input('bank_account_id'),
            'status' => $request->input('status'),
        ];

        // build query
        $query = AgentTransaction::query()
            ->with(['agentTransactionType', 'bankAccount', 'cashier:id,name', 'agentAdminBank', 'agentAdminLoket'])
            ->when($filters['search'], function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('customer_name', 'like', "%{$search}%")
                        ->orWhere('customer_phone', 'like', "%{$search}%")
                        ->orWhere('reference_number', 'like', "%{$search}%")
                        ->orWhere('notes', 'like', "%{$search}%");
                });
            })
            ->when($filters['start_date'], function ($query, $startDate) {
                $query->whereDate('transaction_date', '>=', $startDate);
            })
            ->when($filters['end_date'], function ($query, $endDate) {
                $query->whereDate('transaction_date', '<=', $endDate);
            })
            ->when($filters['type_id'], function ($query, $typeId) {
                $query->where('agent_transaction_type_id', $typeId);
            })
            ->when($filters['bank_account_id'], function ($query, $bankAccountId) {
                $query->where('bank_account_id', $bankAccountId);
            })
            ->when($filters['status'], function ($query, $status) {
                $query->where('status', $status);
            });

        // Calculate statistics based on current filters
        $statsQuery = clone $query;
        $stats = $statsQuery->selectRaw('
            COALESCE(SUM(CASE WHEN status = "success" THEN nominal ELSE 0 END), 0) as total_volume,
            COALESCE(SUM(CASE WHEN status = "success" THEN admin_fee_customer ELSE 0 END), 0) as total_customer_fees,
            COALESCE(SUM(CASE WHEN status = "success" THEN admin_fee_bank ELSE 0 END), 0) as total_bank_fees,
            COALESCE(SUM(CASE WHEN status = "success" THEN net_profit ELSE 0 END), 0) as total_profit
        ')->first();

        // Paginate results
        $transactions = $query->latest('transaction_date')
            ->paginate(15)
            ->withQueryString();

        // Get related settings/master data
        $bankAccounts = BankAccount::active()->ordered()->get();
        $transactionTypes = AgentTransactionType::active()->get();
        $agentAdminBanks = \App\Models\AgentAdminBank::oldest('code')->get();
        $agentAdminLokets = \App\Models\AgentAdminLoket::oldest('code')->get();

        return Inertia::render('Dashboard/AgentTransactions/Index', [
            'transactions' => $transactions,
            'filters' => $filters,
            'stats' => [
                'total_volume' => (int) $stats->total_volume,
                'total_customer_fees' => (int) $stats->total_customer_fees,
                'total_bank_fees' => (int) $stats->total_bank_fees,
                'total_profit' => (int) $stats->total_profit,
            ],
            'bankAccounts' => $bankAccounts,
            'transactionTypes' => $transactionTypes,
            'agentAdminBanks' => $agentAdminBanks,
            'agentAdminLokets' => $agentAdminLokets,
            'activeCashierShift' => $activeShift ? [
                'id' => $activeShift->id,
                'opening_cash' => (int) $activeShift->opening_cash,
                'opened_at' => $activeShift->opened_at->toISOString(),
            ] : null,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $userId = $request->user()->id;
        $activeShift = $this->cashierShiftService->requireActiveShiftForUser($userId);

        $validated = $request->validate([
            'agent_transaction_type_id' => 'required|exists:agent_transaction_types,id',
            'bank_account_id' => 'nullable|exists:bank_accounts,id',
            'agent_admin_bank_id' => 'nullable|exists:agent_admin_banks,id',
            'agent_admin_loket_id' => 'nullable|exists:agent_admin_lokets,id',
            'customer_name' => 'nullable|string|max:255',
            'customer_phone' => 'nullable|string|max:20',
            'reference_number' => 'nullable|string|max:100',
            'nominal' => 'required|integer|min:0',
            'admin_fee_customer' => 'required|integer|min:0',
            'admin_fee_bank' => 'required|integer|min:0',
            'admin_fee_payment_method' => 'required|in:cash,bank',
            'status' => 'required|in:success,pending,failed',
            'notes' => 'nullable|string',
        ]);

        $transaction = AgentTransaction::create([
            ...$validated,
            'cashier_id' => $userId,
            'cashier_shift_id' => $activeShift->id,
            'transaction_date' => now(),
        ]);

        $this->auditLogService->log(
            event: 'agent_transaction.created',
            module: 'agent_transactions',
            auditable: $transaction,
            description: 'Transaksi agen berhasil dicatat.',
            after: $transaction->toArray(),
            meta: [
                'nominal' => $transaction->nominal,
                'profit' => $transaction->net_profit,
                'status' => $transaction->status,
            ],
        );

        return to_route('agent-transactions.index')->with('success', 'Transaksi agen berhasil dicatat.');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, AgentTransaction $agentTransaction)
    {
        $userId = $request->user()->id;

        // Prevent editing if the shift is closed and user is not super admin
        if ($agentTransaction->cashierShift && $agentTransaction->cashierShift->status !== 'open' && ! $request->user()->isSuperAdmin()) {
            return to_route('agent-transactions.index')->with('error', 'Transaksi pada shift yang sudah ditutup tidak dapat diubah.');
        }

        $validated = $request->validate([
            'agent_transaction_type_id' => 'required|exists:agent_transaction_types,id',
            'bank_account_id' => 'nullable|exists:bank_accounts,id',
            'agent_admin_bank_id' => 'nullable|exists:agent_admin_banks,id',
            'agent_admin_loket_id' => 'nullable|exists:agent_admin_lokets,id',
            'customer_name' => 'nullable|string|max:255',
            'customer_phone' => 'nullable|string|max:20',
            'reference_number' => 'nullable|string|max:100',
            'nominal' => 'required|integer|min:0',
            'admin_fee_customer' => 'required|integer|min:0',
            'admin_fee_bank' => 'required|integer|min:0',
            'admin_fee_payment_method' => 'required|in:cash,bank',
            'status' => 'required|in:success,pending,failed',
            'notes' => 'nullable|string',
        ]);

        $before = $agentTransaction->toArray();
        $agentTransaction->update($validated);

        $this->auditLogService->log(
            event: 'agent_transaction.updated',
            module: 'agent_transactions',
            auditable: $agentTransaction,
            description: 'Transaksi agen berhasil diperbarui.',
            before: $before,
            after: $agentTransaction->toArray(),
            meta: [
                'nominal' => $agentTransaction->nominal,
                'profit' => $agentTransaction->net_profit,
                'status' => $agentTransaction->status,
            ],
        );

        return to_route('agent-transactions.index')->with('success', 'Transaksi agen berhasil diperbarui.');
    }

    /**
     * Update status of the agent transaction.
     */
    public function updateStatus(Request $request, AgentTransaction $agentTransaction)
    {
        // Prevent editing if the shift is closed and user is not super admin
        if ($agentTransaction->cashierShift && $agentTransaction->cashierShift->status !== 'open' && ! $request->user()->isSuperAdmin()) {
            return to_route('agent-transactions.index')->with('error', 'Transaksi pada shift yang sudah ditutup tidak dapat diubah.');
        }

        $request->validate([
            'status' => 'required|in:success,pending,failed',
        ]);

        $before = $agentTransaction->toArray();
        $agentTransaction->update(['status' => $request->status]);

        $this->auditLogService->log(
            event: 'agent_transaction.status_updated',
            module: 'agent_transactions',
            auditable: $agentTransaction,
            description: 'Status transaksi agen diperbarui.',
            before: $before,
            after: $agentTransaction->fresh()->toArray(),
            meta: [
                'status' => $request->status,
            ],
        );

        return to_route('agent-transactions.index')->with('success', 'Status transaksi agen berhasil diperbarui.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, AgentTransaction $agentTransaction)
    {
        // Prevent deleting if the shift is closed and user is not super admin
        if ($agentTransaction->cashierShift && $agentTransaction->cashierShift->status !== 'open' && ! $request->user()->isSuperAdmin()) {
            return to_route('agent-transactions.index')->with('error', 'Transaksi pada shift yang sudah ditutup tidak dapat dihapus.');
        }

        $before = $agentTransaction->toArray();
        $agentTransaction->delete();

        $this->auditLogService->log(
            event: 'agent_transaction.deleted',
            module: 'agent_transactions',
            auditable: $agentTransaction,
            description: 'Transaksi agen dihapus.',
            before: $before,
        );

        return to_route('agent-transactions.index')->with('success', 'Transaksi agen berhasil dihapus.');
    }

    /**
     * Print receipt view.
     */
    public function printReceipt(AgentTransaction $agentTransaction)
    {
        $agentTransaction->load(['agentTransactionType', 'bankAccount', 'cashier', 'agentAdminBank', 'agentAdminLoket']);
        $storeProfile = \App\Models\Setting::first(); // Wait, let's see how setting profile is read. Usually App\Models\Setting::first(). Let's keep it safe.

        return Inertia::render('Dashboard/AgentTransactions/Print', [
            'transaction' => $agentTransaction,
            'storeProfile' => $storeProfile,
        ]);
    }
}
