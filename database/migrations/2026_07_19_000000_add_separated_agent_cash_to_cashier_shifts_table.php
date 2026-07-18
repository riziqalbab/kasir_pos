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
        Schema::table('cashier_shifts', function (Blueprint $table) {
            $table->unsignedBigInteger('agent_opening_cash')->default(0)->after('opening_cash');
            $table->unsignedBigInteger('agent_expected_cash')->default(0)->after('expected_cash');
            $table->unsignedBigInteger('agent_actual_cash')->nullable()->after('actual_cash');
            $table->bigInteger('agent_cash_difference')->nullable()->after('cash_difference');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cashier_shifts', function (Blueprint $table) {
            $table->dropColumn([
                'agent_opening_cash',
                'agent_expected_cash',
                'agent_actual_cash',
                'agent_cash_difference',
            ]);
        });
    }
};
