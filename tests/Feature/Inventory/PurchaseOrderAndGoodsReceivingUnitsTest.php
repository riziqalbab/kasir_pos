<?php

namespace Tests\Feature\Inventory;

use App\Models\Category;
use App\Models\GoodsReceiving;
use App\Models\GoodsReceivingItem;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class PurchaseOrderAndGoodsReceivingUnitsTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Supplier $supplier;
    protected Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        // Create user with necessary permissions
        $this->user = User::factory()->create();
        $this->user->givePermissionTo([
            Permission::firstOrCreate(['name' => 'purchase-orders-access', 'guard_name' => 'web']),
            Permission::firstOrCreate(['name' => 'purchase-orders-create', 'guard_name' => 'web']),
            Permission::firstOrCreate(['name' => 'purchase-orders-update', 'guard_name' => 'web']),
            Permission::firstOrCreate(['name' => 'goods-receivings-access', 'guard_name' => 'web']),
            Permission::firstOrCreate(['name' => 'goods-receivings-create', 'guard_name' => 'web']),
        ]);

        $this->supplier = Supplier::create([
            'name' => 'PT Test Supplier',
            'phone' => '08123456789',
            'address' => 'Jl. Test Supplier',
        ]);

        $category = Category::create([
            'name' => 'Sembako',
            'description' => 'Kategori sembako',
            'image' => 'category.png',
        ]);

        $this->product = Product::create([
            'category_id' => $category->id,
            'image' => 'product.png',
            'barcode' => 'BRCD-12345',
            'sku' => 'SKU-12345',
            'title' => 'Indomie Goreng Multi Unit',
            'satuan_beli' => 'Dus',
            'isi_pcs_dalam_pack' => 10,
            'isi_pack_dalam_dus' => 10,
            'isi_pcs_dalam_dus' => 100,

            // DUS
            'satuan_jual_dus' => 'Dus',
            'harga_beli_dus' => 250000,
            'harga_jual_dus' => 280000,
            'stok_dus' => 2,

            // PAK
            'satuan_jual_pack' => 'Pak',
            'harga_beli_pack' => 27000,
            'harga_jual_pack' => 30000,
            'stok_pack' => 5,

            // PCS
            'satuan_jual_pcs' => 'Pcs',
            'harga_beli_pcs' => 2800,
            'harga_jual_pcs' => 3200,
            'stok_pcs' => 10,

            // Overall stock
            'stock' => 260,
            'buy_price' => 2800,
            'sell_price' => 3200,
        ]);
    }

    public function test_user_can_create_purchase_order_with_units(): void
    {
        $response = $this
            ->actingAs($this->user)
            ->post(route('purchase-orders.store'), [
                'supplier_id' => $this->supplier->id,
                'document_number' => 'PO-TEST-001',
                'notes' => 'Catatan PO unit test',
                'items' => [
                    [
                        'product_id' => $this->product->id,
                        'qty_ordered' => 2,
                        'unit_price' => 250000,
                        'satuan' => 'Dus',
                        'satuan_key' => 'dus',
                    ]
                ]
            ]);

        $response->assertRedirect();
        
        $order = PurchaseOrder::where('document_number', 'PO-TEST-001')->first();
        $this->assertNotNull($order);
        $this->assertEquals('draft', $order->status);

        $this->assertDatabaseHas('purchase_order_items', [
            'purchase_order_id' => $order->id,
            'product_id' => $this->product->id,
            'qty_ordered' => 2,
            'qty_received' => 0,
            'unit_price' => 250000,
            'satuan' => 'Dus',
            'satuan_key' => 'dus',
        ]);
    }

    public function test_goods_receiving_with_units_converts_stock_correctly(): void
    {
        // 1. Setup Purchase Order with Dus unit
        $order = PurchaseOrder::create([
            'supplier_id' => $this->supplier->id,
            'document_number' => 'PO-TEST-002',
            'status' => 'ordered',
            'user_id' => $this->user->id,
        ]);

        $poItem = PurchaseOrderItem::create([
            'purchase_order_id' => $order->id,
            'product_id' => $this->product->id,
            'qty_ordered' => 3,
            'qty_received' => 0,
            'unit_price' => 250000,
            'satuan' => 'Dus',
            'satuan_key' => 'dus',
        ]);

        $initialStock = $this->product->stock; // 260

        // 2. Receive 2 Dus (should be equivalent to 2 * 100 = 200 Pcs)
        $response = $this
            ->actingAs($this->user)
            ->post(route('goods-receivings.store'), [
                'purchase_order_id' => $order->id,
                'notes' => 'Catatan penerimaan unit test',
                'items' => [
                    [
                        'purchase_order_item_id' => $poItem->id,
                        'qty_received' => 2,
                        'notes' => 'Diterima 2 Dus',
                    ]
                ]
            ]);

        $response->assertRedirect();

        // 3. Verify Goods Receiving documents and status
        $receiving = GoodsReceiving::latest('id')->first();
        $this->assertNotNull($receiving);
        $this->assertEquals($order->id, $receiving->purchase_order_id);

        $this->assertDatabaseHas('goods_receiving_items', [
            'goods_receiving_id' => $receiving->id,
            'product_id' => $this->product->id,
            'qty_received' => 2,
            'satuan' => 'Dus',
            'satuan_key' => 'dus',
        ]);

        // PO Item status update check: qty_received should be updated in the PO item
        $poItem->refresh();
        $this->assertEquals(2, $poItem->qty_received);

        // PO status should become partial_received
        $order->refresh();
        $this->assertEquals('partial_received', $order->status);

        // 4. Verify product stock update:
        // Stock increment = 2 Dus * 100 Pcs/Dus = 200 Pcs.
        // Total stock should be 260 + 200 = 460 Pcs.
        $this->product->refresh();
        $this->assertEquals($initialStock + 200, $this->product->stock);

        // 5. Verify stock mutation record
        $this->assertDatabaseHas('stock_mutations', [
            'product_id' => $this->product->id,
            'mutation_type' => 'in',
            'reference_type' => 'goods_receiving',
            'reference_id' => $receiving->id,
            'qty' => 200,
            'stock_before' => $initialStock,
            'stock_after' => $initialStock + 200,
        ]);
    }

    public function test_goods_receiving_with_pack_converts_stock_correctly(): void
    {
        // 1. Setup Purchase Order with Pack unit
        $order = PurchaseOrder::create([
            'supplier_id' => $this->supplier->id,
            'document_number' => 'PO-TEST-003',
            'status' => 'ordered',
            'user_id' => $this->user->id,
        ]);

        $poItem = PurchaseOrderItem::create([
            'purchase_order_id' => $order->id,
            'product_id' => $this->product->id,
            'qty_ordered' => 5,
            'qty_received' => 0,
            'unit_price' => 27000,
            'satuan' => 'Pak',
            'satuan_key' => 'pack',
        ]);

        $initialStock = $this->product->stock; // 260

        // 2. Receive 3 Pack (should be equivalent to 3 * 10 = 30 Pcs)
        $response = $this
            ->actingAs($this->user)
            ->post(route('goods-receivings.store'), [
                'purchase_order_id' => $order->id,
                'notes' => 'Catatan penerimaan unit test pack',
                'items' => [
                    [
                        'purchase_order_item_id' => $poItem->id,
                        'qty_received' => 3,
                        'notes' => 'Diterima 3 Pak',
                    ]
                ]
            ]);

        $response->assertRedirect();

        // 3. Verify Goods Receiving and stock update
        $receiving = GoodsReceiving::latest('id')->first();
        $this->assertNotNull($receiving);

        $this->assertDatabaseHas('goods_receiving_items', [
            'goods_receiving_id' => $receiving->id,
            'product_id' => $this->product->id,
            'qty_received' => 3,
            'satuan' => 'Pak',
            'satuan_key' => 'pack',
        ]);

        $this->product->refresh();
        $this->assertEquals($initialStock + 30, $this->product->stock);

        // 4. Verify stock mutation record
        $this->assertDatabaseHas('stock_mutations', [
            'product_id' => $this->product->id,
            'mutation_type' => 'in',
            'reference_type' => 'goods_receiving',
            'reference_id' => $receiving->id,
            'qty' => 30,
            'stock_before' => $initialStock,
            'stock_after' => $initialStock + 30,
        ]);
    }
}
