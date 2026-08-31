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
        Schema::dropIfExists('cashier_shift_bank_accounts');
        Schema::create('cashier_shift_bank_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cashier_shift_id')->constrained('cashier_shifts')->cascadeOnDelete();
            $table->foreignId('bank_account_id')->constrained('bank_accounts')->cascadeOnDelete();
            $table->bigInteger('opening_balance')->default(0);
            $table->bigInteger('expected_balance')->default(0);
            $table->bigInteger('actual_balance')->nullable();
            $table->bigInteger('difference')->nullable();
            $table->timestamps();

            $table->unique(['cashier_shift_id', 'bank_account_id'], 'shift_bank_account_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cashier_shift_bank_accounts');
    }
};
