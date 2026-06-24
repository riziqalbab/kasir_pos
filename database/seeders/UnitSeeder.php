<?php

namespace Database\Seeders;

use App\Models\Unit;
use Illuminate\Database\Seeder;

class UnitSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $units = [
            '1/4', '1/2', 'bag', 'bal', 'box', 'btl', 'cup', 'dus', 'galon', 'ikat', 'kg', 'lbr', 'ltr', 'lusin', 'pack', 'pcs', 'rim'
        ];

        foreach ($units as $unit) {
            Unit::firstOrCreate(['name' => $unit]);
        }
    }
}
