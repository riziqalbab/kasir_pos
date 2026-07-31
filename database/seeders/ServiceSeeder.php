<?php

namespace Database\Seeders;

use App\Models\Service;
use App\Models\ServicePrice;
use App\Models\Unit;
use Illuminate\Database\Seeder;

class ServiceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Pastikan unit 'pcs' tersedia sebagai satuan default jasa
        $unit = Unit::firstOrCreate(['name' => 'pcs']);

        $servicesData = [
            [
                'Nama' => 'Foto Cop HVS 70g',
                'Tarif' => 500,
                'Kode' => 'FC016',
            ],
            [
                'Nama' => 'Foto Copy K. Warna',
                'Tarif' => 1000,
                'Kode' => 'FC019',
            ],
            [
                'Nama' => 'Foto Copy Bufalo',
                'Tarif' => 2000,
                'Kode' => 'FC018',
            ],
            [
                'Nama' => 'Rental',
                'Tarif' => 2000,
                'Kode' => 'FC037',
            ],
            [
                'Nama' => 'Print B/W',
                'Tarif' => 1000,
                'Kode' => 'FC033',
            ],
            [
                'Nama' => 'Print Warma',
                'Tarif' => 1500,
                'Kode' => 'FC036',
            ],
            [
                'Nama' => 'Print Full Color',
                'Tarif' => 2000,
                'Kode' => 'FC035',
            ],
            [
                'Nama' => 'Jilid Langsung',
                'Tarif' => 1500,
                'Kode' => 'FC024',
            ],
            [
                'Nama' => 'Jilid Bufalo',
                'Tarif' => 2500,
                'Kode' => 'FC021',
            ],
            [
                'Nama' => 'Jilid Mika',
                'Tarif' => 2500,
                'Kode' => 'FC025',
            ],
            [
                'Nama' => 'Jilid Bufalo &Mika',
                'Tarif' => 5000,
                'Kode' => 'FC022',
            ],
            [
                'Nama' => 'Cetak Bener',
                'Tarif' => 25000,
                'Kode' => 'FC006',
            ],
            [
                'Nama' => 'Desain',
                'Tarif' => 25000,
                'Kode' => 'FC013',
            ],
            [
                'Nama' => 'Scen',
                'Tarif' => 3000,
                'Kode' => 'FC038',
            ],
            [
                'Nama' => 'Kompres File',
                'Tarif' => 1000,
                'Kode' => 'FC026',
            ],
            [
                'Nama' => 'Laminating KTP/SIM',
                'Tarif' => 2000,
                'Kode' => 'FC029',
            ],
            [
                'Nama' => 'Laminating F4',
                'Tarif' => 4000,
                'Kode' => 'FC028',
            ],
            [
                'Nama' => 'Pres KTP/SIM',
                'Tarif' => 2000,
                'Kode' => 'FC031',
            ],
            [
                'Nama' => 'Pres F4',
                'Tarif' => 4000,
                'Kode' => 'FC030',
            ],
            [
                'Nama' => 'Edit File',
                'Tarif' => 500,
                'Kode' => 'FC014',
            ],
            [
                'Nama' => 'Laminating ¾',
                'Tarif' => 3000,
                'Kode' => 'FC027',
            ],
            [
                'Nama' => 'Print Bufalo',
                'Tarif' => 2000,
                'Kode' => 'FC034',
            ],
            [
                'Nama' => 'Jilid Hard Cover',
                'Tarif' => 25000,
                'Kode' => 'FC023',
            ],
            [
                'Nama' => 'Flayer A2',
                'Tarif' => 2000,
                'Kode' => 'FC015',
            ],
            [
                'Nama' => 'Besekan B/W',
                'Tarif' => 500,
                'Kode' => 'FC001',
            ],
            [
                'Nama' => 'Besekan K. Warna',
                'Tarif' => 1000,
                'Kode' => 'FC003',
            ],
            [
                'Nama' => 'Besekan Warna',
                'Tarif' => 1000,
                'Kode' => 'FC004',
            ],
            [
                'Nama' => 'Besekan Full Color',
                'Tarif' => 2000,
                'Kode' => 'FC002',
            ],
            [
                'Nama' => 'Cetak Label',
                'Tarif' => 3000,
                'Kode' => 'FC011',
            ],
            [
                'Nama' => 'Cetak Foto 2X3',
                'Tarif' => 1000,
                'Kode' => 'FC007',
            ],
            [
                'Nama' => 'Cetak Foto 3X4',
                'Tarif' => 1000,
                'Kode' => 'FC008',
            ],
            [
                'Nama' => 'Cetak Foto 4X6',
                'Tarif' => 1000,
                'Kode' => 'FC009',
            ],
            [
                'Nama' => 'Ganti Begron',
                'Tarif' => 1000,
                'Kode' => 'FC020',
            ],
            [
                'Nama' => 'Cetak Sertifikat',
                'Tarif' => 10000,
                'Kode' => 'FC012',
            ],
            [
                'Nama' => 'Cetak Ivori 230',
                'Tarif' => 2000,
                'Kode' => 'FC010',
            ],
            [
                'Nama' => 'Besekan AP120',
                'Tarif' => 2000,
                'Kode' => 'FC005',
            ],
            [
                'Nama' => 'Foto Cop HVS A3',
                'Tarif' => 1500,
                'Kode' => 'FC017',
            ],
            [
                'Nama' => 'Print A3',
                'Tarif' => 2000,
                'Kode' => 'FC032',
            ],
        ];

        foreach ($servicesData as $item) {
            $cleanName = trim($item['Nama']);
            $code = isset($item['Kode']) ? trim($item['Kode']) : null;

            $service = Service::updateOrCreate(
                ['name' => $cleanName],
                ['description' => $code ? "Kode: {$code}" : null]
            );

            ServicePrice::updateOrCreate(
                [
                    'service_id' => $service->id,
                    'unit_id' => $unit->id,
                ],
                [
                    'price' => (int) $item['Tarif'],
                ]
            );
        }
    }
}
