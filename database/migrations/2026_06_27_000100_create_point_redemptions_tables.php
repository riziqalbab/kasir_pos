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
        Schema::create('point_redemptions', function (Blueprint $table) {
            $table->id();
            $table->string('redemption_code')->unique();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('cashier_shift_id')->nullable()->constrained()->nullOnDelete();
            $table->integer('total_points');
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('point_redemption_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('point_redemption_id')->constrained()->cascadeOnDelete();
            $table->foreignId('point_prize_id')->constrained()->cascadeOnDelete();
            $table->integer('quantity');
            $table->integer('points'); // points per item at redemption time
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('point_redemption_items');
        Schema::dropIfExists('point_redemptions');
    }
};
