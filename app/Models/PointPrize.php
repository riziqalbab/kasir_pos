<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PointPrize extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'points_required',
    ];

    protected $casts = [
        'product_id' => 'integer',
        'points_required' => 'integer',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function redemptionItems()
    {
        return $this->hasMany(PointRedemptionItem::class);
    }
}
