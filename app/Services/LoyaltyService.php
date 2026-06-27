<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\LoyaltyPointHistory;
use App\Models\Setting;
use App\Models\Transaction;
use Illuminate\Support\Facades\DB;

class LoyaltyService
{
    /**
     * Calculate points based on the grand total and settings
     */
    public function calculatePoints(int $grandTotal): int
    {
        $enabled = Setting::getBool('loyalty_points_enabled', false);
        if (! $enabled) {
            return 0;
        }

        $threshold = Setting::getInt('loyalty_points_threshold', 0);
        $pointsAwarded = Setting::getInt('loyalty_points_awarded', 0);

        if ($threshold <= 0 || $pointsAwarded <= 0) {
            return 0;
        }

        return (int) (floor($grandTotal / $threshold) * $pointsAwarded);
    }

    /**
     * Award points for a transaction if it is paid, and customer is a loyalty member
     */
    public function awardPointsForTransaction(Transaction $transaction): void
    {
        if ($transaction->payment_status !== 'paid') {
            return;
        }

        $customer = $transaction->customer;
        if (! $customer || ! $customer->is_loyalty_member) {
            return;
        }

        // Check if we already recorded a loyalty history for this transaction earning points
        $exists = LoyaltyPointHistory::where('transaction_id', $transaction->id)
            ->where('type', 'earn')
            ->exists();

        if ($exists) {
            return;
        }

        $pointsEarned = $transaction->loyalty_points_earned;
        if ($pointsEarned <= 0) {
            // Recalculate if it wasn't saved in transaction yet
            $pointsEarned = $this->calculatePoints($transaction->grand_total);
            if ($pointsEarned <= 0) {
                return;
            }
            $transaction->update(['loyalty_points_earned' => $pointsEarned]);
        }

        DB::transaction(function () use ($customer, $transaction, $pointsEarned) {
            // Update customer points and stats
            $customer->increment('loyalty_points', $pointsEarned);
            $customer->increment('loyalty_total_spent', $transaction->grand_total);
            $customer->increment('loyalty_transaction_count', 1);
            if (! $customer->last_purchase_at || $transaction->created_at->gt($customer->last_purchase_at)) {
                $customer->update(['last_purchase_at' => $transaction->created_at]);
            }

            // Record history
            LoyaltyPointHistory::create([
                'customer_id' => $customer->id,
                'transaction_id' => $transaction->id,
                'type' => 'earn',
                'points_delta' => $pointsEarned,
                'balance_after' => $customer->loyalty_points,
                'amount_delta' => $transaction->grand_total,
                'reference' => $transaction->invoice,
                'notes' => 'Poin diperoleh dari transaksi POS.',
            ]);
        });
    }
}
