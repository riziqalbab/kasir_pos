<?php

namespace App\Http\Controllers\Apps;

use App\Http\Controllers\Controller;
use App\Models\Service;
use App\Models\ServicePrice;
use App\Models\Unit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ServiceController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Inertia\Response
     */
    public function index()
    {
        $services = Service::with('servicePrices.unit')
            ->when(request()->search, function ($query) {
                $query->where('name', 'like', '%' . request()->search . '%');
            })
            ->latest()
            ->paginate(10)
            ->withQueryString();

        $units = Unit::orderBy('name')->get();

        return Inertia::render('Dashboard/Services/Index', [
            'services' => $services,
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
            'name' => 'required|string|max:255|unique:services,name',
            'description' => 'nullable|string',
            'prices' => 'required|array|min:1',
            'prices.*.unit_id' => 'required|exists:units,id',
            'prices.*.price' => 'required|integer|min:0',
        ]);

        DB::transaction(function () use ($request) {
            $service = Service::create([
                'name' => $request->name,
                'description' => $request->description,
            ]);

            foreach ($request->prices as $priceData) {
                ServicePrice::create([
                    'service_id' => $service->id,
                    'unit_id' => $priceData['unit_id'],
                    'price' => $priceData['price'],
                ]);
            }
        });

        return to_route('services.index')->with('success', 'Jasa berhasil ditambahkan.');
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\Service  $service
     * @return \Illuminate\Http\RedirectResponse
     */
    public function update(Request $request, Service $service)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:services,name,' . $service->id,
            'description' => 'nullable|string',
            'prices' => 'required|array|min:1',
            'prices.*.unit_id' => 'required|exists:units,id',
            'prices.*.price' => 'required|integer|min:0',
        ]);

        DB::transaction(function () use ($request, $service) {
            $service->update([
                'name' => $request->name,
                'description' => $request->description,
            ]);

            // Sync service prices by recreating them
            $service->servicePrices()->delete();

            foreach ($request->prices as $priceData) {
                ServicePrice::create([
                    'service_id' => $service->id,
                    'unit_id' => $priceData['unit_id'],
                    'price' => $priceData['price'],
                ]);
            }
        });

        return to_route('services.index')->with('success', 'Jasa berhasil diperbarui.');
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  \App\Models\Service  $service
     * @return \Illuminate\Http\RedirectResponse
     */
    public function destroy(Service $service)
    {
        $service->delete();

        return to_route('services.index')->with('success', 'Jasa berhasil dihapus.');
    }
}
