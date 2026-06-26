<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Change column default to true
        Schema::table('customers', function (Blueprint $table) {
            $table->boolean('is_loyalty_member')->default(true)->change();
        });

        // Update existing customers
        DB::table('customers')->update([
            'is_loyalty_member' => true,
            'loyalty_member_since' => DB::raw('COALESCE(loyalty_member_since, created_at)')
        ]);

        DB::table('customers')->whereNull('loyalty_member_since')->update([
            'loyalty_member_since' => now()
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->boolean('is_loyalty_member')->default(false)->change();
        });
    }
};
