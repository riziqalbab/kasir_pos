<?php

namespace App\Http\Controllers\Apps;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\Supplier;
use App\Services\PurchaseOrderService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PurchaseOrderController extends Controller
{
    public function __construct(
        private readonly PurchaseOrderService $purchaseOrderService
    ) {}

    public function index(Request $request)
    {
        $filters = [
            'status' => $request->input('status'),
            'supplier' => $request->input('supplier'),
            'search' => $request->input('search'),
        ];

        $query = PurchaseOrder::with([
            'supplier:id,name',
            'items',
            'creator:id,name',
        ])->withCount('items as items_count')
            ->orderByDesc('created_at');

        $query->when($filters['status'], fn ($q, $s) => $q->where('status', $s))
            ->when($filters['supplier'], fn ($q, $s) => $q->where('supplier_id', $s))
            ->when($filters['search'], fn ($q, $s) => $q->where('document_number', 'like', "%{$s}%"));

        $orders = $query->paginate(10)->withQueryString();
        $suppliers = Supplier::orderBy('name')->get(['id', 'name']);

        return Inertia::render('Dashboard/PurchaseOrders/Index', [
            'orders' => $orders,
            'filters' => $filters,
            'suppliers' => $suppliers,
        ]);
    }

    public function create()
    {
        $suppliers = Supplier::orderBy('name')->get(['id', 'name']);
        $products = Product::orderBy('title')->get([
            'id', 'title', 'sku', 'buy_price', 'stock',
            'satuan_jual_dus', 'harga_beli_dus',
            'satuan_jual_pack', 'harga_beli_pack',
            'satuan_jual_pcs', 'harga_beli_pcs',
            'isi_pcs_dalam_pack', 'isi_pack_dalam_dus', 'isi_pcs_dalam_dus',
        ]);

        return Inertia::render('Dashboard/PurchaseOrders/Create', [
            'suppliers' => $suppliers,
            'products' => $products,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'supplier_id' => ['nullable', 'exists:suppliers,id'],
            'document_number' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'exists:products,id'],
            'items.*.qty_ordered' => ['required', 'integer', 'min:1'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'items.*.satuan' => ['nullable', 'string', 'max:50'],
            'items.*.satuan_key' => ['nullable', 'string', 'max:50'],
        ]);

        $order = $this->purchaseOrderService->createOrder($data, $data['items'], $request->user()->id);

        return redirect()
            ->route('purchase-orders.show', $order)
            ->with('success', 'Purchase order berhasil dibuat.');
    }

    public function show(PurchaseOrder $purchaseOrder)
    {
        $purchaseOrder->load([
            'supplier:id,name,phone,email,address',
            'items.product:id,title,sku,image',
            'goodsReceivings' => function ($q) {
                $q->with('items.product:id,title,sku')->orderByDesc('received_at');
            },
            'creator:id,name',
            'payable:id,purchase_order_id,total,paid,status,document_number',
        ]);

        return Inertia::render('Dashboard/PurchaseOrders/Show', [
            'order' => $purchaseOrder,
        ]);
    }

    public function placeOrder(Request $request, PurchaseOrder $purchaseOrder)
    {
        if ($purchaseOrder->status !== 'draft') {
            return back()->with('error', 'Hanya PO dengan status draft yang bisa dipesan.');
        }

        $this->purchaseOrderService->placeOrder($purchaseOrder);

        return redirect()
            ->route('purchase-orders.show', $purchaseOrder)
            ->with('success', 'Purchase order berhasil dipesan.');
    }

    public function cancel(Request $request, PurchaseOrder $purchaseOrder)
    {
        if (! in_array($purchaseOrder->status, ['draft', 'ordered', 'partial_received'])) {
            return back()->with('error', 'PO tidak dapat dibatalkan.');
        }

        $this->purchaseOrderService->cancelOrder($purchaseOrder);

        return redirect()
            ->route('purchase-orders.index')
            ->with('success', 'Purchase order dibatalkan.');
    }
}
