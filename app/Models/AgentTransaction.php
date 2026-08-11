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
        if ($this->status !== 'success' || ! $this->bank_account_id) {
            return 0;
        }

        $type = $this->agentTransactionType;
        if (! $type) {
            return 0;
        }

        if ($type->type === 'debet') {
            // Money goes out of our bank account to destination.
            // Nominal and bank fee are deducted. admin_fee_customer never affects
            // the bank balance for debet, regardless of payment method.
            return -((int) $this->nominal + (int) $this->admin_fee_bank);
        }

        return static::calculateKreditBankEffect(
            (int) $this->nominal,
            (int) $this->admin_fee_customer,
            (string) $this->admin_fee_payment_method,
            $this->agentAdminLoket?->code
        );
    }

    /**
     * Kredit (e.g. Tarik Tunai): the full nominal enters the bank account.
     * admin_fee_bank is not a cost to us here - it's charged to the customer's own
     * account by their bank, so it neither reduces this balance nor net_profit (see
     * the saving() hook). The customer fee (admin_fee_customer) lands in the bank
     * account instead of the cash drawer when it's paid non-cash, or when the admin
     * loket is a "TF" (transfer) code even if paid in cash.
     */
    public static function calculateKreditBankEffect(
        int $nominal,
        int $adminFeeCustomer,
        string $paymentMethod,
        ?string $loketCode
    ): int {
        $effect = $nominal;

        if ($paymentMethod === 'bank' || static::isTfAdminLoketCode($loketCode)) {
            $effect += $adminFeeCustomer;
        }

        return $effect;
    }

    public static function isTfAdminLoketCode(?string $code): bool
    {
        return $code && str_contains(strtoupper($code), 'TF');
    }

    protected static function boot()
    {
        parent::boot();

        static::saving(function ($model) {
            $type = AgentTransactionType::find($model->agent_transaction_type_id);
            $isDebet = $type && $type->type === 'debet';

            // admin_fee_bank only applies to debet (outbound transfer) transactions,
            // same as the bank-balance effect below. Kredit (e.g. Tarik Tunai) keeps
            // the full customer fee as profit.
            $model->net_profit = (int) $model->admin_fee_customer - ($isDebet ? (int) $model->admin_fee_bank : 0);
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
                $originalLoketId = $model->getOriginal('agent_admin_loket_id');

                // Calculate old effect
                $oldEffect = 0;
                if ($originalStatus === 'success' && $originalBankId) {
                    $oldType = \App\Models\AgentTransactionType::find($originalTypeId);
                    if ($oldType) {
                        if ($oldType->type === 'debet') {
                            $oldEffect = -((int) $originalNominal + (int) $originalFeeBank);
                        } else {
                            $oldEffect = static::calculateKreditBankEffect(
                                (int) $originalNominal,
                                (int) $originalFeeCustomer,
                                (string) $originalPayMethod,
                                $originalLoketId ? \App\Models\AgentAdminLoket::find($originalLoketId)?->code : null
                            );
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
            $originalLoketId = $model->getOriginal('agent_admin_loket_id');

            $oldEffect = 0;
            if ($originalStatus === 'success' && $originalBankId) {
                $oldType = \App\Models\AgentTransactionType::find($originalTypeId);
                if ($oldType) {
                    if ($oldType->type === 'debet') {
                        $oldEffect = -((int) $originalNominal + (int) $originalFeeBank);
                    } else {
                        $oldEffect = static::calculateKreditBankEffect(
                            (int) $originalNominal,
                            (int) $originalFeeCustomer,
                            (string) $originalPayMethod,
                            $originalLoketId ? \App\Models\AgentAdminLoket::find($originalLoketId)?->code : null
                        );
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
