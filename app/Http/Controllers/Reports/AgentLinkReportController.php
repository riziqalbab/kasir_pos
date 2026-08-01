<?php

namespace App\Http\Controllers\Reports;

use App\Exports\ArraySheetExport;
use App\Exports\MultiSheetExport;
use App\Http\Controllers\Controller;
use App\Models\AgentTransaction;
use App\Models\AgentTransactionType;
use App\Models\BankAccount;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

class AgentLinkReportController extends Controller
{
    /**
     * Display the agent link (PPOB) report.
     */
    public function index(Request $request)
    {
        $filters = $this->filtersFromRequest($request);

        $baseQuery = $this->applyFilters(AgentTransaction::query(), $filters);

        $transactions = (clone $baseQuery)
            ->with(['agentTransactionType:id,code,name,type', 'bankAccount:id,bank_name,account_name', 'cashier:id,name'])
            ->orderByDesc('transaction_date')
            ->paginate(15)
            ->withQueryString();

        $successQuery = (clone $baseQuery)->where('status', 'success');

        $totals = (clone $successQuery)
            ->selectRaw('
                COUNT(*) as transactions_count,
                COALESCE(SUM(nominal), 0) as total_volume,
                COALESCE(SUM(admin_fee_customer), 0) as total_customer_fees,
                COALESCE(SUM(admin_fee_bank), 0) as total_bank_fees,
                COALESCE(SUM(net_profit), 0) as total_profit
            ')
            ->first();

        $statusCounts = (clone $baseQuery)
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $byType = (clone $successQuery)
            ->join('agent_transaction_types', 'agent_transaction_types.id', '=', 'agent_transactions.agent_transaction_type_id')
            ->selectRaw('
                agent_transaction_types.id,
                agent_transaction_types.code,
                agent_transaction_types.name,
                agent_transaction_types.type,
                COUNT(*) as transactions_count,
                COALESCE(SUM(agent_transactions.nominal), 0) as total_volume,
                COALESCE(SUM(agent_transactions.net_profit), 0) as total_profit
            ')
            ->groupBy('agent_transaction_types.id', 'agent_transaction_types.code', 'agent_transaction_types.name', 'agent_transaction_types.type')
            ->orderByDesc('total_volume')
            ->get();

        $byBankAccount = (clone $successQuery)
            ->whereNotNull('bank_account_id')
            ->join('bank_accounts', 'bank_accounts.id', '=', 'agent_transactions.bank_account_id')
            ->selectRaw('
                bank_accounts.id,
                bank_accounts.bank_name,
                bank_accounts.account_name,
                COUNT(*) as transactions_count,
                COALESCE(SUM(agent_transactions.nominal), 0) as total_volume,
                COALESCE(SUM(agent_transactions.net_profit), 0) as total_profit
            ')
            ->groupBy('bank_accounts.id', 'bank_accounts.bank_name', 'bank_accounts.account_name')
            ->orderByDesc('total_volume')
            ->get();

        $dailyTrend = (clone $successQuery)
            ->selectRaw('
                DATE(transaction_date) as date,
                COUNT(*) as transactions_count,
                COALESCE(SUM(nominal), 0) as total_volume,
                COALESCE(SUM(net_profit), 0) as total_profit
            ')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        $summary = [
            'transactions_count' => (int) ($totals->transactions_count ?? 0),
            'total_volume' => (int) ($totals->total_volume ?? 0),
            'total_customer_fees' => (int) ($totals->total_customer_fees ?? 0),
            'total_bank_fees' => (int) ($totals->total_bank_fees ?? 0),
            'total_profit' => (int) ($totals->total_profit ?? 0),
            'average_profit' => ($totals->transactions_count ?? 0) > 0
                ? (int) round(($totals->total_profit ?? 0) / $totals->transactions_count)
                : 0,
            'pending_count' => (int) ($statusCounts['pending'] ?? 0),
            'failed_count' => (int) ($statusCounts['failed'] ?? 0),
        ];

        return Inertia::render('Dashboard/Reports/AgentLink', [
            'transactions' => $transactions,
            'summary' => $summary,
            'byType' => $byType,
            'byBankAccount' => $byBankAccount,
            'dailyTrend' => $dailyTrend,
            'filters' => $filters,
            'bankAccounts' => BankAccount::active()->ordered()->get(['id', 'bank_name', 'account_name']),
            'transactionTypes' => AgentTransactionType::active()->get(['id', 'code', 'name', 'type']),
        ]);
    }

    /**
     * Export the agent link report to Excel.
     */
    public function export(Request $request)
    {
        $filters = $this->filtersFromRequest($request);

        $baseQuery = $this->applyFilters(AgentTransaction::query(), $filters);
        $successQuery = (clone $baseQuery)->where('status', 'success');

        $totals = (clone $successQuery)
            ->selectRaw('
                COUNT(*) as transactions_count,
                COALESCE(SUM(nominal), 0) as total_volume,
                COALESCE(SUM(admin_fee_customer), 0) as total_customer_fees,
                COALESCE(SUM(admin_fee_bank), 0) as total_bank_fees,
                COALESCE(SUM(net_profit), 0) as total_profit
            ')
            ->first();

        $statusCounts = (clone $baseQuery)
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $summaryRows = [
            ['Total Transaksi Berhasil', (int) ($totals->transactions_count ?? 0)],
            ['Volume (Rp)', (int) ($totals->total_volume ?? 0)],
            ['Fee Customer (Rp)', (int) ($totals->total_customer_fees ?? 0)],
            ['Fee Bank (Rp)', (int) ($totals->total_bank_fees ?? 0)],
            ['Profit Bersih (Rp)', (int) ($totals->total_profit ?? 0)],
            ['Pending', (int) ($statusCounts['pending'] ?? 0)],
            ['Gagal', (int) ($statusCounts['failed'] ?? 0)],
        ];

        $byType = (clone $successQuery)
            ->join('agent_transaction_types', 'agent_transaction_types.id', '=', 'agent_transactions.agent_transaction_type_id')
            ->selectRaw('
                agent_transaction_types.code,
                agent_transaction_types.name,
                COUNT(*) as transactions_count,
                COALESCE(SUM(agent_transactions.nominal), 0) as total_volume,
                COALESCE(SUM(agent_transactions.net_profit), 0) as total_profit
            ')
            ->groupBy('agent_transaction_types.id', 'agent_transaction_types.code', 'agent_transaction_types.name')
            ->orderByDesc('total_volume')
            ->get()
            ->map(fn ($row) => [
                "[{$row->code}] {$row->name}",
                (int) $row->transactions_count,
                (int) $row->total_volume,
                (int) $row->total_profit,
            ])
            ->all();

        $transactionRows = (clone $baseQuery)
            ->with(['agentTransactionType:id,code,name', 'bankAccount:id,bank_name', 'cashier:id,name'])
            ->orderByDesc('transaction_date')
            ->get()
            ->map(fn (AgentTransaction $trx) => [
                optional($trx->transaction_date)->format('Y-m-d H:i'),
                $trx->agentTransactionType ? "[{$trx->agentTransactionType->code}] {$trx->agentTransactionType->name}" : '-',
                $trx->bankAccount?->bank_name ?? '-',
                $trx->cashier?->name ?? '-',
                (int) $trx->nominal,
                (int) $trx->admin_fee_customer,
                (int) $trx->admin_fee_bank,
                (int) $trx->net_profit,
                $trx->status,
            ])
            ->all();

        return Excel::download(new MultiSheetExport([
            new ArraySheetExport('Ringkasan', ['Metrik', 'Nilai'], $summaryRows),
            new ArraySheetExport('Per Tipe Transaksi', ['Tipe', 'Transaksi', 'Volume (Rp)', 'Profit (Rp)'], $byType),
            new ArraySheetExport('Detail Transaksi', [
                'Tanggal', 'Tipe', 'Rekening', 'Kasir', 'Nominal (Rp)', 'Fee Customer (Rp)', 'Fee Bank (Rp)', 'Profit (Rp)', 'Status',
            ], $transactionRows),
        ]), 'laporan-agen-link-'.now()->format('Y-m-d').'.xlsx');
    }

    protected function filtersFromRequest(Request $request): array
    {
        return [
            'start_date' => $request->input('start_date'),
            'end_date' => $request->input('end_date'),
            'type_id' => $request->input('type_id'),
            'bank_account_id' => $request->input('bank_account_id'),
            'status' => $request->input('status'),
        ];
    }

    /**
     * Apply table filters.
     */
    protected function applyFilters($query, array $filters)
    {
        return $query
            ->when($filters['start_date'] ?? null, fn ($q, $start) => $q->whereDate('transaction_date', '>=', $start))
            ->when($filters['end_date'] ?? null, fn ($q, $end) => $q->whereDate('transaction_date', '<=', $end))
            ->when($filters['type_id'] ?? null, fn ($q, $typeId) => $q->where('agent_transaction_type_id', $typeId))
            ->when($filters['bank_account_id'] ?? null, fn ($q, $bankAccountId) => $q->where('bank_account_id', $bankAccountId))
            ->when($filters['status'] ?? null, fn ($q, $status) => $q->where('status', $status));
    }
}
