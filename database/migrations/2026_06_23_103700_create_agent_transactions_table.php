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
        Schema::create('agent_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cashier_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('cashier_shift_id')->nullable()->constrained('cashier_shifts')->nullOnDelete();
            $table->foreignId('agent_transaction_type_id')->constrained('agent_transaction_types')->cascadeOnDelete();
            $table->foreignId('bank_account_id')->nullable()->constrained('bank_accounts')->nullOnDelete();
            $table->dateTime('transaction_date');
            $table->string('customer_name')->nullable();
            $table->string('customer_phone')->nullable();
            $table->string('reference_number')->nullable();
            $table->unsignedBigInteger('nominal');
            $table->unsignedBigInteger('admin_fee_customer')->default(0);
            $table->unsignedBigInteger('default_admin_fee_bank')->default(0); // wait, let's name it admin_fee_bank to match our plan
            $table->unsignedBigInteger('admin_fee_bank')->default(0);
            $table->bigInteger('net_profit')->default(0);
            $table->string('admin_fee_payment_method', 15)->default('cash'); // cash or bank
            $table->string('status', 15)->default('success'); // success, pending, failed
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('agent_transactions');
    }
};
