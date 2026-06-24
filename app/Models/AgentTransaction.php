<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AgentTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'cashier_id',
        'cashier_shift_id',
        'agent_transaction_type_id',
        'bank_account_id',
        'agent_admin_bank_id',
        'agent_admin_loket_id',
        'transaction_date',
        'customer_name',
        'customer_phone',
        'reference_number',
        'nominal',
        'admin_fee_customer',
        'admin_fee_bank',
        'net_profit',
        'admin_fee_payment_method',
        'status',
        'notes',
    ];

    protected $casts = [
        'transaction_date' => 'datetime',
        'nominal' => 'integer',
        'admin_fee_customer' => 'integer',
        'admin_fee_bank' => 'integer',
        'net_profit' => 'integer',
        'agent_admin_bank_id' => 'integer',
        'agent_admin_loket_id' => 'integer',
    ];

    protected static function boot()
    {
        parent::boot();

        static::saving(function ($model) {
            $model->net_profit = (int) $model->admin_fee_customer - (int) $model->admin_fee_bank;
        });
    }

    public function cashier()
    {
        return $this->belongsTo(User::class, 'cashier_id');
    }

    public function cashierShift()
    {
        return $this->belongsTo(CashierShift::class);
    }

    public function agentTransactionType()
    {
        return $this->belongsTo(AgentTransactionType::class);
    }

    public function bankAccount()
    {
        return $this->belongsTo(BankAccount::class);
    }

    public function agentAdminBank()
    {
        return $this->belongsTo(AgentAdminBank::class);
    }

    public function agentAdminLoket()
    {
        return $this->belongsTo(AgentAdminLoket::class);
    }
}
