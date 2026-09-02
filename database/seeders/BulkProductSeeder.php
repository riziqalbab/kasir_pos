<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use App\Models\Unit;
use Illuminate\Database\Seeder;

class BulkProductSeeder extends Seeder
{
    /**
     * Run the database seeds for Bulk/Liquid/Decimal Products.
     */
    public function run(): void
    {
        // 1. Ensure units exist
        $units = ['Liter', 'ltr', 'Kg', 'kg', 'Gram', 'gr', 'Meter', 'pcs'];
        foreach ($units as $unitName) {
            Unit::firstOrCreate(['name' => $unitName]);
        }

        // 2. Ensure Category exists
        $category = Category::firstOrCreate(
            ['name' => 'BBM & Minyak Curah'],
            [
                'image' => 'category/default.jpg',
                'description' => 'Bahan bakar minyak dan kebutuhan curah dengan takaran desimal (Liter/Kg)',
            ]
        );

        // 3. Products sample data
        $products = [
            [
                'barcode' => 'BBM-PERTALITE',
                'title' => 'Pertalite',
                'description' => 'BBM Pertalite RON 90 per liter (mendukung pembelian nominal Rp)',
                'buy_price' => 10000,
                'sell_price' => 12500,
                'stock' => 200.000,
                'satuan_beli' => 'Liter',
                'satuan_jual_pcs' => 'Liter',
                'harga_beli_pcs' => 10000,
                'harga_jual_pcs' => 12500,
                'stok_pcs' => 200.000,
            ],
            [
                'barcode' => 'BBM-PERTAMAX',
                'title' => 'Pertamax',
                'description' => 'BBM Pertamax RON 92 per liter',
                'buy_price' => 12000,
                'sell_price' => 13700,
                'stock' => 150.000,
                'satuan_beli' => 'Liter',
                'satuan_jual_pcs' => 'Liter',
                'harga_beli_pcs' => 12000,
                'harga_jual_pcs' => 13700,
                'stok_pcs' => 150.000,
            ],
            [
                'barcode' => 'BBM-SOLAR',
                'title' => 'Solar Dexlite',
                'description' => 'BBM Solar industri/mobil diesel per liter',
                'buy_price' => 13000,
                'sell_price' => 14500,
                'stock' => 100.000,
                'satuan_beli' => 'Liter',
                'satuan_jual_pcs' => 'Liter',
                'harga_beli_pcs' => 13000,
                'harga_jual_pcs' => 14500,
                'stok_pcs' => 100.000,
            ],
            [
                'barcode' => 'CRH-MYK-01',
                'title' => 'Minyak Goreng Curah',
                'description' => 'Minyak goreng kelapa sawit curah per liter',
                'buy_price' => 13500,
                'sell_price' => 16000,
                'stock' => 80.000,
                'satuan_beli' => 'Liter',
                'satuan_jual_pcs' => 'Liter',
                'harga_beli_pcs' => 13500,
                'harga_jual_pcs' => 16000,
                'stok_pcs' => 80.000,
            ],
            [
                'barcode' => 'CRH-BRS-01',
                'title' => 'Beras Rojolele Curah (Kg)',
                'description' => 'Beras pulen curah timbangan per kilogram',
                'buy_price' => 12500,
                'sell_price' => 14500,
                'stock' => 100.000,
                'satuan_beli' => 'Kg',
                'satuan_jual_pcs' => 'Kg',
                'harga_beli_pcs' => 12500,
                'harga_jual_pcs' => 14500,
                'stok_pcs' => 100.000,
            ],
        ];

        foreach ($products as $item) {
            Product::updateOrCreate(
                ['barcode' => $item['barcode']],
                array_merge($item, [
                    'category_id' => $category->id,
                    'image' => 'products/default.jpg',
                ])
            );
        }

        $this->command?->info('Bulk & fuel products seeded successfully!');
    }
}

