<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AgentTransactionType extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'name',
        'type', // debet or kredit
        'description',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function agentTransactions()
    {
        return $this->hasMany(AgentTransaction::class);
    }
}
