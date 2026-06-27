<?php

namespace App\Http\Controllers\Apps;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\LoyaltyPointHistory;
use App\Models\PointPrize;
use App\Models\PointRedemption;
use App\Models\PointRedemptionItem;
use App\Models\Setting;
use App\Services\AuditLogService;
use App\Services\CashierShiftService;
use App\Services\StockMutationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class PointRedemptionController extends Controller
{
    public function __construct(
        private readonly CashierShiftService $cashierShiftService,
        private readonly AuditLogService $auditLogService,
        private readonly StockMutationService $stockMutationService
    ) {}

    /**
     * Store a newly created point redemption in storage.
     */
    public function store(Request $request)
    {
        $userId = $request->user()->id;
        $activeShift = $this->cashierShiftService->requireActiveShiftForUser($userId);

        $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'items' => 'required|array|min:1',
            'items.*.point_prize_id' => 'required|exists:point_prizes,id',
            'items.*.quantity' => 'required|integer|min:1',
            'notes' => 'nullable|string',
        ]);

        $customer = Customer::findOrFail($request->customer_id);

        // Calculate total points required and check stock
        $totalPointsRequired = 0;
        $itemsToProcess = [];

        foreach ($request->items as $itemData) {
            $prize = PointPrize::with('product')->findOrFail($itemData['point_prize_id']);
            $qty = (int) $itemData['quantity'];

            if ($prize->product->stock < $qty) {
                return back()->withErrors([
                    'items' => "Stok untuk hadiah '{$prize->product->title}' tidak mencukupi (Stok: {$prize->product->stock}).",
                ]);
            }

            $subtotalPoints = $prize->points_required * $qty;
            $totalPointsRequired += $subtotalPoints;

            $itemsToProcess[] = [
                'prize' => $prize,
                'qty' => $qty,
                'points_per_item' => $prize->points_required,
                'subtotal_points' => $subtotalPoints,
            ];
        }

        // Check customer points balance
        if ($customer->loyalty_points < $totalPointsRequired) {
            return back()->withErrors([
                'customer_id' => "Poin pelanggan tidak mencukupi. Saldo saat ini: {$customer->loyalty_points} poin. Dibutuhkan: {$totalPointsRequired} poin.",
            ]);
        }

        // Generate redemption code PR-YYYYMMDD-XXXX
        $today = now()->format('Ymd');
        $count = PointRedemption::whereDate('created_at', now()->toDateString())->count();
        $sequence = str_pad($count + 1, 4, '0', STR_PAD_LEFT);
        $redemptionCode = 'PR-'.$today.'-'.$sequence;

        $redemption = DB::transaction(function () use ($customer, $redemptionCode, $totalPointsRequired, $itemsToProcess, $userId, $activeShift, $request) {
            // 1. Deduct customer points
            $customer->decrement('loyalty_points', $totalPointsRequired);

            // 2. Create point redemption transaction
            $redemption = PointRedemption::create([
                'redemption_code' => $redemptionCode,
                'customer_id' => $customer->id,
                'user_id' => $userId,
                'cashier_shift_id' => $activeShift->id,
                'total_points' => $totalPointsRequired,
                'notes' => $request->notes,
            ]);

            // 3. Create items & deduct prize stock
            $prizesNames = [];
            foreach ($itemsToProcess as $proc) {
                $prize = $proc['prize'];
                $qty = $proc['qty'];
                $product = $prize->product;

                $stockBefore = $product->stock;
                $product->decrement('stock', $qty);
                $stockAfter = $product->stock;

                // Log stock mutation
                $this->stockMutationService->recordPointRedemption(
                    $product,
                    $redemption,
                    $qty,
                    $stockBefore,
                    $stockAfter,
                    $userId
                );

                PointRedemptionItem::create([
                    'point_redemption_id' => $redemption->id,
                    'point_prize_id' => $prize->id,
                    'quantity' => $qty,
                    'points' => $proc['points_per_item'],
                ]);

                $prizesNames[] = "{$product->title} x{$qty}";
            }

            // 4. Create loyalty point history log (deduction)
            LoyaltyPointHistory::create([
                'customer_id' => $customer->id,
                'transaction_id' => null, // Not a normal sales transaction
                'type' => 'redeem',
                'points_delta' => -$totalPointsRequired,
                'balance_after' => $customer->loyalty_points,
                'amount_delta' => 0,
                'reference' => $redemptionCode,
                'notes' => 'Tukar poin dengan hadiah: '.implode(', ', $prizesNames),
            ]);

            return $redemption;
        });

        // 5. Audit Log
        $this->auditLogService->log(
            event: 'point_redemption.created',
            module: 'loyalty',
            auditable: $redemption,
            description: "Penukaran poin pelanggan '{$customer->name}' berhasil dicatat. Total poin ditukar: {$totalPointsRequired}.",
            after: $redemption->toArray()
        );

        return back()->with('success', 'Penukaran poin berhasil disimpan.');
    }

    /**
     * Print receipt view for point redemption.
     */
    public function printReceipt(PointRedemption $pointRedemption)
    {
        $pointRedemption->load(['customer', 'cashier', 'items.pointPrize']);
        $storeProfile = Setting::first();

        return Inertia::render('Dashboard/PointRedemptions/Print', [
            'redemption' => $pointRedemption,
            'storeProfile' => $storeProfile,
        ]);
    }
}
