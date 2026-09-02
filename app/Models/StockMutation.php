<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StockMutation extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'reference_type',
        'reference_id',
        'mutation_type',
        'qty',
        'stock_before',
        'stock_after',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'id' => 'integer',
        'product_id' => 'integer',
        'reference_id' => 'integer',
        'qty' => 'float',
        'stock_before' => 'float',
        'stock_after' => 'float',
        'created_by' => 'integer',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
