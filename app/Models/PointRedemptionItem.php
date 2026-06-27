<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PointRedemptionItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'point_redemption_id',
        'point_prize_id',
        'quantity',
        'points',
    ];

    protected $casts = [
        'point_redemption_id' => 'integer',
        'point_prize_id' => 'integer',
        'quantity' => 'integer',
        'points' => 'integer',
    ];

    public function pointRedemption()
    {
        return $this->belongsTo(PointRedemption::class);
    }

    public function pointPrize()
    {
        return $this->belongsTo(PointPrize::class);
    }
}
