<?php

namespace App\Http\Controllers\Apps;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use App\Models\Unit;
use App\Services\AuditLogService;
use App\Services\StockMutationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class ProductController extends Controller
{
    public function __construct(
        private readonly StockMutationService $stockMutationService,
        private readonly AuditLogService $auditLogService
    ) {}

    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index()
    {
        // get products
        $products = Product::when(request()->search, function ($products) {
            $products = $products->where('title', 'like', '%'.request()->search.'%');
        })->with('category')->latest()->paginate(5);

        // return inertia
        return Inertia::render('Dashboard/Products/Index', [
            'products' => $products,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function create()
    {
        // get categories
        $categories = Category::all();
        // get units
        $units = Unit::orderBy('name')->get();

        // return inertia
        return Inertia::render('Dashboard/Products/Create', [
            'categories' => $categories,
            'units' => $units,
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
            'barcode' => 'required|unique:products,barcode',
            'sku' => 'nullable|unique:products,sku',
            'title' => 'required',
            'category_id' => 'required',
            'image' => 'nullable|image|mimes:jpeg,jpg,png|max:2048',
            'satuan_beli' => 'nullable|string',
            'isi_pcs_dalam_pack' => 'nullable|integer|min:0',
            'isi_pack_dalam_dus' => 'nullable|integer|min:1',
            'isi_pcs_dalam_dus' => 'nullable|integer|min:0',

            'satuan_jual_dus' => 'nullable|string',
            'harga_beli_dus' => 'nullable|integer|min:0',
            'harga_jual_dus' => 'nullable|integer|min:0',
            'stok_dus' => 'nullable|integer|min:0',

            'satuan_jual_pack' => 'nullable|string',
            'harga_beli_pack' => 'nullable|integer|min:0',
            'harga_jual_pack' => 'nullable|integer|min:0',
            'stok_pack' => 'nullable|integer|min:0',

            'satuan_jual_pcs' => 'nullable|string',
            'harga_beli_pcs' => 'nullable|integer|min:0',
            'harga_jual_pcs' => 'nullable|integer|min:0',
            'stok_pcs' => 'nullable|integer|min:0',

            // Fallback inputs for backward compatibility
            'buy_price' => 'nullable|integer|min:0',
            'sell_price' => 'nullable|integer|min:0',
            'stock' => 'nullable|integer|min:0',
        ]);

        // upload image
        $imageName = null;
        if ($request->hasFile('image')) {
            $image = $request->file('image');
            $image->storeAs('public/products', $image->hashName());
            $imageName = $image->hashName();
        }

        $isiPcsDalamPack = (int) $request->input('isi_pcs_dalam_pack', 0);
        $isiPackDalamDus = (int) $request->input('isi_pack_dalam_dus', 1);
        $isiPcsDalamDus = (int) $request->input('isi_pcs_dalam_dus', 0);
        if ($isiPcsDalamDus === 0 && $isiPcsDalamPack > 0) {
            $isiPcsDalamDus = $isiPcsDalamPack * $isiPackDalamDus;
        }

        $satuanBeli = $request->input('satuan_beli') ?: 'Pcs';
        $satuanJualPcs = $request->input('satuan_jual_pcs') ?: 'Pcs';

        $buyPricePcs = (int) ($request->filled('harga_beli_pcs') ? $request->harga_beli_pcs : $request->input('buy_price', 0));
        $sellPricePcs = (int) ($request->filled('harga_jual_pcs') ? $request->harga_jual_pcs : $request->input('sell_price', 0));

        $stokPcs = (int) ($request->filled('stok_pcs') ? $request->stok_pcs : $request->input('stock', 0));

        $stokDus = (int) $request->input('stok_dus', 0);
        $stokPack = (int) $request->input('stok_pack', 0);
        $computedStock = ($stokDus * $isiPcsDalamDus) + ($stokPack * $isiPcsDalamPack) + $stokPcs;

        $sku = $request->input('sku');
        if (empty($sku)) {
            do {
                $sku = 'SKU-'.strtoupper(\Illuminate\Support\Str::random(8));
            } while (Product::where('sku', $sku)->exists());
        }

        // create product
        $product = Product::create([
            'image' => $imageName,
            'barcode' => $request->barcode,
            'sku' => $sku,
            'title' => $request->title,
            'description' => $request->description,
            'category_id' => $request->category_id,
            'buy_price' => $buyPricePcs,
            'sell_price' => $sellPricePcs,
            'stock' => $computedStock,
            'satuan_beli' => $satuanBeli,
            'isi_pcs_dalam_pack' => $isiPcsDalamPack,
            'isi_pack_dalam_dus' => $isiPackDalamDus,
            'isi_pcs_dalam_dus' => $isiPcsDalamDus,
            'satuan_jual_dus' => $request->satuan_jual_dus,
            'harga_beli_dus' => (int) $request->input('harga_beli_dus', 0),
            'harga_jual_dus' => (int) $request->input('harga_jual_dus', 0),
            'stok_dus' => $stokDus,
            'satuan_jual_pack' => $request->satuan_jual_pack,
            'harga_beli_pack' => (int) $request->input('harga_beli_pack', 0),
            'harga_jual_pack' => (int) $request->input('harga_jual_pack', 0),
            'stok_pack' => $stokPack,
            'satuan_jual_pcs' => $satuanJualPcs,
            'harga_beli_pcs' => $buyPricePcs,
            'harga_jual_pcs' => $sellPricePcs,
            'stok_pcs' => $stokPcs,
        ]);

        $this->stockMutationService->recordInitialStock($product, $request->user()?->id);
        $this->auditLogService->log(
            event: 'product.created',
            module: 'products',
            auditable: $product,
            description: 'Produk baru dibuat.',
            after: $this->productAuditPayload($product->fresh())
        );

        // redirect
        return to_route('products.index');
    }

    /**
     * Show the form for editing the specified resource.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function edit(Product $product)
    {
        // get categories
        $categories = Category::all();
        // get units
        $units = Unit::orderBy('name')->get();

        return Inertia::render('Dashboard/Products/Edit', [
            'product' => $product,
            'categories' => $categories,
            'units' => $units,
        ]);
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function update(Request $request, Product $product)
    {
        $before = $this->productAuditPayload($product);

        /**
         * validate
         */
        $request->validate([
            'barcode' => 'required|unique:products,barcode,'.$product->id,
            'sku' => 'nullable|unique:products,sku,'.$product->id,
            'title' => 'required',
            'category_id' => 'required',
            'satuan_beli' => 'nullable|string',
            'isi_pcs_dalam_pack' => 'nullable|integer|min:0',
            'isi_pack_dalam_dus' => 'nullable|integer|min:1',
            'isi_pcs_dalam_dus' => 'nullable|integer|min:0',

            'satuan_jual_dus' => 'nullable|string',
            'harga_beli_dus' => 'nullable|integer|min:0',
            'harga_jual_dus' => 'nullable|integer|min:0',

            'satuan_jual_pack' => 'nullable|string',
            'harga_beli_pack' => 'nullable|integer|min:0',
            'harga_jual_pack' => 'nullable|integer|min:0',

            'satuan_jual_pcs' => 'nullable|string',
            'harga_beli_pcs' => 'nullable|integer|min:0',
            'harga_jual_pcs' => 'nullable|integer|min:0',

            // Fallback inputs for backward compatibility
            'buy_price' => 'nullable|integer|min:0',
            'sell_price' => 'nullable|integer|min:0',
            'stock' => 'nullable|integer|min:0',
        ]);

        $isiPcsDalamPack = (int) $request->input('isi_pcs_dalam_pack', 0);
        $isiPackDalamDus = (int) $request->input('isi_pack_dalam_dus', 1);
        $isiPcsDalamDus = (int) $request->input('isi_pcs_dalam_dus', 0);
        if ($isiPcsDalamDus === 0 && $isiPcsDalamPack > 0) {
            $isiPcsDalamDus = $isiPcsDalamPack * $isiPackDalamDus;
        }

        $satuanBeli = $request->input('satuan_beli') ?: ($product->satuan_beli ?: 'Pcs');
        $satuanJualPcs = $request->input('satuan_jual_pcs') ?: ($product->satuan_jual_pcs ?: 'Pcs');

        $buyPricePcs = (int) ($request->filled('harga_beli_pcs') ? $request->harga_beli_pcs : $request->input('buy_price', $product->buy_price));
        $sellPricePcs = (int) ($request->filled('harga_jual_pcs') ? $request->harga_jual_pcs : $request->input('sell_price', $product->sell_price));

        $sku = $request->input('sku');
        if (empty($sku)) {
            do {
                $sku = 'SKU-'.strtoupper(\Illuminate\Support\Str::random(8));
            } while (Product::where('sku', $sku)->exists());
        }

        $updateData = [
            'barcode' => $request->barcode,
            'sku' => $sku,
            'title' => $request->title,
            'description' => $request->description,
            'category_id' => $request->category_id,
            'buy_price' => $buyPricePcs,
            'sell_price' => $sellPricePcs,
            'satuan_beli' => $satuanBeli,
            'isi_pcs_dalam_pack' => $isiPcsDalamPack,
            'isi_pack_dalam_dus' => $isiPackDalamDus,
            'isi_pcs_dalam_dus' => $isiPcsDalamDus,
            'satuan_jual_dus' => $request->satuan_jual_dus,
            'harga_beli_dus' => (int) $request->input('harga_beli_dus', 0),
            'harga_jual_dus' => (int) $request->input('harga_jual_dus', 0),
            'satuan_jual_pack' => $request->satuan_jual_pack,
            'harga_beli_pack' => (int) $request->input('harga_beli_pack', 0),
            'harga_jual_pack' => (int) $request->input('harga_jual_pack', 0),
            'satuan_jual_pcs' => $satuanJualPcs,
            'harga_beli_pcs' => $buyPricePcs,
            'harga_jual_pcs' => $sellPricePcs,
        ];

        // check image update
        if ($request->file('image')) {

            // remove old image
            Storage::disk('local')->delete('public/products/'.basename($product->image));

            // upload new image
            $image = $request->file('image');
            $image->storeAs('public/products', $image->hashName());
            $updateData['image'] = $image->hashName();
        }

        $product->update($updateData);

        $this->logProductUpdate($product, $before);

        return to_route('products.index');
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function destroy($id)
    {
        // find by ID
        $product = Product::findOrFail($id);
        $before = $this->productAuditPayload($product);

        // remove image
        Storage::disk('local')->delete('public/products/'.basename($product->image));

        // delete
        $product->delete();

        $this->auditLogService->log(
            event: 'product.deleted',
            module: 'products',
            auditable: $product,
            description: 'Produk dihapus.',
            before: $before
        );

        // redirect
        return back();
    }

    private function logProductUpdate(Product $product, array $before): void
    {
        $after = $this->productAuditPayload($product->fresh());

        $this->auditLogService->log(
            event: 'product.updated',
            module: 'products',
            auditable: $product,
            description: 'Data produk diperbarui.',
            before: $before,
            after: $after
        );

        if (
            (int) $before['buy_price'] !== (int) $after['buy_price']
            || (int) $before['sell_price'] !== (int) $after['sell_price']
        ) {
            $this->auditLogService->log(
                event: 'product.price_updated',
                module: 'products',
                auditable: $product,
                description: 'Harga produk diperbarui.',
                before: [
                    'buy_price' => $before['buy_price'],
                    'sell_price' => $before['sell_price'],
                ],
                after: [
                    'buy_price' => $after['buy_price'],
                    'sell_price' => $after['sell_price'],
                ]
            );
        }
    }

    private function productAuditPayload(Product $product): array
    {
        return $this->auditLogService->only($product->toArray(), [
            'title',
            'barcode',
            'sku',
            'buy_price',
            'sell_price',
            'stock',
            'category_id',
            'satuan_beli',
            'isi_pcs_dalam_pack',
            'isi_pack_dalam_dus',
            'isi_pcs_dalam_dus',
            'satuan_jual_dus',
            'harga_beli_dus',
            'harga_jual_dus',
            'satuan_jual_pack',
            'harga_beli_pack',
            'harga_jual_pack',
            'satuan_jual_pcs',
            'harga_beli_pcs',
            'harga_jual_pcs',
        ]);
    }
}
