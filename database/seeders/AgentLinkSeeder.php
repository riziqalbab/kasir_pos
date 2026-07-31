<?php

namespace Database\Seeders;

use App\Models\AgentAdminBank;
use App\Models\AgentAdminLoket;
use App\Models\AgentTransactionType;
use Illuminate\Database\Seeder;

class AgentLinkSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Seed default Admin Bank Link fees
        $bankFees = [
            ['code' => 'ADM0001', 'amount' => 0],
            ['code' => 'ADM0002', 'amount' => 500],
            ['code' => 'ADM0003', 'amount' => 1000],
            ['code' => 'ADM0004', 'amount' => 1500],
            ['code' => 'ADM0005', 'amount' => 2000],
            ['code' => 'ADM0006', 'amount' => 2500],
            ['code' => 'ADM0007', 'amount' => 3000],
            ['code' => 'ADM0008', 'amount' => 3500],
            ['code' => 'ADM0009', 'amount' => 4000],
            ['code' => 'ADM0010', 'amount' => 4500],
            ['code' => 'ADM0011', 'amount' => 5000],
            ['code' => 'ADM0012', 'amount' => 5500],
            ['code' => 'ADM0013', 'amount' => 6000],
            ['code' => 'ADM0014', 'amount' => 6500],
            ['code' => 'ADM0015', 'amount' => 7000],
            ['code' => 'ADM0016', 'amount' => 7500],
            ['code' => 'ADM0017', 'amount' => 8000],
            ['code' => 'ADM0018', 'amount' => 8500],
            ['code' => 'ADM0019', 'amount' => 9000],
            ['code' => 'ADM0020', 'amount' => 9500],
            ['code' => 'ADM0021', 'amount' => 10000],
        ];

        foreach ($bankFees as $fee) {
            AgentAdminBank::firstOrCreate(
                ['code' => $fee['code']],
                ['amount' => $fee['amount']]
            );
        }

        // Seed default Admin Loket fees
        $loketFees = [
            ['code' => 'Asuransi', 'amount' => 5000, 'description' => ''],
            ['code' => 'BPJSKes', 'amount' => 3000, 'description' => ''],
            ['code' => 'BRIVA01', 'amount' => 3000, 'description' => '0K s/d 100K'],
            ['code' => 'BRIVA02', 'amount' => 5000, 'description' => '101K s/d 500K'],
            ['code' => 'BRIVA03', 'amount' => 8000, 'description' => '501K s/d 1jt'],
            ['code' => 'BRIVA04', 'amount' => 10000, 'description' => '1.1jt s/d 2jt'],
            ['code' => 'BRIVA05', 'amount' => 20000, 'description' => '2.1jt s/d 3jt'],
            ['code' => 'Gadai', 'amount' => 3000, 'description' => ''],
            ['code' => 'Listrik', 'amount' => 0, 'description' => ''],
            ['code' => 'MPN', 'amount' => 10000, 'description' => ''],
            ['code' => 'Multifinance', 'amount' => 5000, 'description' => ''],
            ['code' => 'Pascabayar', 'amount' => 0, 'description' => ''],
            ['code' => 'PDAM', 'amount' => 0, 'description' => ''],
            ['code' => 'Tartu01', 'amount' => 0, 'description' => '10K s/d 50K'],
            ['code' => 'Tartu02', 'amount' => 3000, 'description' => '51K s/d 400K'],
            ['code' => 'Tartu03', 'amount' => 5000, 'description' => '401K s/d 1jt'],
            ['code' => 'Tartu04', 'amount' => 8000, 'description' => '1jt s/d 1.5jt'],
            ['code' => 'Tartu05', 'amount' => 10000, 'description' => '1.51jt s/d 3jt'],
            ['code' => 'Tartu06', 'amount' => 15000, 'description' => '3jt s/d 5jt'],
            ['code' => 'Tartu07', 'amount' => 30000, 'description' => '5.1jt s/d 10jt'],
            ['code' => 'TartuTF01', 'amount' => 0, 'description' => '0K s/d 100K'],
            ['code' => 'TartuTF02', 'amount' => 3000, 'description' => '101K s/d 500K'],
            ['code' => 'TartuTF03', 'amount' => 5000, 'description' => '501K s/d 1jt'],
            ['code' => 'TartuTF04', 'amount' => 8000, 'description' => '1.1jt s/d 2jt'],
            ['code' => 'TartuTF05', 'amount' => 10000, 'description' => '2.1jt s/d 5jt'],
            ['code' => 'TF01', 'amount' => 0, 'description' => '10K s/d 500K'],
            ['code' => 'TF02', 'amount' => 3000, 'description' => '501K s/d 1jt'],
            ['code' => 'TF03', 'amount' => 5000, 'description' => '1.1jt s/d 2jt'],
            ['code' => 'TF04', 'amount' => 8000, 'description' => '2.1jt s/d 3jt'],
            ['code' => 'TF05', 'amount' => 10000, 'description' => '3.1jt s/d 5jt'],
            ['code' => 'TF06', 'amount' => 20000, 'description' => '5.1jt s/d 10jt'],
            ['code' => 'TFNonBRI01', 'amount' => 0, 'description' => '10K s/d 500K'],
            ['code' => 'TFNonBRI02', 'amount' => 3000, 'description' => '501K s/d 1jt'],
            ['code' => 'TFNonBRI03', 'amount' => 5000, 'description' => '1.1jt s/d 3jt'],
            ['code' => 'TFNonBRI04', 'amount' => 10000, 'description' => '3jt s/d 5jt'],
            ['code' => 'TopUP01', 'amount' => 1500, 'description' => '10K s/d 50K'],
            ['code' => 'TopUP02', 'amount' => 3500, 'description' => '51K s/d 500K'],
            ['code' => 'TopUP03', 'amount' => 5000, 'description' => '500K s/d 1jt'],
            ['code' => 'TopUP04', 'amount' => 10000, 'description' => '1.1jt s/d 2jt'],
            ['code' => 'TopUP05', 'amount' => 20000, 'description' => '2.1jt s/d 3jt'],
            ['code' => 'Tronik', 'amount' => 3000, 'description' => 'Pulsa & Kuota'],
        ];

        foreach ($loketFees as $fee) {
            AgentAdminLoket::firstOrCreate(
                ['code' => $fee['code']],
                [
                    'amount' => $fee['amount'],
                    'description' => $fee['description'],
                ]
            );
        }

        // Seed default Agent Transaction Types (chart of accounts style)
        $transactionTypes = [
            ['kode' => 100, 'kategori' => 'Asset', 'nama' => 'Kas/Bank', 'nilai' => 'debet'],
            ['kode' => 101, 'kategori' => 'Asset', 'nama' => 'Kas Kecil', 'nilai' => 'debet'],
            ['kode' => 200, 'kategori' => 'Asset', 'nama' => 'Piutang', 'nilai' => 'debet'],
            ['kode' => 300, 'kategori' => 'Equity', 'nama' => 'Hutang', 'nilai' => 'kredit'],
            ['kode' => 400, 'kategori' => 'Income', 'nama' => 'Pendapatan Penjualan', 'nilai' => 'kredit'],
            ['kode' => 401, 'kategori' => 'Income', 'nama' => 'Pendapatan Lain-Lain', 'nilai' => 'kredit'],
            ['kode' => 500, 'kategori' => 'Expense', 'nama' => 'Biaya', 'nilai' => 'debet'],
            ['kode' => 501, 'kategori' => 'Expense', 'nama' => 'Biaya Listrik', 'nilai' => 'debet'],
            ['kode' => 600, 'kategori' => 'Liability', 'nama' => 'Ambil Prive', 'nilai' => 'debet'],
            ['kode' => 700, 'kategori' => 'Expense', 'nama' => 'Pembelian', 'nilai' => 'debet'],
            ['kode' => 800, 'kategori' => 'Asset', 'nama' => 'Retur Pembelian', 'nilai' => 'kredit'],
            ['kode' => 900, 'kategori' => 'Asset', 'nama' => 'Retur Penjualan', 'nilai' => 'debet'],
        ];

        foreach ($transactionTypes as $item) {
            AgentTransactionType::firstOrCreate(
                ['code' => (string) $item['kode']],
                [
                    'name' => $item['nama'],
                    'type' => $item['nilai'],
                    'description' => "Kategori: {$item['kategori']}",
                ]
            );
        }
    }
}
