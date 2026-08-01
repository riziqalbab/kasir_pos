<?php

namespace App\Http\Controllers\Reports;

use App\Exports\ArraySheetExport;
use App\Exports\MultiSheetExport;
use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Profit;
use App\Models\Transaction;
use App\Models\TransactionDetail;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

class SalesReportController extends Controller
{
    /**
     * Display the sales report.
     */
    public function index(Request $request)
    {
        $filters = $this->filtersFromRequest($request);

        $baseListQuery = $this->listQuery($filters);

        $transactions = (clone $baseListQuery)
            ->paginate(10)
            ->withQueryString();

        $summary = $this->buildSummary($filters);

        return Inertia::render('Dashboard/Reports/Sales', [
            'transactions' => $transactions,
            'summary' => $summary,
            'filters' => $filters,
            'cashiers' => User::select('id', 'name')->orderBy('name')->get(),
            'customers' => Customer::select('id', 'name')->orderBy('name')->get(),
        ]);
    }

    /**
     * Export the sales report to Excel.
     */
    public function export(Request $request)
    {
        $filters = $this->filtersFromRequest($request);

        $summary = $this->buildSummary($filters);

        $summaryRows = [
            ['Total Transaksi', $summary['orders_count']],
            ['Pendapatan (Rp)', $summary['revenue_total']],
            ['Pendapatan Barang (Rp)', $summary['revenue_product']],
            ['Pendapatan Jasa (Rp)', $summary['revenue_service']],
            ['Diskon (Rp)', $summary['discount_total']],
            ['Item Terjual', $summary['items_sold']],
            ['Item Barang', $summary['items_product']],
            ['Item Jasa', $summary['items_service']],
            ['Profit (Rp)', $summary['profit_total']],
            ['Profit Barang (Rp)', $summary['profit_product']],
            ['Profit Jasa (Rp)', $summary['profit_service']],
            ['Rata-rata Order (Rp)', $summary['average_order']],
        ];

        $transactionRows = $this->listQuery($filters)
            ->get()
            ->map(fn (Transaction $trx) => [
                $trx->invoice,
                $trx->created_at,
                $trx->customer?->name ?? '-',
                $trx->cashier?->name ?? '-',
                (int) ($trx->total_items ?? 0),
                (int) $trx->grand_total,
                (int) $trx->discount,
                (int) ($trx->total_profit ?? 0),
            ])
            ->all();

        return Excel::download(new MultiSheetExport([
            new ArraySheetExport('Ringkasan', ['Metrik', 'Nilai'], $summaryRows),
            new ArraySheetExport('Detail Transaksi', [
                'Invoice', 'Tanggal', 'Pelanggan', 'Kasir', 'Item', 'Total (Rp)', 'Diskon (Rp)', 'Profit (Rp)',
            ], $transactionRows),
        ]), 'laporan-penjualan-'.now()->format('Y-m-d').'.xlsx');
    }

    protected function filtersFromRequest(Request $request): array
    {
        return [
            'start_date' => $request->input('start_date'),
            'end_date' => $request->input('end_date'),
            'invoice' => $request->input('invoice'),
            'cashier_id' => $request->input('cashier_id'),
            'customer_id' => $request->input('customer_id'),
            'item_type' => $request->input('item_type'),
        ];
    }

    protected function listQuery(array $filters)
    {
        return $this->applyFilters(
            Transaction::query()
                ->with(['cashier:id,name', 'customer:id,name'])
                ->withSum('details as total_items', 'qty')
                ->withSum('profits as total_profit', 'total'),
            $filters
        )->orderByDesc('created_at');
    }

    protected function buildSummary(array $filters): array
    {
        $aggregateQuery = $this->applyFilters(Transaction::query(), $filters);

        $totals = (clone $aggregateQuery)
            ->selectRaw('
                COUNT(*) as orders_count,
                COALESCE(SUM(grand_total), 0) as revenue_total,
                COALESCE(SUM(discount), 0) as discount_total
            ')
            ->first();

        $transactionIds = (clone $aggregateQuery)->pluck('id');

        $itemsSold = $transactionIds->isNotEmpty()
            ? TransactionDetail::whereIn('transaction_id', $transactionIds)->sum('qty')
            : 0;

        $profitTotal = $transactionIds->isNotEmpty()
            ? Profit::whereIn('transaction_id', $transactionIds)->sum('total')
            : 0;

        // Compute breakdowns
        if ($transactionIds->isNotEmpty()) {
            $revenueProduct = (int) TransactionDetail::whereIn('transaction_id', $transactionIds)->whereNotNull('product_id')->sum('price');
            $revenueService = (int) TransactionDetail::whereIn('transaction_id', $transactionIds)->whereNotNull('service_id')->sum('price');

            $profitProduct = (int) Profit::whereIn('transaction_id', $transactionIds)->whereNotNull('product_id')->sum('total');
            $profitService = (int) Profit::whereIn('transaction_id', $transactionIds)->whereNotNull('service_id')->sum('total');

            $itemsProduct = (int) TransactionDetail::whereIn('transaction_id', $transactionIds)->whereNotNull('product_id')->sum('qty');
            $itemsService = (int) TransactionDetail::whereIn('transaction_id', $transactionIds)->whereNotNull('service_id')->sum('qty');
        } else {
            $revenueProduct = $revenueService = 0;
            $profitProduct = $profitService = 0;
            $itemsProduct = $itemsService = 0;
        }

        $itemType = $filters['item_type'] ?? null;
        if ($itemType === 'produk') {
            $displayRevenue = $revenueProduct;
            $displayProfit = $profitProduct;
            $displayItemsSold = $itemsProduct;
        } elseif ($itemType === 'jasa') {
            $displayRevenue = $revenueService;
            $displayProfit = $profitService;
            $displayItemsSold = $itemsService;
        } else {
            $displayRevenue = (int) ($totals->revenue_total ?? 0);
            $displayProfit = (int) $profitTotal;
            $displayItemsSold = (int) $itemsSold;
        }

        return [
            'orders_count' => (int) ($totals->orders_count ?? 0),
            'revenue_total' => $displayRevenue,
            'revenue_product' => $revenueProduct,
            'revenue_service' => $revenueService,
            'discount_total' => (int) ($totals->discount_total ?? 0),
            'items_sold' => $displayItemsSold,
            'items_product' => $itemsProduct,
            'items_service' => $itemsService,
            'profit_total' => $displayProfit,
            'profit_product' => $profitProduct,
            'profit_service' => $profitService,
            'average_order' => ($totals->orders_count ?? 0) > 0
                ? (int) round(($totals->revenue_total ?? 0) / $totals->orders_count)
                : 0,
        ];
    }

    /**
     * Apply table filters.
     */
    protected function applyFilters($query, array $filters)
    {
        return $query
            ->when($filters['invoice'] ?? null, fn ($q, $invoice) => $q->where('invoice', 'like', '%'.$invoice.'%'))
            ->when($filters['cashier_id'] ?? null, fn ($q, $cashier) => $q->where('cashier_id', $cashier))
            ->when($filters['customer_id'] ?? null, fn ($q, $customer) => $q->where('customer_id', $customer))
            ->when($filters['start_date'] ?? null, fn ($q, $start) => $q->whereDate('created_at', '>=', $start))
            ->when($filters['end_date'] ?? null, fn ($q, $end) => $q->whereDate('created_at', '<=', $end))
            ->when($filters['item_type'] ?? null, function ($q, $type) {
                if ($type === 'produk') {
                    return $q->whereHas('details', fn ($query) => $query->whereNotNull('product_id'));
                } elseif ($type === 'jasa') {
                    return $q->whereHas('details', fn ($query) => $query->whereNotNull('service_id'));
                }
            });
    }
}
