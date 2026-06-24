<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Service extends Model
{
    use HasFactory;

    /**
     * fillable
     *
     * @var array
     */
    protected $fillable = [
        'name',
        'description',
    ];

    /**
     * servicePrices
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function servicePrices()
    {
        return $this->hasMany(ServicePrice::class);
    }

    /**
     * units
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsToMany
     */
    public function units()
    {
        return $this->belongsToMany(Unit::class, 'service_prices');
    }
}
