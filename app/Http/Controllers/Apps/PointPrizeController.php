<?php

namespace App\Http\Controllers\Apps;

use App\Http\Controllers\Controller;
use App\Models\PointPrize;
use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PointPrizeController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Inertia\Response
     */
    public function index()
    {
        $pointPrizes = PointPrize::query()
            ->with('product')
            ->when(request()->search, function ($query, $search) {
                $query->whereHas('product', function ($q) use ($search) {
                    $q->where('title', 'like', '%'.$search.'%')
                        ->orWhere('barcode', 'like', '%'.$search.'%');
                });
            })
            ->latest()
            ->paginate(10)
            ->withQueryString();

        $products = Product::orderBy('title')->get();

        return Inertia::render('Dashboard/PointPrizes/Index', [
            'pointPrizes' => $pointPrizes,
            'products' => $products,
            'filters' => request()->only(['search']),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     *
     * @return \Illuminate\Http\RedirectResponse
     */
    public function store(Request $request)
    {
        $request->validate([
            'product_id' => 'required|exists:products,id|unique:point_prizes,product_id',
            'points_required' => 'required|integer|min:1',
        ]);

        PointPrize::create($request->only('product_id', 'points_required'));

        return to_route('point-prizes.index')->with('success', 'Hadiah poin berhasil ditambahkan.');
    }

    /**
     * Update the specified resource in storage.
     *
     * @return \Illuminate\Http\RedirectResponse
     */
    public function update(Request $request, PointPrize $pointPrize)
    {
        $request->validate([
            'product_id' => 'required|exists:products,id|unique:point_prizes,product_id,'.$pointPrize->id,
            'points_required' => 'required|integer|min:1',
        ]);

        $pointPrize->update($request->only('product_id', 'points_required'));

        return to_route('point-prizes.index')->with('success', 'Hadiah poin berhasil diperbarui.');
    }

    /**
     * Remove the specified resource from storage.
     *
     * @return \Illuminate\Http\RedirectResponse
     */
    public function destroy(PointPrize $pointPrize)
    {
        if ($pointPrize->redemptionItems()->exists()) {
            return to_route('point-prizes.index')->with('error', 'Hadiah poin tidak bisa dihapus karena sudah pernah ditukarkan dalam transaksi.');
        }

        $pointPrize->delete();

        return to_route('point-prizes.index')->with('success', 'Hadiah poin berhasil dihapus.');
    }
}
