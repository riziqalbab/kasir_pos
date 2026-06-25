<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    use HasFactory;

    /**
     * fillable
     *
     * @var array
     */
    protected $fillable = [
        'member_code',
        'name',
        'no_telp',
        'address',
        'last_purchase_at',
        'province_id',
        'province_name',
        'regency_id',
        'regency_name',
        'district_id',
        'district_name',
        'village_id',
        'village_name',
        'is_loyalty_member',
        'loyalty_tier',
        'loyalty_points',
        'loyalty_total_spent',
        'loyalty_transaction_count',
        'loyalty_member_since',
    ];

    protected $casts = [
        'last_purchase_at' => 'datetime',
        'is_loyalty_member' => 'boolean',
        'loyalty_member_since' => 'datetime',
    ];

    public function loyaltyPointHistories()
    {
        return $this->hasMany(LoyaltyPointHistory::class);
    }

    public function salesReturns()
    {
        return $this->hasMany(SalesReturn::class);
    }

    public function customerCredits()
    {
        return $this->hasMany(CustomerCredit::class);
    }

    public function transactions()
    {
        return $this->hasMany(Transaction::class);
    }

    public function receivables()
    {
        return $this->hasMany(Receivable::class);
    }
}
