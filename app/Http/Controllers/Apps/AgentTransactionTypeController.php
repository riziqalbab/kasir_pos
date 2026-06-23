<?php

namespace App\Http\Controllers\Apps;

use App\Http\Controllers\Controller;
use App\Models\AgentTransactionType;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AgentTransactionTypeController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $search = $request->input('search');

        $agentTransactionTypes = AgentTransactionType::query()
            ->when($search, function ($query, $search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            })
            ->latest()
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('Dashboard/AgentTransactionTypes/Index', [
            'agentTransactionTypes' => $agentTransactionTypes,
            'filters' => [
                'search' => $search,
            ],
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'code' => 'required|unique:agent_transaction_types,code',
            'name' => 'required|string|max:255',
            'type' => 'required|in:debet,kredit',
            'description' => 'nullable|string',
            'default_admin_fee_customer' => 'required|integer|min:0',
            'default_admin_fee_bank' => 'required|integer|min:0',
            'is_active' => 'required|boolean',
        ]);

        AgentTransactionType::create($request->all());

        return to_route('agent-transaction-types.index')->with('success', 'Tipe transaksi agen berhasil ditambahkan.');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, AgentTransactionType $agentTransactionType)
    {
        $request->validate([
            'code' => 'required|unique:agent_transaction_types,code,'.$agentTransactionType->id,
            'name' => 'required|string|max:255',
            'type' => 'required|in:debet,kredit',
            'description' => 'nullable|string',
            'default_admin_fee_customer' => 'required|integer|min:0',
            'default_admin_fee_bank' => 'required|integer|min:0',
            'is_active' => 'required|boolean',
        ]);

        $agentTransactionType->update($request->all());

        return to_route('agent-transaction-types.index')->with('success', 'Tipe transaksi agen berhasil diperbarui.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(AgentTransactionType $agentTransactionType)
    {
        // check if used in transactions
        if ($agentTransactionType->agentTransactions()->exists()) {
            return to_route('agent-transaction-types.index')->with('error', 'Tipe transaksi tidak bisa dihapus karena sudah memiliki riwayat transaksi.');
        }

        $agentTransactionType->delete();

        return to_route('agent-transaction-types.index')->with('success', 'Tipe transaksi agen berhasil dihapus.');
    }
}
