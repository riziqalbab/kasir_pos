<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchase_order_items', function (Blueprint $table) {
            $table->string('satuan')->nullable()->after('unit_price');
            $table->string('satuan_key')->nullable()->after('satuan');
        });

        Schema::table('goods_receiving_items', function (Blueprint $table) {
            $table->string('satuan')->nullable()->after('qty_received');
            $table->string('satuan_key')->nullable()->after('satuan');
        });
    }

    public function down(): void
    {
        Schema::table('purchase_order_items', function (Blueprint $table) {
            $table->dropColumn(['satuan', 'satuan_key']);
        });

        Schema::table('goods_receiving_items', function (Blueprint $table) {
            $table->dropColumn(['satuan', 'satuan_key']);
        });
    }
};
