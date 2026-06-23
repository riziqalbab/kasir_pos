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
            $table->unsignedBigInteger('agent_cash_in_total')->default(0)->after('non_cash_refund_total');
            $table->unsignedBigInteger('agent_cash_out_total')->default(0)->after('agent_cash_in_total');
            $table->unsignedBigInteger('agent_fees_cash_in_total')->default(0)->after('agent_cash_out_total');
            $table->unsignedInteger('agent_transactions_count')->default(0)->after('sales_returns_count');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cashier_shifts', function (Blueprint $table) {
            $table->dropColumn([
                'agent_cash_in_total',
                'agent_cash_out_total',
                'agent_fees_cash_in_total',
                'agent_transactions_count',
            ]);
        });
    }
};
