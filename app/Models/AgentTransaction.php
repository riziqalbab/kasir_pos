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

    public function getBalanceEffect(): int
    {
        if ($this->status !== 'success' || !$this->bank_account_id) {
            return 0;
        }

        $type = $this->agentTransactionType;
        if (!$type) {
            return 0;
        }

        if ($type->type === 'debet') {
            // Money goes out of our bank account to destination.
            // Nominal is deducted, and bank fee is deducted.
            return - ((int) $this->nominal + (int) $this->admin_fee_bank);
        } else {
            // Kredit: money enters our bank account from swipe.
            // Nominal is added, and if admin fee payment is via bank, admin fee customer is added.
            // Bank fee is deducted.
            $effect = (int) $this->nominal - (int) $this->admin_fee_bank;
            if ($this->admin_fee_payment_method === 'bank') {
                $effect += (int) $this->admin_fee_customer;
            }
            return $effect;
        }
    }

    protected static function boot()
    {
        parent::boot();

        static::saving(function ($model) {
            $model->net_profit = (int) $model->admin_fee_customer - (int) $model->admin_fee_bank;
        });

        static::saved(function ($model) {
            // 1. If it is a new record
            if ($model->wasRecentlyCreated) {
                $effect = $model->getBalanceEffect();
                if ($effect !== 0 && $model->bank_account_id) {
                    $model->bankAccount()->increment('balance', $effect);
                }
            } else {
                // 2. If it is an update
                $originalBankId = $model->getOriginal('bank_account_id');
                $originalStatus = $model->getOriginal('status');
                $originalNominal = $model->getOriginal('nominal');
                $originalFeeBank = $model->getOriginal('admin_fee_bank');
                $originalFeeCustomer = $model->getOriginal('admin_fee_customer');
                $originalPayMethod = $model->getOriginal('admin_fee_payment_method');
                $originalTypeId = $model->getOriginal('agent_transaction_type_id');

                // Calculate old effect
                $oldEffect = 0;
                if ($originalStatus === 'success' && $originalBankId) {
                    $oldType = \App\Models\AgentTransactionType::find($originalTypeId);
                    if ($oldType) {
                         if ($oldType->type === 'debet') {
                             $oldEffect = - ((int)$originalNominal + (int)$originalFeeBank);
                         } else {
                             $oldEffect = (int)$originalNominal - (int)$originalFeeBank;
                             if ($originalPayMethod === 'bank') {
                                 $oldEffect += (int)$originalFeeCustomer;
                             }
                         }
                    }
                }

                $newEffect = $model->getBalanceEffect();

                if ($originalBankId != $model->bank_account_id) {
                    // Revert old effect from old bank account
                    if ($oldEffect !== 0 && $originalBankId) {
                        \App\Models\BankAccount::where('id', $originalBankId)->decrement('balance', $oldEffect);
                    }
                    // Apply new effect to new bank account
                    if ($newEffect !== 0 && $model->bank_account_id) {
                        $model->bankAccount()->increment('balance', $newEffect);
                    }
                } else {
                    // Same bank account, apply difference
                    $diff = $newEffect - $oldEffect;
                    if ($diff !== 0 && $model->bank_account_id) {
                        $model->bankAccount()->increment('balance', $diff);
                    }
                }
            }
        });

        static::deleted(function ($model) {
            $originalBankId = $model->getOriginal('bank_account_id');
            $originalStatus = $model->getOriginal('status');
            $originalNominal = $model->getOriginal('nominal');
            $originalFeeBank = $model->getOriginal('admin_fee_bank');
            $originalFeeCustomer = $model->getOriginal('admin_fee_customer');
            $originalPayMethod = $model->getOriginal('admin_fee_payment_method');
            $originalTypeId = $model->getOriginal('agent_transaction_type_id');

            $oldEffect = 0;
            if ($originalStatus === 'success' && $originalBankId) {
                $oldType = \App\Models\AgentTransactionType::find($originalTypeId);
                if ($oldType) {
                    if ($oldType->type === 'debet') {
                        $oldEffect = - ((int)$originalNominal + (int)$originalFeeBank);
                    } else {
                        $oldEffect = (int)$originalNominal - (int)$originalFeeBank;
                        if ($originalPayMethod === 'bank') {
                            $oldEffect += (int)$originalFeeCustomer;
                        }
                    }
                }
            }

            if ($oldEffect !== 0 && $originalBankId) {
                \App\Models\BankAccount::where('id', $originalBankId)->decrement('balance', $oldEffect);
            }
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
