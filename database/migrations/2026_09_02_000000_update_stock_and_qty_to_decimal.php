<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->decimal('stock', 15, 3)->default(0)->change();
            $table->decimal('isi_pcs_dalam_pack', 15, 3)->default(0)->change();
            $table->decimal('isi_pack_dalam_dus', 15, 3)->default(1)->change();
            $table->decimal('isi_pcs_dalam_dus', 15, 3)->default(0)->change();
            $table->decimal('stok_dus', 15, 3)->default(0)->change();
            $table->decimal('stok_pack', 15, 3)->default(0)->change();
            $table->decimal('stok_pcs', 15, 3)->default(0)->change();
        });

        Schema::table('carts', function (Blueprint $table) {
            $table->decimal('qty', 15, 3)->default(1)->change();
        });

        Schema::table('transaction_details', function (Blueprint $table) {
            $table->decimal('qty', 15, 3)->default(1)->change();
        });

        if (Schema::hasTable('stock_mutations')) {
            Schema::table('stock_mutations', function (Blueprint $table) {
                $table->decimal('qty', 15, 3)->default(0)->change();
                $table->decimal('stock_before', 15, 3)->default(0)->change();
                $table->decimal('stock_after', 15, 3)->default(0)->change();
            });
        }

        if (Schema::hasTable('stock_opname_items')) {
            Schema::table('stock_opname_items', function (Blueprint $table) {
                $table->decimal('system_stock', 15, 3)->default(0)->change();
                $table->decimal('physical_stock', 15, 3)->nullable()->change();
                $table->decimal('difference', 15, 3)->nullable()->change();
            });
        }

        if (Schema::hasTable('sales_return_items')) {
            Schema::table('sales_return_items', function (Blueprint $table) {
                $table->decimal('qty_sold', 15, 3)->default(0)->change();
                $table->decimal('qty_returned_before', 15, 3)->default(0)->change();
                $table->decimal('qty_return', 15, 3)->default(0)->change();
            });
        }

        if (Schema::hasTable('purchase_order_items')) {
            Schema::table('purchase_order_items', function (Blueprint $table) {
                $table->decimal('qty_ordered', 15, 3)->default(0)->change();
                $table->decimal('qty_received', 15, 3)->default(0)->change();
            });
        }

        if (Schema::hasTable('goods_receiving_items')) {
            Schema::table('goods_receiving_items', function (Blueprint $table) {
                $table->decimal('qty_received', 15, 3)->default(0)->change();
            });
        }

        if (Schema::hasTable('supplier_return_items')) {
            Schema::table('supplier_return_items', function (Blueprint $table) {
                $table->decimal('qty_returned', 15, 3)->default(0)->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->integer('stock')->default(0)->change();
            $table->integer('isi_pcs_dalam_pack')->default(0)->change();
            $table->integer('isi_pack_dalam_dus')->default(1)->change();
            $table->integer('isi_pcs_dalam_dus')->default(0)->change();
            $table->integer('stok_dus')->default(0)->change();
            $table->integer('stok_pack')->default(0)->change();
            $table->integer('stok_pcs')->default(0)->change();
        });

        Schema::table('carts', function (Blueprint $table) {
            $table->integer('qty')->default(1)->change();
        });

        Schema::table('transaction_details', function (Blueprint $table) {
            $table->integer('qty')->default(1)->change();
        });
    }
};
