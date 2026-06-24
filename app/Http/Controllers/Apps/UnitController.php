<?php

namespace App\Http\Controllers\Apps;

use App\Http\Controllers\Controller;
use App\Models\Unit;
use Illuminate\Http\Request;
use Inertia\Inertia;

class UnitController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Inertia\Response
     */
    public function index()
    {
        $units = Unit::when(request()->search, function ($query) {
            $query->where('name', 'like', '%' . request()->search . '%');
        })->orderBy('name')->paginate(10)->withQueryString();

        return Inertia::render('Dashboard/Units/Index', [
            'units' => $units,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\RedirectResponse
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:50|unique:units,name',
        ]);

        Unit::create([
            'name' => $request->name,
        ]);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Satuan berhasil ditambahkan',
                'units' => Unit::orderBy('name')->get()
            ]);
        }

        return back()->with('success', 'Satuan berhasil ditambahkan');
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  \App\Models\Unit  $unit
     * @return \Illuminate\Http\RedirectResponse
     */
    public function destroy(Unit $unit)
    {
        $unit->delete();

        return back()->with('success', 'Satuan berhasil dihapus');
    }
}
