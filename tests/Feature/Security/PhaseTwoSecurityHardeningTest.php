<?php

namespace Tests\Feature\Security;

use App\Models\PaymentSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PhaseTwoSecurityHardeningTest extends TestCase
{
    use RefreshDatabase;

    public function test_payment_secrets_are_encrypted_at_rest(): void
    {
        $setting = PaymentSetting::create([
            'default_gateway' => 'cash',
            'midtrans_server_key' => 'server-secret',
            'midtrans_client_key' => 'client-key',
            'xendit_secret_key' => 'xendit-secret',
            'xendit_callback_token' => 'callback-secret',
        ]);

        $raw = DB::table('payment_settings')->where('id', $setting->id)->first();

        $this->assertNotSame('server-secret', $raw->midtrans_server_key);
        $this->assertNotSame('xendit-secret', $raw->xendit_secret_key);
        $this->assertNotSame('callback-secret', $raw->xendit_callback_token);
    }

    public function test_env_override_takes_precedence_over_database_secret(): void
    {
        config()->set('services.midtrans.server_key', 'env-server-key');
        config()->set('services.xendit.secret_key', 'env-xendit-secret');
        config()->set('services.xendit.callback_token', 'env-callback-token');

        $setting = PaymentSetting::create([
            'default_gateway' => 'cash',
            'midtrans_server_key' => 'database-server-key',
            'xendit_secret_key' => 'database-xendit-secret',
            'xendit_callback_token' => 'database-callback-token',
        ]);

        $this->assertSame('env-server-key', $setting->midtransConfig()['server_key']);
        $this->assertSame('env-xendit-secret', $setting->xenditConfig()['secret_key']);
        $this->assertSame('env-callback-token', $setting->xenditConfig()['callback_token']);
        $this->assertSame('env', $setting->paymentSettingSources()['midtrans_server_key']['source']);
    }
}
