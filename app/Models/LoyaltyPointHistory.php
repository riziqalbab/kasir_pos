<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LoyaltyPointHistory extends Model
{
    use HasFactory;

    protected $table = 'loyalty_point_histories';

    protected $fillable = [
        'customer_id',
        'transaction_id',
        'type',
        'points_delta',
        'balance_after',
        'amount_delta',
        'reference',
        'notes',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function transaction()
    {
        return $this->belongsTo(Transaction::class);
    }
}
