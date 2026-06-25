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
        Schema::table('profits', function (Blueprint $table) {
            $table->unsignedBigInteger('product_id')->nullable()->after('transaction_id');
            $table->unsignedBigInteger('service_id')->nullable()->after('product_id');

            $table->foreign('product_id')->references('id')->on('products')->onDelete('set null');
            $table->foreign('service_id')->references('id')->on('services')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('profits', function (Blueprint $table) {
            $table->dropForeign(['product_id']);
            $table->dropForeign(['service_id']);
            $table->dropColumn(['product_id', 'service_id']);
        });
    }
};
