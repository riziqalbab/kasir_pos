<?php

namespace App\Http\Controllers\Apps;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CustomerController extends Controller
{
    // constructor
    public function __construct() {}

    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index()
    {
        // get customers
        $customers = Customer::when(request()->search, function ($customers) {
            $search = request()->search;
            $customers = $customers->where(function ($query) use ($search) {
                $query
                    ->where('name', 'like', '%'.$search.'%')
                    ->orWhere('member_code', 'like', '%'.$search.'%');
            });
        })->latest()->paginate(5);

        // return inertia
        return Inertia::render('Dashboard/Customers/Index', [
            'customers' => $customers,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function create()
    {
        return Inertia::render('Dashboard/Customers/Create');
    }

    /**
     * Store a newly created resource in storage.
     *
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
        /**
         * validate
         */
        $request->validate([
            'member_code' => 'required|unique:customers,member_code',
            'name' => 'required',
            'no_telp' => 'nullable|unique:customers,no_telp',
            'address' => 'required',
        ]);

        // create customer
        Customer::create([
            'member_code' => $request->member_code,
            'name' => $request->name,
            'no_telp' => $request->no_telp,
            'address' => $request->address,
        ]);

        // redirect
        return to_route('customers.index');
    }

    /**
     * Store a newly created customer via AJAX (returns JSON, no redirect)
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function storeAjax(Request $request)
    {
        $validated = $request->validate([
            'member_code' => 'required|string|unique:customers,member_code',
            'name' => 'required|string|max:255',
            'no_telp' => 'nullable|string|unique:customers,no_telp',
            'address' => 'required|string',
        ]);

        try {
            $customer = Customer::create([
                'member_code' => $validated['member_code'],
                'name' => $validated['name'],
                'no_telp' => $validated['no_telp'],
                'address' => $validated['address'],
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Pelanggan berhasil ditambahkan',
                'customer' => [
                    'id' => $customer->id,
                    'name' => $customer->name,
                    'no_telp' => $customer->no_telp,
                    'address' => $customer->address,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal menambahkan pelanggan',
                'errors' => [],
            ], 500);
        }
    }

    /**
     * Show the form for editing the specified resource.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function edit(Customer $customer)
    {
        return Inertia::render('Dashboard/Customers/Edit', [
            'customer' => $customer,
        ]);
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function update(Request $request, Customer $customer)
    {
        /**
         * validate
         */
        $request->validate([
            'member_code' => 'required|unique:customers,member_code,'.$customer->id,
            'name' => 'required',
            'no_telp' => 'nullable|unique:customers,no_telp,'.$customer->id,
            'address' => 'required',
        ]);

        // update customer
        $customer->update([
            'member_code' => $request->member_code,
            'name' => $request->name,
            'no_telp' => $request->no_telp,
            'address' => $request->address,
        ]);

        // redirect
        return to_route('customers.index');
    }

    public function show(Customer $customer)
    {
        $stats = $this->buildStats($customer);
        $recentTransactions = $this->recentTransactions($customer);
        $frequentProducts = $this->frequentProducts($customer);

        return Inertia::render('Dashboard/Customers/Show', [
            'customer' => $customer,
            'stats' => $stats,
            'recentTransactions' => $recentTransactions,
            'frequentProducts' => $frequentProducts,
        ]);
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function destroy($id)
    {
        // find customer by ID
        $customer = Customer::findOrFail($id);

        // delete customer
        $customer->delete();

        // redirect
        return back();
    }

    /**
     * Get customer purchase history
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getHistory(Customer $customer)
    {
        // Get transaction statistics
        $stats = $this->buildStats($customer);
        $recentTransactions = $this->recentTransactions($customer);
        $frequentProducts = $this->frequentProducts($customer);

        return response()->json([
            'success' => true,
            'customer' => [
                'id' => $customer->id,
                'name' => $customer->name,
                'phone' => $customer->no_telp,
            ],
            'stats' => [
                'total_transactions' => (int) ($stats->total_transactions ?? 0),
                'total_spent' => (int) ($stats->total_spent ?? 0),
                'last_visit' => $stats->last_visit ? \Carbon\Carbon::parse($stats->last_visit)->format('d M Y') : null,
            ],
            'recent_transactions' => $recentTransactions,
            'frequent_products' => $frequentProducts,
        ]);
    }

    private function buildStats(Customer $customer)
    {
        return Transaction::where('customer_id', $customer->id)
            ->selectRaw('
                COUNT(*) as total_transactions,
                SUM(grand_total) as total_spent,
                MAX(created_at) as last_visit
            ')
            ->first();
    }

    private function recentTransactions(Customer $customer)
    {
        return Transaction::where('customer_id', $customer->id)
            ->select('id', 'invoice', 'grand_total', 'payment_method', 'created_at')
            ->orderByDesc('created_at')
            ->limit(5)
            ->get()
            ->map(fn ($t) => [
                'id' => $t->id,
                'invoice' => $t->invoice,
                'total' => $t->grand_total,
                'payment_method' => $t->payment_method,
                'date' => \Carbon\Carbon::parse($t->created_at)->format('d M Y H:i'),
            ]);
    }

    private function frequentProducts(Customer $customer)
    {
        return Transaction::where('customer_id', $customer->id)
            ->join('transaction_details', 'transactions.id', '=', 'transaction_details.transaction_id')
            ->join('products', 'transaction_details.product_id', '=', 'products.id')
            ->selectRaw('products.id, products.title, SUM(transaction_details.qty) as total_qty')
            ->groupBy('products.id', 'products.title')
            ->orderByDesc('total_qty')
            ->limit(3)
            ->get();
    }
}
