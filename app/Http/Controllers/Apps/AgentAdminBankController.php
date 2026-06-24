<?php

namespace App\Http\Controllers\Apps;

use App\Http\Controllers\Controller;
use App\Models\AgentAdminBank;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AgentAdminBankController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $search = $request->input('search');

        $agentAdminBanks = AgentAdminBank::query()
            ->when($search, function ($query, $search) {
                $query->where('code', 'like', "%{$search}%")
                    ->orWhere('amount', 'like', "%{$search}%");
            })
            ->latest()
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Dashboard/AgentAdminBanks/Index', [
            'agentAdminBanks' => $agentAdminBanks,
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
            'code' => 'required|string|unique:agent_admin_banks,code|max:100',
            'amount' => 'required|integer|min:0',
        ]);

        AgentAdminBank::create($request->only('code', 'amount'));

        return to_route('agent-admin-banks.index')->with('success', 'Admin bank berhasil ditambahkan.');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, AgentAdminBank $agentAdminBank)
    {
        $request->validate([
            'code' => 'required|string|unique:agent_admin_banks,code,'.$agentAdminBank->id.'|max:100',
            'amount' => 'required|integer|min:0',
        ]);

        $agentAdminBank->update($request->only('code', 'amount'));

        return to_route('agent-admin-banks.index')->with('success', 'Admin bank berhasil diperbarui.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(AgentAdminBank $agentAdminBank)
    {
        if ($agentAdminBank->agentTransactions()->exists()) {
            return to_route('agent-admin-banks.index')->with('error', 'Admin bank tidak bisa dihapus karena sudah digunakan dalam transaksi.');
        }

        $agentAdminBank->delete();

        return to_route('agent-admin-banks.index')->with('success', 'Admin bank berhasil dihapus.');
    }
}
