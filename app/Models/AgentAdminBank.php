<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AgentAdminBank extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'amount',
    ];

    protected $casts = [
        'amount' => 'integer',
    ];

    public function agentTransactions()
    {
        return $this->hasMany(AgentTransaction::class);
    }
}
