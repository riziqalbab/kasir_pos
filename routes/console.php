<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote')->hourly();

use App\Services\BackupService;

Schedule::command('crm:sync-segments')->dailyAt('01:00');
Schedule::command('crm:generate-reminders')->dailyAt('01:15');

// Auto full system backup (DB + Media ZIP) daily at 23:00
Schedule::call(function () {
    app(BackupService::class)->createFullBackup();
})->dailyAt('23:00');
