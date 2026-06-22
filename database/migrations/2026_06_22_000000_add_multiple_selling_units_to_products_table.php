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
            $table->text('description')->nullable()->change();

            $table->string('satuan_beli')->nullable()->after('title');
            $table->integer('isi_pcs_dalam_pack')->default(0)->after('satuan_beli');
            $table->integer('isi_pack_dalam_dus')->default(1)->after('isi_pcs_dalam_pack');
            $table->integer('isi_pcs_dalam_dus')->default(0)->after('isi_pack_dalam_dus');

            // DUS fields
            $table->string('satuan_jual_dus')->nullable()->after('isi_pcs_dalam_dus');
            $table->bigInteger('harga_beli_dus')->default(0)->after('satuan_jual_dus');
            $table->bigInteger('harga_jual_dus')->default(0)->after('harga_beli_dus');
            $table->integer('stok_dus')->default(0)->after('harga_jual_dus');

            // PAK fields
            $table->string('satuan_jual_pack')->nullable()->after('stok_dus');
            $table->bigInteger('harga_beli_pack')->default(0)->after('satuan_jual_pack');
            $table->bigInteger('harga_jual_pack')->default(0)->after('harga_beli_pack');
            $table->integer('stok_pack')->default(0)->after('harga_jual_pack');

            // PCS fields
            $table->string('satuan_jual_pcs')->nullable()->after('stok_pack');
            $table->bigInteger('harga_beli_pcs')->default(0)->after('satuan_jual_pcs');
            $table->bigInteger('harga_jual_pcs')->default(0)->after('harga_beli_pcs');
            $table->integer('stok_pcs')->default(0)->after('harga_jual_pcs');
        });

        Schema::table('carts', function (Blueprint $table) {
            $table->string('satuan')->nullable()->after('price');
            $table->string('satuan_key')->nullable()->after('satuan');
        });

        Schema::table('transaction_details', function (Blueprint $table) {
            $table->string('satuan')->nullable()->after('price');
            $table->string('satuan_key')->nullable()->after('satuan');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->text('description')->nullable(false)->change();

            $table->dropColumn([
                'satuan_beli',
                'isi_pcs_dalam_pack',
                'isi_pack_dalam_dus',
                'isi_pcs_dalam_dus',

                'satuan_jual_dus',
                'harga_beli_dus',
                'harga_jual_dus',
                'stok_dus',

                'satuan_jual_pack',
                'harga_beli_pack',
                'harga_jual_pack',
                'stok_pack',

                'satuan_jual_pcs',
                'harga_beli_pcs',
                'harga_jual_pcs',
                'stok_pcs',
            ]);
        });

        Schema::table('carts', function (Blueprint $table) {
            $table->dropColumn(['satuan', 'satuan_key']);
        });

        Schema::table('transaction_details', function (Blueprint $table) {
            $table->dropColumn(['satuan', 'satuan_key']);
        });
    }
};
