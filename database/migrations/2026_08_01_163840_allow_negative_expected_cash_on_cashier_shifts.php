<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Expected cash can legitimately go negative (e.g. agent cash-out
        // exceeding agent cash-in before the cashier tops up the float),
        // but these columns were unsigned. SQLite doesn't enforce the
        // unsigned constraint, so this only needs fixing on MySQL.
        if (Schema::getConnection()->getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE cashier_shifts MODIFY expected_cash BIGINT NOT NULL DEFAULT 0');
            DB::statement('ALTER TABLE cashier_shifts MODIFY agent_expected_cash BIGINT NOT NULL DEFAULT 0');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE cashier_shifts MODIFY expected_cash BIGINT UNSIGNED NOT NULL DEFAULT 0');
            DB::statement('ALTER TABLE cashier_shifts MODIFY agent_expected_cash BIGINT UNSIGNED NOT NULL DEFAULT 0');
        }
    }
};
