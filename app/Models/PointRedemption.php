<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PointRedemption extends Model
{
    use HasFactory;

    protected $fillable = [
        'redemption_code',
        'customer_id',
        'user_id',
        'cashier_shift_id',
        'total_points',
        'notes',
    ];

    protected $casts = [
        'customer_id' => 'integer',
        'user_id' => 'integer',
        'cashier_shift_id' => 'integer',
        'total_points' => 'integer',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function cashier()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function cashierShift()
    {
        return $this->belongsTo(CashierShift::class);
    }

    public function items()
    {
        return $this->hasMany(PointRedemptionItem::class);
    }
}
