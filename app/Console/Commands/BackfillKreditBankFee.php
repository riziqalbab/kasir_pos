<?php

namespace App\Console\Commands;

use App\Models\AgentTransaction;
use App\Models\BankAccount;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class BackfillKreditBankFee extends Command
{
    protected $signature = 'agent:backfill-kredit-bank-fee {--dry-run : Show the corrections without writing them}';

    protected $description = 'Credit back admin_fee_bank that older kredit transactions wrongly deducted from bank balances';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');

        // Kredit transactions used to compute their bank effect as
        // nominal - admin_fee_bank. admin_fee_bank is not our cost for kredit, so
        // every successful one that ran under the old formula left its bank account
        // short by exactly admin_fee_bank.
        $transactions = AgentTransaction::query()
            ->with('agentTransactionType')
            ->whereNotNull('bank_account_id')
            ->where('status', 'success')
            ->where('admin_fee_bank', '>', 0)
            ->whereHas('agentTransactionType', function ($query) {
                $query->where('type', 'kredit');
            })
            ->get();

        if ($transactions->isEmpty()) {
            $this->info('No kredit transactions need correcting.');

            return self::SUCCESS;
        }

        $adjustments = $transactions
            ->groupBy('bank_account_id')
            ->map(fn ($group) => (int) $group->sum('admin_fee_bank'));

        $this->table(
            ['Bank', 'Transactions', 'Balance now', 'Add back', 'Balance after'],
            $adjustments->map(function ($amount, $bankAccountId) use ($transactions) {
                $bank = BankAccount::find($bankAccountId);

                return [
                    $bank?->bank_name ?? "id={$bankAccountId}",
                    $transactions->where('bank_account_id', $bankAccountId)->count(),
                    number_format((int) $bank?->balance),
                    number_format($amount),
                    number_format((int) $bank?->balance + $amount),
                ];
            })->values()->all()
        );

        if ($dryRun) {
            $this->warn('Dry run - nothing was written.');

            return self::SUCCESS;
        }

        if (! $this->confirm('Apply these corrections?', false)) {
            $this->warn('Aborted - nothing was written.');

            return self::SUCCESS;
        }

        DB::transaction(function () use ($adjustments) {
            foreach ($adjustments as $bankAccountId => $amount) {
                BankAccount::where('id', $bankAccountId)->increment('balance', $amount);
            }
        });

        $this->info("Corrected {$adjustments->count()} bank account(s) across {$transactions->count()} transaction(s).");

        return self::SUCCESS;
    }
}
