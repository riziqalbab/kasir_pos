<?php

namespace App\Http\Controllers\Apps;

use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Receivable;
use App\Models\Transaction;
use App\Models\Service;
use App\Models\ServicePrice;
use App\Services\AuditLogService;
use App\Services\CashierShiftService;
use App\Services\PricingService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Inertia\Inertia;

class TransactionController extends Controller
{
    public function __construct(
        private readonly CashierShiftService $cashierShiftService,
        private readonly AuditLogService $auditLogService,
        private readonly PricingService $pricingService
    ) {}

    /**
     * index
     *
     * @param  \Illuminate\Http\Request  $request
     * @return void
     */
    public function index(Request $request)
    {
        $userId = auth()->user()->id;
        $activeShift = $this->cashierShiftService->getActiveShiftForUser($userId);

        // Get active cart items (not held)
        $carts = Cart::with(['product', 'service.servicePrices.unit'])
            ->where('cashier_id', $userId)
            ->active()
            ->latest()
            ->get();

        $initialPricingPreview = $this->previewCheckout(
            $this->pricingService->previewCart($carts, null)
        );

        // Get held carts grouped by hold_id
        $heldCarts = Cart::with(['product:id,title,sell_price,image', 'service.servicePrices.unit'])
            ->where('cashier_id', $userId)
            ->held()
            ->get()
            ->groupBy('hold_id')
            ->map(function ($items, $holdId) {
                $first = $items->first();

                return [
                    'hold_id' => $holdId,
                    'label' => $first->hold_label,
                    'held_at' => $first->held_at?->toISOString(),
                    'items_count' => $items->sum('qty'),
                    'total' => $items->sum('price'),
                ];
            })
            ->values();

        // get all customers
        $customers = Customer::latest()->get();

        // get all products with categories for product grid
        $products = Product::with('category:id,name')
            ->select('id', 'barcode', 'title', 'description', 'image', 'buy_price', 'sell_price', 'stock', 'category_id')
            ->where('stock', '>', 0)
            ->orderBy('title')
            ->get();
        $pricingBadges = $this->pricingService->previewProducts($products, null);
        $products = $products->map(function (Product $product) use ($pricingBadges) {
            $pricing = $pricingBadges->get($product->id);

            return [
                ...$product->toArray(),
                'pricing_badge' => $pricing && ! empty($pricing['pricing_rule']) ? [
                    'label' => $pricing['pricing_rule']['label'],
                    'promo_price' => $pricing['pricing_rule']['price_context']
                        ? $pricing['effective_unit_price']
                        : null,
                    'base_price' => $pricing['base_unit_price'],
                    'kind' => $pricing['pricing_rule']['kind'],
                ] : null,
            ];
        });

        // get all categories
        $categories = \App\Models\Category::select('id', 'name', 'image')
            ->orderBy('name')
            ->get();

        $carts_total = 0;
        foreach ($carts as $cart) {
            $carts_total += $cart->price;
        }

        $paymentGateways = [];
        if (\App\Models\BankAccount::active()->exists()) {
            $paymentGateways[] = [
                'value' => 'bank_transfer',
                'label' => 'Transfer Bank',
                'description' => 'Pembayaran manual via transfer bank.',
            ];
        }

        $paymentGateways[] = [
            'value' => 'debit_credit',
            'label' => 'Debit / Kredit',
            'description' => 'Pembayaran via kartu debit atau kredit.',
        ];

        $paymentGateways[] = [
            'value' => 'qris',
            'label' => 'QRIS',
            'description' => 'Pembayaran QRIS.',
        ];

        $defaultGateway = 'cash';

        // Get active bank accounts for bank transfer
        $bankAccounts = \App\Models\BankAccount::active()->ordered()->get();

        // Agent Transactions data (for Unified POS Agen Link mode)
        $agentFilters = [
            'search' => $request->input('search'),
            'start_date' => $request->input('start_date'),
            'end_date' => $request->input('end_date'),
            'type_id' => $request->input('type_id'),
            'bank_account_id' => $request->input('bank_account_id'),
            'status' => $request->input('status'),
        ];

        $agentQuery = \App\Models\AgentTransaction::query()
            ->with(['agentTransactionType', 'bankAccount', 'cashier:id,name', 'agentAdminBank', 'agentAdminLoket'])
            ->when($agentFilters['search'], function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('customer_name', 'like', "%{$search}%")
                        ->orWhere('customer_phone', 'like', "%{$search}%")
                        ->orWhere('reference_number', 'like', "%{$search}%")
                        ->orWhere('notes', 'like', "%{$search}%");
                });
            })
            ->when($agentFilters['start_date'], function ($query, $startDate) {
                $query->whereDate('transaction_date', '>=', $startDate);
            })
            ->when($agentFilters['end_date'], function ($query, $endDate) {
                $query->whereDate('transaction_date', '<=', $endDate);
            })
            ->when($agentFilters['type_id'], function ($query, $typeId) {
                $query->where('agent_transaction_type_id', $typeId);
            })
            ->when($agentFilters['bank_account_id'], function ($query, $bankAccountId) {
                $query->where('bank_account_id', $bankAccountId);
            })
            ->when($agentFilters['status'], function ($query, $status) {
                $query->where('status', $status);
            });

        $statsQuery = clone $agentQuery;
        $stats = $statsQuery->selectRaw('
            COALESCE(SUM(CASE WHEN status = "success" THEN nominal ELSE 0 END), 0) as total_volume,
            COALESCE(SUM(CASE WHEN status = "success" THEN admin_fee_customer ELSE 0 END), 0) as total_customer_fees,
            COALESCE(SUM(CASE WHEN status = "success" THEN admin_fee_bank ELSE 0 END), 0) as total_bank_fees,
            COALESCE(SUM(CASE WHEN status = "success" THEN net_profit ELSE 0 END), 0) as total_profit
        ')->first();

        $agentTransactions = $agentQuery->latest('transaction_date')
            ->paginate(15)
            ->withQueryString();

        $transactionTypes = \App\Models\AgentTransactionType::active()->get();
        $agentAdminBanks = \App\Models\AgentAdminBank::oldest('code')->get();
        $agentAdminLokets = \App\Models\AgentAdminLoket::oldest('code')->get();

        return Inertia::render('Dashboard/Transactions/Index', [
            'carts' => $carts,
            'carts_total' => $carts_total,
            'heldCarts' => $heldCarts,
            'customers' => $customers,
            'products' => $products,
            'services' => \App\Models\Service::with('servicePrices.unit')->get(),
            'categories' => $categories,
            'initialPricingPreview' => $initialPricingPreview,
            'paymentGateways' => $paymentGateways,
            'defaultPaymentGateway' => $defaultGateway,
            'bankAccounts' => $bankAccounts,
            'shiftSummary' => $this->cashierShiftService->summarizeForDisplay($activeShift),
            // Agent Link Props
            'agentTransactions' => $agentTransactions,
            'agentFilters' => $agentFilters,
            'agentStats' => [
                'total_volume' => (int) $stats->total_volume,
                'total_customer_fees' => (int) $stats->total_customer_fees,
                'total_bank_fees' => (int) $stats->total_bank_fees,
                'total_profit' => (int) $stats->total_profit,
            ],
            'agentTransactionTypes' => $transactionTypes,
            'agentAdminBanks' => $agentAdminBanks,
            'agentAdminLokets' => $agentAdminLokets,
        ]);
    }

    /**
     * searchProduct
     *
     * @param  mixed  $request
     * @return void
     */
    public function searchProduct(Request $request)
    {
        // find product by barcode
        $product = Product::where('barcode', $request->barcode)->first();

        if ($product) {
            return response()->json([
                'success' => true,
                'data' => $product,
            ]);
        }

        return response()->json([
            'success' => false,
            'data' => null,
        ]);
    }

    public function previewPricing(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_id' => ['nullable', 'exists:customers,id'],
            'discount' => ['nullable', 'integer', 'min:0'],
            'shipping_cost' => ['nullable', 'integer', 'min:0'],
            'redeem_points' => ['nullable', 'integer', 'min:0'],
            'customer_voucher_id' => ['nullable', 'integer', 'exists:customer_vouchers,id'],
        ]);

        $customer = isset($validated['customer_id'])
            ? Customer::find($validated['customer_id'])
            : null;
        $voucher = isset($validated['customer_voucher_id'])
            ? CustomerVoucher::find($validated['customer_voucher_id'])
            : null;

        $carts = Cart::with('product.category')
            ->where('cashier_id', $request->user()->id)
            ->active()
            ->latest()
            ->get();

        $pricingPreview = $this->pricingService->previewCart($carts, $customer);

        return response()->json([
            'success' => true,
            'data' => $this->previewCheckout($pricingPreview, $customer, [
                'manual_discount' => (int) ($validated['discount'] ?? 0),
                'shipping_cost' => (int) ($validated['shipping_cost'] ?? 0),
            ]),
        ]);
    }

    /**
     * addToCart
     *
     * @param  mixed  $request
     * @return void
     */
    public function addToCart(Request $request)
    {
        if ($request->has('service_id')) {
            $service = Service::find($request->service_id);
            if (! $service) {
                return redirect()->back()->with('error', 'Jasa tidak ditemukan.');
            }

            $unitId = $request->input('satuan_key');
            if (! $unitId) {
                $firstPrice = $service->servicePrices()->first();
                if (! $firstPrice) {
                    return redirect()->back()->with('error', 'Jasa ini belum memiliki konfigurasi harga.');
                }
                $unitId = $firstPrice->unit_id;
            }

            $servicePrice = \App\Models\ServicePrice::with('unit')
                ->where('service_id', $service->id)
                ->where('unit_id', $unitId)
                ->first();

            if (! $servicePrice) {
                return redirect()->back()->with('error', 'Satuan jasa tidak valid.');
            }

            $cart = Cart::where('service_id', $service->id)
                ->where('satuan_key', (string) $unitId)
                ->where('cashier_id', auth()->user()->id)
                ->first();

            $qty = $request->input('qty', 1);

            if ($cart) {
                $cart->increment('qty', $qty);
                $cart->price = $servicePrice->price * $cart->qty;
                $cart->save();
            } else {
                Cart::create([
                    'cashier_id' => auth()->user()->id,
                    'service_id' => $service->id,
                    'qty' => $qty,
                    'price' => $servicePrice->price * $qty,
                    'satuan' => $servicePrice->unit->name,
                    'satuan_key' => (string) $unitId,
                ]);
            }

            return redirect()->route('transactions.index')->with('success', 'Jasa berhasil ditambahkan ke keranjang.');
        }

        // Cari produk berdasarkan ID yang diberikan
        $product = Product::whereId($request->product_id)->first();

        // Jika produk tidak ditemukan, redirect dengan pesan error
        if (! $product) {
            return redirect()->back()->with('error', 'Product not found.');
        }

        $satuanKey = $request->input('satuan_key', 'pcs');
        $satuan = $product->getUnitNameForKey($satuanKey);
        $sellPrice = $product->getSellPriceForUnit($satuanKey);

        $conversion = 1;
        if ($satuanKey === 'dus') {
            $conversion = $product->isi_pcs_dalam_dus ?: (($product->isi_pcs_dalam_pack ?: 1) * ($product->isi_pack_dalam_dus ?: 1));
        } elseif ($satuanKey === 'pack') {
            $conversion = $product->isi_pcs_dalam_pack ?: 1;
        }
        $requestedBaseQty = $request->qty * $conversion;

        // Calculate total base qty of this product already in cart
        $totalCartBaseQty = $requestedBaseQty;
        $otherCarts = Cart::where('product_id', $request->product_id)
            ->where('cashier_id', auth()->user()->id)
            ->get();
        foreach ($otherCarts as $otherCart) {
            $otherConversion = 1;
            if ($otherCart->satuan_key === 'dus') {
                $otherConversion = $product->isi_pcs_dalam_dus ?: (($product->isi_pcs_dalam_pack ?: 1) * ($product->isi_pack_dalam_dus ?: 1));
            } elseif ($otherCart->satuan_key === 'pack') {
                $otherConversion = $product->isi_pcs_dalam_pack ?: 1;
            }
            $totalCartBaseQty += $otherCart->qty * $otherConversion;
        }

        // Cek stok produk
        if ($product->stock < $totalCartBaseQty) {
            return redirect()->back()->with('error', 'Stok tidak mencukupi.');
        }

        // Cek keranjang
        $cart = Cart::with('product')
            ->where('product_id', $request->product_id)
            ->where('satuan_key', $satuanKey)
            ->where('cashier_id', auth()->user()->id)
            ->first();

        if ($cart) {
            // Tingkatkan qty
            $cart->increment('qty', $request->qty);

            // Jumlahkan harga * kuantitas
            $cart->price = $sellPrice * $cart->qty;

            $cart->save();
        } else {
            // Insert ke keranjang
            Cart::create([
                'cashier_id' => auth()->user()->id,
                'product_id' => $request->product_id,
                'qty' => $request->qty,
                'price' => $sellPrice * $request->qty,
                'satuan' => $satuan,
                'satuan_key' => $satuanKey,
            ]);
        }

        return redirect()->route('transactions.index')->with('success', 'Product Added Successfully!.');
    }

    /**
     * destroyCart
     *
     * @param  mixed  $request
     * @return void
     */
    public function destroyCart($cart_id)
    {
        $cart = Cart::with('product')->whereId($cart_id)->first();

        if ($cart) {
            $cart->delete();

            return back();
        } else {
            // Handle case where no cart is found (e.g., redirect with error message)
            return back()->withErrors(['message' => 'Cart not found']);
        }

    }

    /**
     * updateCart - Update cart item quantity
     *
     * @param  mixed  $request
     * @param  int  $cart_id
     * @return void
     */
    public function updateCart(Request $request, $cart_id)
    {
        $request->validate([
            'qty' => 'sometimes|integer|min:1',
            'satuan_key' => 'sometimes|string',
        ]);

        $cart = Cart::with(['product', 'service'])->whereId($cart_id)
            ->where('cashier_id', auth()->user()->id)
            ->first();

        if (! $cart) {
            return response()->json([
                'success' => false,
                'message' => 'Cart item not found',
            ], 404);
        }

        $newQty = $request->input('qty', $cart->qty);

        if ($cart->service_id) {
            $newSatuanKey = $request->input('satuan_key', $cart->satuan_key);

            $servicePrice = \App\Models\ServicePrice::where('service_id', $cart->service_id)
                ->where('unit_id', $newSatuanKey)
                ->first();

            if (! $servicePrice) {
                if (! is_numeric($newSatuanKey)) {
                    $unit = \App\Models\Unit::where('name', $newSatuanKey)->first();
                    if ($unit) {
                        $servicePrice = \App\Models\ServicePrice::where('service_id', $cart->service_id)
                            ->where('unit_id', $unit->id)
                            ->first();
                    }
                }
            }

            if (! $servicePrice) {
                return response()->json([
                    'success' => false,
                    'message' => 'Satuan jasa tidak valid.',
                ], 422);
            }

            $cart->qty = $newQty;
            $cart->satuan_key = (string) $servicePrice->unit_id;
            $cart->satuan = $servicePrice->unit->name;
            $cart->price = $servicePrice->price * $newQty;
            $cart->save();

            return back()->with('success', 'Cart updated successfully');
        }

        $newSatuanKey = $request->input('satuan_key', $cart->satuan_key ?: 'pcs');
        $product = $cart->product;
        $newSatuan = $product->getUnitNameForKey($newSatuanKey);
        $newSellPrice = $product->getSellPriceForUnit($newSatuanKey);

        // Check stock availability
        $newConversion = 1;
        if ($newSatuanKey === 'dus') {
            $newConversion = $product->isi_pcs_dalam_dus ?: (($product->isi_pcs_dalam_pack ?: 1) * ($product->isi_pack_dalam_dus ?: 1));
        } elseif ($newSatuanKey === 'pack') {
            $newConversion = $product->isi_pcs_dalam_pack ?: 1;
        }
        $newBaseQty = $newQty * $newConversion;

        // Base qty of OTHER items in cart for the same product
        $otherCartBaseQty = 0;
        $otherCarts = Cart::where('product_id', $cart->product_id)
            ->where('cashier_id', auth()->user()->id)
            ->where('id', '!=', $cart->id)
            ->get();
        foreach ($otherCarts as $otherCart) {
            $otherConversion = 1;
            if ($otherCart->satuan_key === 'dus') {
                $otherConversion = $product->isi_pcs_dalam_dus ?: (($product->isi_pcs_dalam_pack ?: 1) * ($product->isi_pack_dalam_dus ?: 1));
            } elseif ($otherCart->satuan_key === 'pack') {
                $otherConversion = $product->isi_pcs_dalam_pack ?: 1;
            }
            $otherCartBaseQty += $otherCart->qty * $otherConversion;
        }

        if ($product->stock < ($newBaseQty + $otherCartBaseQty)) {
            return response()->json([
                'success' => false,
                'message' => 'Stok tidak mencukupi. Tersedia: '.$product->stock,
            ], 422);
        }

        // Update quantity, unit and price
        $cart->qty = $newQty;
        $cart->satuan_key = $newSatuanKey;
        $cart->satuan = $newSatuan;
        $cart->price = $newSellPrice * $newQty;
        $cart->save();

        return back()->with('success', 'Cart updated successfully');
    }

    /**
     * holdCart - Hold current cart items for later
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function holdCart(Request $request)
    {
        $request->validate([
            'label' => 'nullable|string|max:50',
        ]);

        $userId = auth()->user()->id;

        // Get active cart items
        $activeCarts = Cart::where('cashier_id', $userId)
            ->active()
            ->get();

        if ($activeCarts->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'Keranjang kosong, tidak ada yang bisa ditahan',
            ], 422);
        }

        // Generate unique hold ID
        $holdId = 'HOLD-'.strtoupper(uniqid());
        $label = $request->label ?: 'Transaksi '.now()->format('H:i');

        // Mark all active cart items as held
        Cart::where('cashier_id', $userId)
            ->active()
            ->update([
                'hold_id' => $holdId,
                'hold_label' => $label,
                'held_at' => now(),
            ]);

        return back()->with('success', 'Transaksi ditahan: '.$label);
    }

    /**
     * resumeCart - Resume a held cart
     *
     * @param  string  $holdId
     * @return \Illuminate\Http\JsonResponse
     */
    public function resumeCart($holdId)
    {
        $userId = auth()->user()->id;

        // Check if there are any active carts (not held)
        $activeCarts = Cart::where('cashier_id', $userId)
            ->active()
            ->count();

        if ($activeCarts > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Selesaikan atau tahan transaksi aktif terlebih dahulu',
            ], 422);
        }

        // Get held carts
        $heldCarts = Cart::where('cashier_id', $userId)
            ->forHold($holdId)
            ->get();

        if ($heldCarts->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'Transaksi ditahan tidak ditemukan',
            ], 404);
        }

        // Resume by clearing hold info
        Cart::where('cashier_id', $userId)
            ->forHold($holdId)
            ->update([
                'hold_id' => null,
                'hold_label' => null,
                'held_at' => null,
            ]);

        return back()->with('success', 'Transaksi dilanjutkan');
    }

    /**
     * clearHold - Delete a held cart
     *
     * @param  string  $holdId
     * @return \Illuminate\Http\JsonResponse
     */
    public function clearHold($holdId)
    {
        $userId = auth()->user()->id;

        $deleted = Cart::where('cashier_id', $userId)
            ->forHold($holdId)
            ->delete();

        if ($deleted === 0) {
            return request()->wantsJson()
                ? response()->json([
                    'success' => false,
                    'message' => 'Transaksi ditahan tidak ditemukan',
                ], 404)
                : back()->with('error', 'Transaksi ditahan tidak ditemukan');
        }

        if (request()->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Transaksi ditahan berhasil dihapus',
            ]);
        }

        return back()->with('success', 'Transaksi ditahan berhasil dihapus');
    }

    /**
     * getHeldCarts - Get all held carts for current user
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getHeldCarts()
    {
        $userId = auth()->user()->id;

        $heldCarts = Cart::with('product:id,title,sell_price,image')
            ->where('cashier_id', $userId)
            ->held()
            ->get()
            ->groupBy('hold_id')
            ->map(function ($items, $holdId) {
                $first = $items->first();

                return [
                    'hold_id' => $holdId,
                    'label' => $first->hold_label,
                    'held_at' => $first->held_at,
                    'items_count' => $items->sum('qty'),
                    'total' => $items->sum('price'),
                    'items' => $items->map(fn ($item) => [
                        'id' => $item->id,
                        'product' => $item->product,
                        'qty' => $item->qty,
                        'price' => $item->price,
                    ]),
                ];
            })
            ->values();

        return response()->json([
            'success' => true,
            'held_carts' => $heldCarts,
        ]);
    }

    /**
     * store
     *
     * @param  mixed  $request
     * @return void
     */
    public function store(Request $request)
    {
        $isPayLater = $request->boolean('pay_later');
        $paymentGateway = $isPayLater ? null : $request->input('payment_gateway');
        if ($paymentGateway) {
            $paymentGateway = strtolower($paymentGateway);
        }

        if ($isPayLater && ! $request->filled('due_date')) {
            return redirect()
                ->route('transactions.index')
                ->with('error', 'Tanggal jatuh tempo wajib diisi untuk nota barang.');
        }

        if ($isPayLater && (! $request->filled('customer_id') || ! Customer::where('id', $request->customer_id)->exists())) {
            return redirect()
                ->route('transactions.index')
                ->with('error', 'Pelanggan wajib dipilih jika memilih bayar belakangan (nota barang).');
        }

        if ($paymentGateway && !in_array($paymentGateway, ['bank_transfer', 'debit_credit', 'qris'])) {
            return redirect()
                ->route('transactions.index')
                ->with('error', 'Gateway pembayaran tidak valid.');
        }

        if ($paymentGateway === 'bank_transfer' && ! \App\Models\BankAccount::active()->exists()) {
            return redirect()
                ->route('transactions.index')
                ->with('error', 'Gateway pembayaran bank transfer belum aktif.');
        }

        $length = 10;
        $random = '';
        for ($i = 0; $i < $length; $i++) {
            $random .= rand(0, 1) ? rand(0, 9) : chr(rand(ord('a'), ord('z')));
        }

        $invoice = 'TRX-'.Str::upper($random);
        $isCashPayment = empty($paymentGateway) && ! $isPayLater;
        $manualDiscount = max(0, (int) $request->input('discount', 0));
        $shippingCost = max(0, (int) $request->input('shipping_cost', 0));
        $requestedRedeemPoints = max(0, (int) $request->input('redeem_points', 0));
        $cashAmount = $isCashPayment ? max(0, (int) $request->cash) : 0;
        $customer = $request->filled('customer_id')
            ? Customer::find($request->integer('customer_id'))
            : null;
        $voucher = null;

        $transaction = DB::transaction(function () use (
            $request,
            $invoice,
            $cashAmount,
            $paymentGateway,
            $isCashPayment,
            $isPayLater,
            $manualDiscount,
            $shippingCost,
            $customer

        ) {
            $activeShift = $this->cashierShiftService->requireActiveShiftForUser(
                auth()->user()->id,
                lockForUpdate: true
            );

            $carts = Cart::with(['product', 'service.servicePrices.unit'])
                ->where('cashier_id', auth()->user()->id)
                ->active()
                ->get();

            if ($carts->isEmpty()) {
                abort(422, 'Keranjang kosong.');
            }

            $pricingPreview = $this->pricingService->previewCart($carts, $customer);
            $checkoutPreview = $this->previewCheckout($pricingPreview, $customer, [
                'manual_discount' => $manualDiscount,
                'shipping_cost' => $shippingCost,
            ]);
            $pricingItems = collect($pricingPreview['items']);
            $subtotalAfterPromo = (int) data_get($pricingPreview, 'summary.subtotal_after_promo', 0);
            $appliedManualDiscount = (int) data_get($checkoutPreview, 'summary.manual_discount_total', 0);
            $grandTotal = (int) data_get($checkoutPreview, 'summary.grand_total', 0);
            $changeAmount = $isCashPayment ? max(0, $cashAmount - $grandTotal) : 0;

            $pointsEarned = 0;
            $loyaltyService = app(\App\Services\LoyaltyService::class);
            if ($customer && $customer->is_loyalty_member) {
                $pointsEarned = $loyaltyService->calculatePoints($grandTotal);
            }

            $transaction = Transaction::create([
                'cashier_id' => auth()->user()->id,
                'cashier_shift_id' => $activeShift->id,
                'customer_id' => $request->customer_id,
                'invoice' => $invoice,
                'cash' => $cashAmount,
                'change' => $changeAmount,
                'discount' => $appliedManualDiscount,
                'shipping_cost' => $shippingCost,
                'grand_total' => $grandTotal,
                'payment_method' => $isPayLater ? 'pay_later' : ($paymentGateway ?: 'cash'),
                'payment_status' => ($isCashPayment || in_array($paymentGateway, ['debit_credit', 'qris'])) ? 'paid' : ($isPayLater ? 'unpaid' : 'pending'),
                'payment_reference' => $request->payment_reference,
                'bank_account_id' => $paymentGateway === 'bank_transfer' ? $request->bank_account_id : null,
                'loyalty_points_earned' => $pointsEarned,
            ]);

            foreach ($carts as $cart) {
                $pricingItem = $pricingItems->firstWhere('cart_id', $cart->id);
                $lineTotal = (int) data_get($pricingItem, 'line_total', $cart->price);
                $linePromoDiscount = (int) data_get($pricingItem, 'line_discount_total', 0);

                if ($cart->service_id) {
                    $baseUnitPrice = (int) data_get($pricingItem, 'base_unit_price', 0);
                    $unitPrice = (int) data_get($pricingItem, 'effective_unit_price', 0);
                } else {
                    $baseUnitPrice = (int) data_get($pricingItem, 'base_unit_price', $cart->product->getSellPriceForUnit($cart->satuan_key));
                    $unitPrice = (int) data_get($pricingItem, 'effective_unit_price', $cart->product->getSellPriceForUnit($cart->satuan_key));
                }

                $transaction->details()->create([
                    'transaction_id' => $transaction->id,
                    'product_id' => $cart->product_id,
                    'service_id' => $cart->service_id,
                    'qty' => $cart->qty,
                    'base_unit_price' => $baseUnitPrice,
                    'unit_price' => $unitPrice,
                    'price' => $lineTotal,
                    'discount_total' => $linePromoDiscount,
                    'pricing_rule_id' => data_get($pricingItem, 'pricing_rule.id'),
                    'pricing_rule_name' => data_get($pricingItem, 'pricing_rule.name'),
                    'pricing_rule_kind' => data_get($pricingItem, 'pricing_rule.kind'),
                    'pricing_group_key' => data_get($pricingItem, 'pricing_group_key'),
                    'pricing_group_label' => data_get($pricingItem, 'pricing_group_label'),
                    'satuan' => $cart->satuan,
                    'satuan_key' => $cart->satuan_key ?: 'pcs',
                ]);

                if ($cart->service_id) {
                    $total_buy_price = 0;
                } else {
                    $buyPriceForUnit = $cart->product->getBuyPriceForUnit($cart->satuan_key);
                    $total_buy_price = $buyPriceForUnit * $cart->qty;
                }

                $lineShare = $subtotalAfterPromo > 0 ? $lineTotal / $subtotalAfterPromo : 0;
                $allocatedManualDiscount = (int) round($appliedManualDiscount * $lineShare);
                $netSellPrice = max(0, $lineTotal - $allocatedManualDiscount);
                $profits = $netSellPrice - $total_buy_price;

                $transaction->profits()->create([
                    'transaction_id' => $transaction->id,
                    'product_id' => $cart->product_id,
                    'service_id' => $cart->service_id,
                    'total' => $profits,
                ]);

                if (! $cart->service_id) {
                    $product = Product::find($cart->product_id);
                    $conversion = 1;
                    if ($cart->satuan_key === 'dus') {
                        $conversion = $product->isi_pcs_dalam_dus ?: (($product->isi_pcs_dalam_pack ?: 1) * ($product->isi_pack_dalam_dus ?: 1));
                    } elseif ($cart->satuan_key === 'pack') {
                        $conversion = $product->isi_pcs_dalam_pack ?: 1;
                    }
                    $qtyInBaseUnit = $cart->qty * $conversion;

                    $product->stock = $product->stock - $qtyInBaseUnit;
                    $product->save();
                }
            }

            Cart::where('cashier_id', auth()->user()->id)->active()->delete();

            if ($isPayLater) {
                Receivable::create([
                    'customer_id' => $request->customer_id,
                    'transaction_id' => $transaction->id,
                    'invoice' => $invoice,
                    'total' => $grandTotal,
                    'paid' => 0,
                    'due_date' => $request->due_date,
                    'status' => 'unpaid',
                ]);
            }

            $loyaltyService->awardPointsForTransaction($transaction);

            return $transaction->fresh(['customer']);
        });

        return to_route('transactions.print', $transaction->invoice);
    }

    public function print($invoice)
    {
        // get transaction
        $transaction = Transaction::with('details.product', 'details.service', 'cashier', 'customer', 'receivable', 'bankAccount')
            ->where('invoice', $invoice)
            ->firstOrFail();

        return Inertia::render('Dashboard/Transactions/Print', [
            'transaction' => $transaction,
        ]);
    }

    /**
     * Display transaction history.
     */
    public function history(Request $request)
    {
        $salesReturnTablesReady = Schema::hasTable('sales_returns') && Schema::hasTable('sales_return_items');

        $filters = [
            'invoice' => $request->input('invoice'),
            'start_date' => $request->input('start_date'),
            'end_date' => $request->input('end_date'),
        ];

        $query = Transaction::query()
            ->with([
                'cashier:id,name',
                'cashierShift:id,opened_at,status',
                'customer:id,name',
                'receivable',
            ])
            ->withSum('details as total_items', 'qty')
            ->withSum('profits as total_profit', 'total')
            ->orderByDesc('created_at');

        if ($salesReturnTablesReady) {
            $query->with('details.salesReturnItems.salesReturn:id,status');
        }

        if (! $request->user()->isSuperAdmin()) {
            $query->where('cashier_id', $request->user()->id);
        }

        $query
            ->when($filters['invoice'], function (Builder $builder, $invoice) {
                $builder->where('invoice', 'like', '%'.$invoice.'%');
            })
            ->when($filters['start_date'], function (Builder $builder, $date) {
                $builder->whereDate('created_at', '>=', $date);
            })
            ->when($filters['end_date'], function (Builder $builder, $date) {
                $builder->whereDate('created_at', '<=', $date);
            });

        $transactions = $query->paginate(10)->withQueryString();
        $transactions->through(function (Transaction $transaction) use ($salesReturnTablesReady) {
            $canCreateSalesReturn = false;

            if ($salesReturnTablesReady) {
                $allReturned = true;

                foreach ($transaction->details as $detail) {
                    $returnedQty = (int) $detail->salesReturnItems
                        ->filter(fn ($item) => $item->salesReturn?->status === 'completed')
                        ->sum('qty_return');

                    if ($returnedQty < (int) $detail->qty) {
                        $allReturned = false;
                        break;
                    }
                }

                $canCreateSalesReturn = $transaction->details->isNotEmpty() && ! $allReturned;
            }

            return [
                ...$transaction->toArray(),
                'can_create_sales_return' => $canCreateSalesReturn,
            ];
        });

        return Inertia::render('Dashboard/Transactions/History', [
            'transactions' => $transactions,
            'filters' => $filters,
            'salesReturnFeatureReady' => $salesReturnTablesReady,
        ]);
    }

    /**
     * Confirm payment for bank transfer transactions
     */
    public function confirmPayment(Transaction $transaction)
    {
        if ($transaction->payment_status === 'paid') {
            return redirect()
                ->back()
                ->with('error', 'Transaksi sudah dibayar.');
        }

        $beforeStatus = $transaction->payment_status;
        $transaction->update([
            'payment_status' => 'paid',
        ]);

        app(\App\Services\LoyaltyService::class)->awardPointsForTransaction($transaction);

        $this->auditLogService->log(
            event: 'transaction.payment_confirmed',
            module: 'transactions',
            auditable: $transaction,
            description: "Pembayaran untuk invoice {$transaction->invoice} dikonfirmasi.",
            before: [
                'invoice' => $transaction->invoice,
                'payment_method' => $transaction->payment_method,
                'payment_status' => $beforeStatus,
                'bank_account_id' => $transaction->bank_account_id,
            ],
            after: [
                'invoice' => $transaction->invoice,
                'payment_method' => $transaction->payment_method,
                'payment_status' => 'paid',
                'bank_account_id' => $transaction->bank_account_id,
            ],
            meta: [
                'invoice' => $transaction->invoice,
                'bank_account_id' => $transaction->bank_account_id,
            ],
        );

        return redirect()
            ->back()
            ->with('success', "Pembayaran untuk invoice {$transaction->invoice} berhasil dikonfirmasi.");
    }

    private function previewCheckout(array $pricingPreview, ?Customer $customer = null, array $options = []): array
    {
        $subtotalAfterPromo = max(0, (int) data_get($pricingPreview, 'summary.subtotal_after_promo', 0));
        $manualDiscountRequested = max(0, (int) ($options['manual_discount'] ?? 0));
        $shippingCost = max(0, (int) ($options['shipping_cost'] ?? 0));

        $manualDiscountApplied = min($manualDiscountRequested, $subtotalAfterPromo);
        $grandTotal = max(0, $subtotalAfterPromo - $manualDiscountApplied + $shippingCost);

        $loyaltyService = app(\App\Services\LoyaltyService::class);
        $pointsEarnedPreview = 0;
        if ($customer && $customer->is_loyalty_member) {
            $pointsEarnedPreview = $loyaltyService->calculatePoints($grandTotal);
        }

        $loyaltyEnabled = \App\Models\Setting::getBool('loyalty_points_enabled', false);

        return [
            'items' => data_get($pricingPreview, 'items', []),
            'applied_groups' => data_get($pricingPreview, 'applied_groups', []),
            'consumed_quantities' => data_get($pricingPreview, 'consumed_quantities', []),
            'unmatched_items' => data_get($pricingPreview, 'unmatched_items', []),
            'summary' => [
                'base_subtotal' => (int) data_get($pricingPreview, 'summary.base_subtotal', 0),
                'promo_discount_total' => (int) data_get($pricingPreview, 'summary.promo_discount_total', 0),
                'subtotal_after_promo' => $subtotalAfterPromo,
                'voucher_discount_total' => 0,
                'loyalty_discount_total' => 0,
                'manual_discount_total' => $manualDiscountApplied,
                'shipping_cost' => $shippingCost,
                'grand_total' => $grandTotal,
                'available_loyalty_points' => $customer ? (int) $customer->loyalty_points : 0,
                'requested_redeem_points' => 0,
                'applied_redeem_points' => 0,
                'points_value' => 0,
                'points_earned_preview' => $pointsEarnedPreview,
            ],
            'customer' => $customer ? [
                'id' => $customer->id,
                'is_loyalty_member' => (bool) $customer->is_loyalty_member,
                'member_code' => $customer->member_code,
                'loyalty_tier' => $customer->loyalty_tier ?? 'regular',
                'loyalty_points' => (int) $customer->loyalty_points,
            ] : null,
            'voucher' => null,
            'eligible_vouchers' => [],
            'settings' => [
                'enable_earn' => $loyaltyEnabled,
                'enable_redeem' => false,
                'redeem_point_value' => 0,
                'minimum_points_to_redeem' => 0,
            ],
        ];
    }
}
