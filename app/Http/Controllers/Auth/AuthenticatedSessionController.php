<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Services\AuditLogService;
use App\Support\BotGuard;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    public function __construct(
        private readonly AuditLogService $auditLogService
    ) {}

    /**
     * Display the login view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Login', [
            'canResetPassword' => Route::has('password.request'),
            'canRegister' => config('security.auth.public_registration'),
            'status' => session('status'),
            'botGuard' => BotGuard::payload(),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        $request->session()->regenerate();
        $request->session()->put('security.session_started_at', now()->timestamp);

        $user = $request->user();

        $this->auditLogService->log(
            event: 'auth.login_succeeded',
            module: 'auth',
            auditable: $user,
            description: 'Login berhasil.',
            meta: [
                'severity' => 'info',
                'route' => $request->route()?->getName(),
                'remember' => $request->boolean('remember'),
            ],
        );

        $routePriority = [
            'dashboard-access' => 'dashboard',
            'transactions-access' => 'transactions.index',
            'products-access' => 'products.index',
            'categories-access' => 'categories.index',
            'customers-access' => 'customers.index',
            'stock-opnames-access' => 'stock-opnames.index',
            'stock-mutations-access' => 'stock-mutations.index',
            'purchase-orders-access' => 'purchase-orders.index',
            'goods-receivings-access' => 'goods-receivings.index',
            'sales-returns-access' => 'sales-returns.index',
            'supplier-returns-access' => 'supplier-returns.index',
            'receivables-access' => 'receivables.index',
            'payables-access' => 'payables.index',
            'suppliers-access' => 'suppliers.index',
            'units-access' => 'units.index',
            'services-access' => 'services.index',
            'point-prizes-access' => 'point-prizes.index',
            'reports-access' => 'reports.sales.index',
            'profits-access' => 'reports.profits.index',
            'agent-transactions-access' => 'agent-transactions.index',
            'cashier-shifts-access' => 'cashier-shifts.index',
            'audit-logs-access' => 'audit-logs.index',
            'users-access' => 'users.index',
            'roles-access' => 'roles.index',
            'permissions-access' => 'permissions.index',
            'settings-access' => 'settings.store',
            'payment-settings-access' => 'settings.bank-accounts.index',
            'backups-access' => 'settings.backups.index',
        ];

        $defaultRoute = 'dashboard.access';
        foreach ($routePriority as $permission => $routeName) {
            if ($user && $user->can($permission)) {
                $defaultRoute = $routeName;
                break;
            }
        }

        return redirect()->intended(route($defaultRoute, absolute: false));
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $this->auditLogService->log(
            event: 'auth.logout',
            module: 'auth',
            auditable: $request->user(),
            description: 'Logout berhasil.',
            meta: [
                'severity' => 'info',
                'route' => $request->route()?->getName(),
            ],
        );

        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return redirect('/');
    }
}
