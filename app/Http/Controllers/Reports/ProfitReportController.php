<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Profit;
use App\Models\Transaction;
use App\Models\TransactionDetail;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProfitReportController extends Controller
{
    public function index(Request $request)
    {
        $filters = [
            'start_date' => $request->input('start_date'),
            'end_date' => $request->input('end_date'),
            'invoice' => $request->input('invoice'),
            'cashier_id' => $request->input('cashier_id'),
            'customer_id' => $request->input('customer_id'),
            'item_type' => $request->input('item_type'),
        ];

        $baseQuery = $this->applyFilters(
            Transaction::query()
                ->with(['cashier:id,name', 'customer:id,name'])
                ->withSum('profits as total_profit', 'total')
                ->withSum('details as total_items', 'qty'),
            $filters
        )->orderByDesc('created_at');

        $transactions = (clone $baseQuery)
            ->paginate(10)
            ->withQueryString();

        $transactionIds = (clone $baseQuery)->pluck('id');

        $profitTotal = $transactionIds->isNotEmpty()
            ? Profit::whereIn('transaction_id', $transactionIds)->sum('total')
            : 0;

        $revenueTotal = (clone $baseQuery)->sum('grand_total');

        $ordersCount = (clone $baseQuery)->count();

        $itemsSold = $transactionIds->isNotEmpty()
            ? TransactionDetail::whereIn('transaction_id', $transactionIds)->sum('qty')
            : 0;

        $bestTransaction = (clone $baseQuery)->get()->sortByDesc('total_profit')->first();

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
            $displayRevenue = (int) $revenueTotal;
            $displayProfit = (int) $profitTotal;
            $displayItemsSold = (int) $itemsSold;
        }

        $summary = [
            'profit_total' => $displayProfit,
            'profit_product' => $profitProduct,
            'profit_service' => $profitService,
            'revenue_total' => $displayRevenue,
            'revenue_product' => $revenueProduct,
            'revenue_service' => $revenueService,
            'orders_count' => (int) $ordersCount,
            'items_sold' => $displayItemsSold,
            'items_product' => $itemsProduct,
            'items_service' => $itemsService,
            'average_profit' => $ordersCount > 0 ? (int) round($displayProfit / $ordersCount) : 0,
            'margin' => $displayRevenue > 0 ? round(($displayProfit / $displayRevenue) * 100, 2) : 0,
            'best_invoice' => $bestTransaction?->invoice,
            'best_profit' => (int) ($bestTransaction?->total_profit ?? 0),
        ];

        return Inertia::render('Dashboard/Reports/Profit', [
            'transactions' => $transactions,
            'summary' => $summary,
            'filters' => $filters,
            'cashiers' => User::select('id', 'name')->orderBy('name')->get(),
            'customers' => Customer::select('id', 'name')->orderBy('name')->get(),
        ]);
    }

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
