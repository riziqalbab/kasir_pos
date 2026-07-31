<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class ProductSortTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::firstOrCreate(['name' => 'products-access', 'guard_name' => 'web']);
    }

    private function createProduct(array $attributes = []): Product
    {
        static $counter = 1;
        $counter++;

        $category = Category::firstOrCreate(
            ['name' => 'General'],
            ['image' => 'category-default.png', 'description' => 'General category description']
        );

        return Product::create(array_merge([
            'image' => 'default.png',
            'barcode' => 'BC-'.$counter.'-'.rand(1000, 9999),
            'sku' => 'SKU-'.$counter.'-'.rand(1000, 9999),
            'title' => 'Product '.$counter,
            'description' => 'Test description',
            'category_id' => $category->id,
            'buy_price' => 10000,
            'sell_price' => 15000,
            'stock' => 50,
        ], $attributes));
    }

    public function test_products_can_be_sorted_by_updated_at_desc(): void
    {
        $user = User::factory()->create();
        $user->givePermissionTo('products-access');

        $productOld = $this->createProduct([
            'title' => 'Product Alpha',
            'created_at' => now()->subDays(5),
            'updated_at' => now()->subDays(5),
        ]);

        $productNewer = $this->createProduct([
            'title' => 'Product Beta',
            'created_at' => now()->subDays(2),
            'updated_at' => now()->subDays(2),
        ]);

        // Explicitly set updated_at of old product to future time
        $productOld->updated_at = now()->addHour();
        $productOld->save();

        $response = $this
            ->actingAs($user)
            ->get(route('products.index', ['sort' => 'updated_at_desc']));

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard/Products/Index')
            ->has('products.data', 2)
            ->where('products.data.0.id', $productOld->id)
            ->where('products.data.1.id', $productNewer->id)
            ->where('filters.sort', 'updated_at_desc')
        );
    }

    public function test_products_can_be_sorted_by_created_at_desc_by_default(): void
    {
        $user = User::factory()->create();
        $user->givePermissionTo('products-access');

        $productFirst = $this->createProduct([
            'title' => 'Product First',
            'created_at' => now()->subDays(5),
        ]);

        $productSecond = $this->createProduct([
            'title' => 'Product Second',
            'created_at' => now()->subDays(1),
        ]);

        $response = $this
            ->actingAs($user)
            ->get(route('products.index'));

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard/Products/Index')
            ->has('products.data', 2)
            ->where('products.data.0.id', $productSecond->id)
            ->where('products.data.1.id', $productFirst->id)
        );
    }

    public function test_products_can_be_sorted_by_title_and_stock_and_price(): void
    {
        $user = User::factory()->create();
        $user->givePermissionTo('products-access');

        $this->createProduct([
            'title' => 'Zebra Item',
            'stock' => 100,
            'sell_price' => 50000,
        ]);

        $this->createProduct([
            'title' => 'Apple Item',
            'stock' => 10,
            'sell_price' => 10000,
        ]);

        // Test title_asc
        $resTitle = $this
            ->actingAs($user)
            ->get(route('products.index', ['sort' => 'title_asc']));

        $resTitle->assertInertia(fn (Assert $page) => $page
            ->where('products.data.0.title', 'Apple Item')
            ->where('products.data.1.title', 'Zebra Item')
        );

        // Test stock_asc
        $resStock = $this
            ->actingAs($user)
            ->get(route('products.index', ['sort' => 'stock_asc']));

        $resStock->assertInertia(fn (Assert $page) => $page
            ->where('products.data.0.title', 'Apple Item')
            ->where('products.data.1.title', 'Zebra Item')
        );

        // Test price_desc
        $resPrice = $this
            ->actingAs($user)
            ->get(route('products.index', ['sort' => 'price_desc']));

        $resPrice->assertInertia(fn (Assert $page) => $page
            ->where('products.data.0.title', 'Zebra Item')
            ->where('products.data.1.title', 'Apple Item')
        );
    }
}
