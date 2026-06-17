<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class AdvancedSalesInsightsController extends Controller
{
    public function index(Request $request)
    {
        $filters = [
            'start_date' => $request->input('start_date'),
            'end_date' => $request->input('end_date'),
            'cashier_id' => $request->input('cashier_id'),
            'customer_id' => $request->input('customer_id'),
            'category_id' => $request->input('category_id'),
        ];

        $transactionQuery = $this->applyTransactionFilters(
            Transaction::query(),
            $filters
        );

        $transactionIds = (clone $transactionQuery)->pluck('id');
        $transactionCount = $transactionIds->count();

        $summaryRaw = (clone $transactionQuery)
            ->selectRaw('COUNT(*) as orders_count, COALESCE(SUM(grand_total), 0) as revenue_total, COALESCE(SUM(discount), 0) as manual_discount_total')
            ->first();

        $itemsSold = $transactionIds->isNotEmpty()
            ? DB::table('transaction_details')
                ->whereIn('transaction_id', $transactionIds)
                ->sum('qty')
            : 0;

        $profitTotal = $transactionIds->isNotEmpty()
            ? DB::table('profits')
                ->whereIn('transaction_id', $transactionIds)
                ->sum('total')
            : 0;

        $topSellingProducts = $this->topSellingProducts($filters);
        $lowPerformingProducts = $this->lowPerformingProducts($filters);
        $marginByProduct = $this->marginByProduct($filters);
        $marginByCategory = $this->marginByCategory($filters);
        $salesByHour = $this->salesByHour($filters);
        $salesByDay = $this->salesByDay($filters);
        $cashierPerformance = $this->cashierPerformance($filters);
        $repeatCustomerMetrics = $this->repeatCustomerMetrics($filters);
        $stockCoverage = $this->stockCoverageAnalysis($filters);
        $promoMonitor = $this->promoMonitor();
        $loyaltyPerformance = $this->loyaltyPerformance($filters);
        $crmOperations = $this->crmOperations($filters);

        return Inertia::render('Dashboard/Reports/Insights', [
            'filters' => $filters,
            'cashiers' => User::select('id', 'name')->orderBy('name')->get(),
            'customers' => Customer::select('id', 'name')->orderBy('name')->get(),
            'categories' => Category::select('id', 'name')->orderBy('name')->get(),
            'summary' => [
                'orders_count' => (int) ($summaryRaw->orders_count ?? 0),
                'revenue_total' => (int) ($summaryRaw->revenue_total ?? 0),
                'manual_discount_total' => (int) ($summaryRaw->manual_discount_total ?? 0),
                'items_sold' => (int) $itemsSold,
                'profit_total' => (int) $profitTotal,
                'average_order' => $transactionCount > 0
                    ? (int) round(($summaryRaw->revenue_total ?? 0) / $transactionCount)
                    : 0,
            ],
            'salesByHour' => $salesByHour,
            'salesByDay' => $salesByDay,
            'topSellingProducts' => $topSellingProducts,
            'lowPerformingProducts' => $lowPerformingProducts,
            'marginByProduct' => $marginByProduct,
            'marginByCategory' => $marginByCategory,
            'cashierPerformance' => $cashierPerformance,
            'repeatCustomerMetrics' => $repeatCustomerMetrics,
            'stockCoverage' => $stockCoverage,
            'promoMonitor' => $promoMonitor,
            'loyaltyPerformance' => $loyaltyPerformance,
            'crmOperations' => $crmOperations,
        ]);
    }

    protected function applyTransactionFilters(Builder $query, array $filters): Builder
    {
        return $query
            ->when($filters['cashier_id'] ?? null, fn (Builder $q, $cashierId) => $q->where('transactions.cashier_id', $cashierId))
            ->when($filters['customer_id'] ?? null, fn (Builder $q, $customerId) => $q->where('transactions.customer_id', $customerId))
            ->when($filters['start_date'] ?? null, fn (Builder $q, $startDate) => $q->whereDate('transactions.created_at', '>=', $startDate))
            ->when($filters['end_date'] ?? null, fn (Builder $q, $endDate) => $q->whereDate('transactions.created_at', '<=', $endDate))
            ->when($filters['category_id'] ?? null, function (Builder $q, $categoryId) {
                $q->whereHas('details.product', fn (Builder $productQuery) => $productQuery->where('category_id', $categoryId));
            });
    }

    protected function detailMetricsQuery(array $filters)
    {
        return DB::table('transaction_details as td')
            ->join('transactions as t', 't.id', '=', 'td.transaction_id')
            ->join('products as p', 'p.id', '=', 'td.product_id')
            ->leftJoin('categories as c', 'c.id', '=', 'p.category_id')
            ->when($filters['cashier_id'] ?? null, fn ($q, $cashierId) => $q->where('t.cashier_id', $cashierId))
            ->when($filters['customer_id'] ?? null, fn ($q, $customerId) => $q->where('t.customer_id', $customerId))
            ->when($filters['start_date'] ?? null, fn ($q, $startDate) => $q->whereDate('t.created_at', '>=', $startDate))
            ->when($filters['end_date'] ?? null, fn ($q, $endDate) => $q->whereDate('t.created_at', '<=', $endDate))
            ->when($filters['category_id'] ?? null, fn ($q, $categoryId) => $q->where('p.category_id', $categoryId));
    }

    protected function topSellingProducts(array $filters): array
    {
        return $this->detailMetricsQuery($filters)
            ->selectRaw('
                td.product_id,
                p.title as product_title,
                p.sku as product_sku,
                c.name as category_name,
                p.stock as current_stock,
                SUM(td.qty) as qty_sold,
                SUM(td.price) as revenue_total,
                SUM((td.price - ROUND((COALESCE(t.discount, 0) * td.price) / NULLIF(tx.subtotal_after_promo, 0))) - (p.buy_price * td.qty)) as profit_total,
                MAX(t.created_at) as last_sold_at
            ')
            ->joinSub(
                DB::table('transaction_details')
                    ->selectRaw('transaction_id, SUM(price) as subtotal_after_promo')
                    ->groupBy('transaction_id'),
                'tx',
                fn ($join) => $join->on('tx.transaction_id', '=', 'td.transaction_id')
            )
            ->groupBy('td.product_id', 'p.title', 'p.sku', 'c.name', 'p.stock')
            ->orderByDesc('qty_sold')
            ->orderByDesc('revenue_total')
            ->limit(10)
            ->get()
            ->map(fn ($row) => [
                'product_id' => (int) $row->product_id,
                'product_title' => $row->product_title,
                'product_sku' => $row->product_sku,
                'category_name' => $row->category_name,
                'current_stock' => (int) $row->current_stock,
                'qty_sold' => (int) $row->qty_sold,
                'revenue_total' => (int) round($row->revenue_total),
                'profit_total' => (int) round($row->profit_total),
                'last_sold_at' => $row->last_sold_at ? Carbon::parse($row->last_sold_at)->toIso8601String() : null,
            ])
            ->all();
    }

    protected function lowPerformingProducts(array $filters): array
    {
        $salesSubquery = $this->detailMetricsQuery($filters)
            ->selectRaw('
                td.product_id,
                SUM(td.qty) as qty_sold,
                SUM(td.price) as revenue_total,
                SUM((td.price - ROUND((COALESCE(t.discount, 0) * td.price) / NULLIF(tx.subtotal_after_promo, 0))) - (p.buy_price * td.qty)) as profit_total,
                MAX(t.created_at) as last_sold_at
            ')
            ->joinSub(
                DB::table('transaction_details')
                    ->selectRaw('transaction_id, SUM(price) as subtotal_after_promo')
                    ->groupBy('transaction_id'),
                'tx',
                fn ($join) => $join->on('tx.transaction_id', '=', 'td.transaction_id')
            )
            ->groupBy('td.product_id');

        return Product::query()
            ->leftJoinSub($salesSubquery, 'sales', fn ($join) => $join->on('sales.product_id', '=', 'products.id'))
            ->leftJoin('categories', 'categories.id', '=', 'products.category_id')
            ->when($filters['category_id'] ?? null, fn ($q, $categoryId) => $q->where('products.category_id', $categoryId))
            ->where('products.stock', '>', 0)
            ->selectRaw('
                products.id as product_id,
                products.title as product_title,
                products.sku as product_sku,
                categories.name as category_name,
                products.stock as current_stock,
                COALESCE(sales.qty_sold, 0) as qty_sold,
                COALESCE(sales.revenue_total, 0) as revenue_total,
                COALESCE(sales.profit_total, 0) as profit_total,
                sales.last_sold_at as last_sold_at
            ')
            ->orderBy('qty_sold')
            ->orderBy('revenue_total')
            ->orderByDesc('products.stock')
            ->limit(10)
            ->get()
            ->map(fn ($row) => [
                'product_id' => (int) $row->product_id,
                'product_title' => $row->product_title,
                'product_sku' => $row->product_sku,
                'category_name' => $row->category_name,
                'current_stock' => (int) $row->current_stock,
                'qty_sold' => (int) $row->qty_sold,
                'revenue_total' => (int) round($row->revenue_total),
                'profit_total' => (int) round($row->profit_total),
                'last_sold_at' => $row->last_sold_at ? Carbon::parse($row->last_sold_at)->toIso8601String() : null,
            ])
            ->all();
    }

    protected function marginByProduct(array $filters): array
    {
        return $this->detailMetricsQuery($filters)
            ->selectRaw('
                td.product_id,
                p.title as product_title,
                c.name as category_name,
                SUM(td.qty) as qty_sold,
                SUM(td.price) as revenue_total,
                SUM((td.price - ROUND((COALESCE(t.discount, 0) * td.price) / NULLIF(tx.subtotal_after_promo, 0))) - (p.buy_price * td.qty)) as profit_total
            ')
            ->joinSub(
                DB::table('transaction_details')
                    ->selectRaw('transaction_id, SUM(price) as subtotal_after_promo')
                    ->groupBy('transaction_id'),
                'tx',
                fn ($join) => $join->on('tx.transaction_id', '=', 'td.transaction_id')
            )
            ->groupBy('td.product_id', 'p.title', 'c.name')
            ->orderByDesc('profit_total')
            ->limit(10)
            ->get()
            ->map(fn ($row) => [
                'product_id' => (int) $row->product_id,
                'product_title' => $row->product_title,
                'category_name' => $row->category_name,
                'qty_sold' => (int) $row->qty_sold,
                'revenue_total' => (int) round($row->revenue_total),
                'profit_total' => (int) round($row->profit_total),
                'margin_percentage' => (float) ($row->revenue_total > 0
                    ? round(($row->profit_total / $row->revenue_total) * 100, 2)
                    : 0),
            ])
            ->all();
    }

    protected function marginByCategory(array $filters): array
    {
        return $this->detailMetricsQuery($filters)
            ->selectRaw('
                p.category_id,
                COALESCE(c.name, \'Tanpa Kategori\') as category_name,
                SUM(td.qty) as qty_sold,
                SUM(td.price) as revenue_total,
                SUM((td.price - ROUND((COALESCE(t.discount, 0) * td.price) / NULLIF(tx.subtotal_after_promo, 0))) - (p.buy_price * td.qty)) as profit_total
            ')
            ->joinSub(
                DB::table('transaction_details')
                    ->selectRaw('transaction_id, SUM(price) as subtotal_after_promo')
                    ->groupBy('transaction_id'),
                'tx',
                fn ($join) => $join->on('tx.transaction_id', '=', 'td.transaction_id')
            )
            ->groupBy('p.category_id', 'c.name')
            ->orderByDesc('profit_total')
            ->get()
            ->map(fn ($row) => [
                'category_id' => $row->category_id ? (int) $row->category_id : null,
                'category_name' => $row->category_name,
                'qty_sold' => (int) $row->qty_sold,
                'revenue_total' => (int) round($row->revenue_total),
                'profit_total' => (int) round($row->profit_total),
                'margin_percentage' => (float) ($row->revenue_total > 0
                    ? round(($row->profit_total / $row->revenue_total) * 100, 2)
                    : 0),
            ])
            ->all();
    }

    protected function salesByHour(array $filters): array
    {
        $hourExpression = $this->hourBucketExpression();

        $rows = $this->applyTransactionFilters(Transaction::query(), $filters)
            ->selectRaw("{$hourExpression} as hour_bucket, COUNT(*) as orders_count, COALESCE(SUM(grand_total), 0) as revenue_total")
            ->groupBy(DB::raw($hourExpression))
            ->orderBy(DB::raw($hourExpression))
            ->get()
            ->keyBy(fn ($row) => (int) $row->hour_bucket);

        return collect(range(0, 23))
            ->map(function (int $hour) use ($rows) {
                $row = $rows->get($hour);

                return [
                    'hour' => $hour,
                    'label' => sprintf('%02d:00', $hour),
                    'orders_count' => (int) ($row->orders_count ?? 0),
                    'revenue_total' => (int) round($row->revenue_total ?? 0),
                ];
            })
            ->all();
    }

    protected function salesByDay(array $filters): array
    {
        return $this->applyTransactionFilters(Transaction::query(), $filters)
            ->selectRaw('DATE(created_at) as sales_date, COUNT(*) as orders_count, COALESCE(SUM(grand_total), 0) as revenue_total')
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy(DB::raw('DATE(created_at)'))
            ->get()
            ->map(fn ($row) => [
                'date' => $row->sales_date,
                'label' => Carbon::parse($row->sales_date)->format('d M'),
                'orders_count' => (int) $row->orders_count,
                'revenue_total' => (int) round($row->revenue_total),
            ])
            ->all();
    }

    protected function cashierPerformance(array $filters): array
    {
        $transactionsByCashier = $this->applyTransactionFilters(Transaction::query(), $filters)
            ->selectRaw('cashier_id, COUNT(*) as orders_count, COALESCE(SUM(grand_total), 0) as revenue_total')
            ->groupBy('cashier_id');

        $itemsByCashier = $this->detailMetricsQuery($filters)
            ->selectRaw('t.cashier_id, COALESCE(SUM(td.qty), 0) as items_sold')
            ->groupBy('t.cashier_id');

        $profitByCashier = $this->applyTransactionFilters(Transaction::query(), $filters)
            ->join('profits', 'profits.transaction_id', '=', 'transactions.id')
            ->selectRaw('transactions.cashier_id, COALESCE(SUM(profits.total), 0) as profit_total')
            ->groupBy('transactions.cashier_id');

        return DB::query()
            ->fromSub($transactionsByCashier, 'tx')
            ->leftJoinSub($itemsByCashier, 'items', fn ($join) => $join->on('items.cashier_id', '=', 'tx.cashier_id'))
            ->leftJoinSub($profitByCashier, 'profits', fn ($join) => $join->on('profits.cashier_id', '=', 'tx.cashier_id'))
            ->leftJoin('users', 'users.id', '=', 'tx.cashier_id')
            ->selectRaw('
                tx.cashier_id,
                users.name as cashier_name,
                tx.orders_count,
                tx.revenue_total,
                COALESCE(items.items_sold, 0) as items_sold,
                COALESCE(profits.profit_total, 0) as profit_total
            ')
            ->orderByDesc('items_sold')
            ->orderByDesc('revenue_total')
            ->get()
            ->map(fn ($row) => [
                'cashier_id' => (int) $row->cashier_id,
                'cashier_name' => $row->cashier_name,
                'orders_count' => (int) $row->orders_count,
                'items_sold' => (int) $row->items_sold,
                'revenue_total' => (int) round($row->revenue_total),
                'profit_total' => (int) round($row->profit_total),
                'average_basket' => (int) ($row->orders_count > 0
                    ? round($row->revenue_total / $row->orders_count)
                    : 0),
            ])
            ->all();
    }

    protected function repeatCustomerMetrics(array $filters): array
    {
        $rows = $this->applyTransactionFilters(Transaction::query(), $filters)
            ->whereNotNull('transactions.customer_id')
            ->leftJoin('customers', 'customers.id', '=', 'transactions.customer_id')
            ->selectRaw('
                transactions.customer_id,
                customers.name as customer_name,
                COUNT(transactions.id) as orders_count,
                COALESCE(SUM(transactions.grand_total), 0) as revenue_total,
                MAX(transactions.created_at) as last_purchase_at
            ')
            ->groupBy(
                'transactions.customer_id',
                'customers.name'
            )
            ->get()
            ->map(fn ($row) => [
                'customer_id' => (int) $row->customer_id,
                'customer_name' => $row->customer_name,
                'is_loyalty_member' => false,
                'loyalty_tier' => null,
                'orders_count' => (int) $row->orders_count,
                'revenue_total' => (int) round($row->revenue_total),
                'average_basket' => (int) ($row->orders_count > 0
                    ? round($row->revenue_total / $row->orders_count)
                    : 0),
                'last_purchase_at' => $row->last_purchase_at
                    ? Carbon::parse($row->last_purchase_at)->toIso8601String()
                    : null,
            ]);

        $activeCustomers = $rows->count();
        $repeatCustomers = $rows->filter(fn (array $row) => $row['orders_count'] > 1)->values();
        $newCustomers = $rows->filter(fn (array $row) => $row['orders_count'] === 1)->values();
        $repeatRevenue = $repeatCustomers->sum('revenue_total');

        return [
            'summary' => [
                'active_customers' => $activeCustomers,
                'repeat_customers' => $repeatCustomers->count(),
                'new_customers' => $newCustomers->count(),
                'repeat_rate' => $activeCustomers > 0
                    ? round(($repeatCustomers->count() / $activeCustomers) * 100, 2)
                    : 0,
                'repeat_revenue_total' => (int) $repeatRevenue,
            ],
            'top_customers' => $repeatCustomers
                ->sortByDesc(fn (array $row) => [$row['orders_count'], $row['revenue_total']])
                ->take(10)
                ->values()
                ->all(),
        ];
    }

    protected function stockCoverageAnalysis(array $filters): array
    {
        $windowDays = $this->salesWindowDays($filters);

        $salesSubquery = $this->detailMetricsQuery($filters)
            ->selectRaw('
                td.product_id,
                SUM(td.qty) as qty_sold,
                SUM(td.price) as revenue_total,
                MAX(t.created_at) as last_sold_at
            ')
            ->groupBy('td.product_id');

        $rows = Product::query()
            ->leftJoinSub($salesSubquery, 'sales', fn ($join) => $join->on('sales.product_id', '=', 'products.id'))
            ->leftJoin('categories', 'categories.id', '=', 'products.category_id')
            ->when($filters['category_id'] ?? null, fn ($q, $categoryId) => $q->where('products.category_id', $categoryId))
            ->where('products.stock', '>', 0)
            ->selectRaw('
                products.id as product_id,
                products.title as product_title,
                products.sku as product_sku,
                categories.name as category_name,
                products.stock as current_stock,
                COALESCE(sales.qty_sold, 0) as qty_sold,
                COALESCE(sales.revenue_total, 0) as revenue_total,
                sales.last_sold_at as last_sold_at
            ')
            ->get()
            ->map(function ($row) use ($windowDays) {
                $qtySold = (int) $row->qty_sold;
                $currentStock = (int) $row->current_stock;
                $averageDailyQty = $windowDays > 0 ? round($qtySold / $windowDays, 2) : 0;
                $coverageDays = $averageDailyQty > 0
                    ? round($currentStock / $averageDailyQty, 1)
                    : null;

                return [
                    'product_id' => (int) $row->product_id,
                    'product_title' => $row->product_title,
                    'product_sku' => $row->product_sku,
                    'category_name' => $row->category_name,
                    'current_stock' => $currentStock,
                    'qty_sold' => $qtySold,
                    'revenue_total' => (int) round($row->revenue_total),
                    'average_daily_qty' => $averageDailyQty,
                    'coverage_days' => $coverageDays,
                    'coverage_status' => $this->coverageStatus($currentStock, $qtySold, $coverageDays),
                    'last_sold_at' => $row->last_sold_at
                        ? Carbon::parse($row->last_sold_at)->toIso8601String()
                        : null,
                ];
            });

        $summaryCounts = [
            'critical' => $rows->where('coverage_status', 'critical')->count(),
            'low' => $rows->where('coverage_status', 'low')->count(),
            'healthy' => $rows->where('coverage_status', 'healthy')->count(),
            'no_movement' => $rows->where('coverage_status', 'no_movement')->count(),
        ];

        $sortedRows = $rows
            ->sort(function (array $a, array $b) {
                $statusPriority = [
                    'critical' => 0,
                    'low' => 1,
                    'healthy' => 2,
                    'no_movement' => 3,
                ];

                $statusComparison = ($statusPriority[$a['coverage_status']] ?? 99)
                    <=> ($statusPriority[$b['coverage_status']] ?? 99);

                if ($statusComparison !== 0) {
                    return $statusComparison;
                }

                return ($a['coverage_days'] ?? INF) <=> ($b['coverage_days'] ?? INF);
            })
            ->take(10)
            ->values();

        return [
            'summary' => [
                'window_days' => $windowDays,
                ...$summaryCounts,
            ],
            'products' => $sortedRows->all(),
        ];
    }

    protected function salesWindowDays(array $filters): int
    {
        if (($filters['start_date'] ?? null) && ($filters['end_date'] ?? null)) {
            $start = Carbon::parse($filters['start_date']);
            $end = Carbon::parse($filters['end_date']);

            return max(1, $start->diffInDays($end) + 1);
        }

        $range = $this->applyTransactionFilters(Transaction::query(), $filters)
            ->selectRaw('MIN(transactions.created_at) as min_date, MAX(transactions.created_at) as max_date')
            ->first();

        if (! $range?->min_date || ! $range?->max_date) {
            return 30;
        }

        return max(
            1,
            Carbon::parse($range->min_date)->diffInDays(Carbon::parse($range->max_date)) + 1
        );
    }

    protected function coverageStatus(int $currentStock, int $qtySold, ?float $coverageDays): string
    {
        if ($currentStock <= 0) {
            return 'out_of_stock';
        }

        if ($qtySold <= 0 || $coverageDays === null) {
            return 'no_movement';
        }

        if ($coverageDays <= 7) {
            return 'critical';
        }

        if ($coverageDays <= 30) {
            return 'low';
        }

        return 'healthy';
    }

    protected function promoMonitor(): array
    {
        return [
            'summary' => [
                'active' => 0,
                'scheduled' => 0,
                'expired' => 0,
                'inactive' => 0,
                'by_kind' => [
                    'standard_discount' => 0,
                    'qty_break' => 0,
                    'bundle_price' => 0,
                    'buy_x_get_y' => 0,
                ],
            ],
            'active_rules' => [],
            'scheduled_rules' => [],
            'recent_audits' => [],
        ];
    }

    protected function loyaltyPerformance(array $filters): array
    {
        return [
            'summary' => [
                'total_members' => 0,
                'points_balance_total' => 0,
                'points_earned' => 0,
                'points_redeemed' => 0,
                'voucher_discount_total' => 0,
                'tier_distribution' => [
                    'regular' => 0,
                    'silver' => 0,
                    'gold' => 0,
                    'platinum' => 0,
                ],
                'voucher_summary' => [
                    'active' => 0,
                    'scheduled' => 0,
                    'expired' => 0,
                    'used' => 0,
                    'inactive' => 0,
                ],
            ],
            'top_members' => [],
        ];
    }

    protected function crmOperations(array $filters): array
    {
        return [
            'summary' => [
                'segments_total' => 0,
                'segments_manual' => 0,
                'segments_auto' => 0,
                'segments_active' => 0,
                'memberships_total' => 0,
                'campaigns_total' => 0,
                'campaigns_draft' => 0,
                'campaigns_ready' => 0,
                'campaigns_processed' => 0,
                'campaigns_cancelled' => 0,
                'queue_pending' => 0,
                'queue_ready_to_send' => 0,
                'queue_sent' => 0,
                'queue_skipped' => 0,
            ],
            'recent_campaigns' => [],
        ];
    }

    protected function applyDateRangeFilter($query, string $column, array $filters): void
    {
        if ($filters['start_date'] ?? null) {
            $query->whereDate($column, '>=', $filters['start_date']);
        }

        if ($filters['end_date'] ?? null) {
            $query->whereDate($column, '<=', $filters['end_date']);
        }
    }



    protected function hourBucketExpression(): string
    {
        return DB::connection()->getDriverName() === 'sqlite'
            ? "CAST(strftime('%H', created_at) AS INTEGER)"
            : 'HOUR(created_at)';
    }
}
