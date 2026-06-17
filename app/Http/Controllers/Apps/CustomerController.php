<?php

namespace App\Http\Controllers\Apps;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Laravolt\Indonesia\Models\City;
use Laravolt\Indonesia\Models\District;
use Laravolt\Indonesia\Models\Province;
use Laravolt\Indonesia\Models\Village;

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
        $provinces = Province::select('code', 'name')->orderBy('name')->get();

        return Inertia::render('Dashboard/Customers/Create', [
            'provinces' => $provinces,
        ]);
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
            'name' => 'required',
            'no_telp' => 'required|unique:customers',
            'address' => 'required',
            'province_id' => 'required|string',
            'regency_id' => 'required|string',
            'district_id' => 'required|string',
            'village_id' => 'required|string',
        ]);

        $province = Province::where('code', $request->province_id)->first();
        $regency = City::where('code', $request->regency_id)->first();
        $district = District::where('code', $request->district_id)->first();
        $village = Village::where('code', $request->village_id)->first();

        // create customer
        Customer::create([
            'name' => $request->name,
            'no_telp' => $request->no_telp,
            'address' => $request->address,
            'province_id' => $request->province_id,
            'province_name' => $province?->name,
            'regency_id' => $request->regency_id,
            'regency_name' => $regency?->name,
            'district_id' => $request->district_id,
            'district_name' => $district?->name,
            'village_id' => $request->village_id,
            'village_name' => $village?->name,
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
            'name' => 'required|string|max:255',
            'no_telp' => 'required|string|unique:customers,no_telp',
            'address' => 'required|string',
            'province_id' => 'nullable|string',
            'regency_id' => 'nullable|string',
            'district_id' => 'nullable|string',
            'village_id' => 'nullable|string',
        ]);

        try {
            $provinceCode = $validated['province_id'] ?? null;
            $regencyCode = $validated['regency_id'] ?? null;
            $districtCode = $validated['district_id'] ?? null;
            $villageCode = $validated['village_id'] ?? null;

            $province = $provinceCode ? Province::where('code', $provinceCode)->first() : null;
            $regency = $regencyCode ? City::where('code', $regencyCode)->first() : null;
            $district = $districtCode ? District::where('code', $districtCode)->first() : null;
            $village = $villageCode ? Village::where('code', $villageCode)->first() : null;

            $customer = Customer::create([
                'name' => $validated['name'],
                'no_telp' => $validated['no_telp'],
                'address' => $validated['address'],
                'province_id' => $provinceCode,
                'province_name' => $province?->name,
                'regency_id' => $regencyCode,
                'regency_name' => $regency?->name,
                'district_id' => $districtCode,
                'district_name' => $district?->name,
                'village_id' => $villageCode,
                'village_name' => $village?->name,
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
        $provinces = Province::select('code', 'name')->orderBy('name')->get();
        $regencies = $customer->province_id
            ? City::where('province_code', $customer->province_id)->select('code', 'name')->orderBy('name')->get()
            : [];
        $districts = $customer->regency_id
            ? District::where('city_code', $customer->regency_id)->select('code', 'name')->orderBy('name')->get()
            : [];
        $villages = $customer->district_id
            ? Village::where('district_code', $customer->district_id)->select('code', 'name')->orderBy('name')->get()
            : [];

        return Inertia::render('Dashboard/Customers/Edit', [
            'customer' => $customer,
            'provinces' => $provinces,
            'regencies' => $regencies,
            'districts' => $districts,
            'villages' => $villages,
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
            'name' => 'required',
            'no_telp' => 'required|unique:customers,no_telp,'.$customer->id,
            'address' => 'required',
            'province_id' => 'required|string',
            'regency_id' => 'required|string',
            'district_id' => 'required|string',
            'village_id' => 'required|string',
        ]);

        $province = Province::where('code', $request->province_id)->first();
        $regency = City::where('code', $request->regency_id)->first();
        $district = District::where('code', $request->district_id)->first();
        $village = Village::where('code', $request->village_id)->first();

        // update customer
        $customer->update([
            'name' => $request->name,
            'no_telp' => $request->no_telp,
            'address' => $request->address,
            'province_id' => $request->province_id,
            'province_name' => $province?->name,
            'regency_id' => $request->regency_id,
            'regency_name' => $regency?->name,
            'district_id' => $request->district_id,
            'district_name' => $district?->name,
            'village_id' => $request->village_id,
            'village_name' => $village?->name,
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
