<?php

namespace App\Http\Controllers\Apps;

use App\Http\Controllers\Controller;
use App\Models\AgentAdminLoket;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AgentAdminLoketController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $search = $request->input('search');

        $agentAdminLokets = AgentAdminLoket::query()
            ->when($search, function ($query, $search) {
                $query->where('code', 'like', "%{$search}%")
                    ->orWhere('amount', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            })
            ->latest()
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Dashboard/AgentAdminLokets/Index', [
            'agentAdminLokets' => $agentAdminLokets,
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
            'code' => 'required|string|unique:agent_admin_lokets,code|max:100',
            'amount' => 'required|integer|min:0',
            'description' => 'nullable|string|max:255',
        ]);

        AgentAdminLoket::create($request->only('code', 'amount', 'description'));

        return to_route('agent-admin-lokets.index')->with('success', 'Admin loket berhasil ditambahkan.');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, AgentAdminLoket $agentAdminLoket)
    {
        $request->validate([
            'code' => 'required|string|unique:agent_admin_lokets,code,'.$agentAdminLoket->id.'|max:100',
            'amount' => 'required|integer|min:0',
            'description' => 'nullable|string|max:255',
        ]);

        $agentAdminLoket->update($request->only('code', 'amount', 'description'));

        return to_route('agent-admin-lokets.index')->with('success', 'Admin loket berhasil diperbarui.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(AgentAdminLoket $agentAdminLoket)
    {
        if ($agentAdminLoket->agentTransactions()->exists()) {
            return to_route('agent-admin-lokets.index')->with('error', 'Admin loket tidak bisa dihapus karena sudah digunakan dalam transaksi.');
        }

        $agentAdminLoket->delete();

        return to_route('agent-admin-lokets.index')->with('success', 'Admin loket berhasil dihapus.');
    }
}
