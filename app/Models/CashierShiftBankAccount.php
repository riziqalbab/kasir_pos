<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CashierShiftBankAccount extends Model
{
    use HasFactory;

    protected $fillable = [
        'cashier_shift_id',
        'bank_account_id',
        'opening_balance',
        'expected_balance',
        'actual_balance',
        'difference',
    ];

    protected $casts = [
        'opening_balance' => 'integer',
        'expected_balance' => 'integer',
        'actual_balance' => 'integer',
        'difference' => 'integer',
    ];

    public function cashierShift(): BelongsTo
    {
        return $this->belongsTo(CashierShift::class);
    }

    public function bankAccount(): BelongsTo
    {
        return $this->belongsTo(BankAccount::class);
    }
}
