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
        Schema::table('agent_transactions', function (Blueprint $table) {
            $table->foreignId('agent_admin_bank_id')->nullable()->after('agent_transaction_type_id')->constrained('agent_admin_banks')->nullOnDelete();
            $table->foreignId('agent_admin_loket_id')->nullable()->after('agent_admin_bank_id')->constrained('agent_admin_lokets')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('agent_transactions', function (Blueprint $table) {
            $table->dropForeign(['agent_admin_bank_id']);
            $table->dropColumn('agent_admin_bank_id');
            $table->dropForeign(['agent_admin_loket_id']);
            $table->dropColumn('agent_admin_loket_id');
        });
    }
};
