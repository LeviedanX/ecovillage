<?php

namespace App\Http\Middleware;

use App\Http\Controllers\PublicSiteController;
use App\Models\SiteSetting;
use App\Support\SiteContentCatalog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();
        $profile = $user === null
            ? null
            : ($user->relationLoaded('profile') ? $user->profile : $user->profile()->first());

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $user === null ? null : [
                    ...$user->only(['id', 'name', 'email', 'email_verified_at', 'created_at']),
                    'roles' => $user->getRoleNames()->values(),
                    'permissions' => $user->getAllPermissions()->pluck('name')->values(),
                    'profile' => $profile,
                    'avatar' => $profile?->avatarUrl(),
                    'unread_notifications' => $user->unreadNotifications()->count(),
                ],
            ],
            'locale' => app()->getLocale(),
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            // Background dipakai layout publik pada setiap halaman, termasuk
            // rute yang tidak melewati PublicSiteController. Di-cache agar
            // tidak menambah query pada setiap request.
            'publicBackground' => fn (): array => self::backgroundSettings(),
        ];
    }

    /** @return array{desktop: string, mobile: string, opacity: int} */
    public static function backgroundSettings(): array
    {
        return Cache::remember('public.background.v1', now()->addHour(), function (): array {
            $defaults = SiteContentCatalog::defaults();
            $stored = SiteSetting::query()
                ->whereIn('key', ['public_background_desktop', 'public_background_mobile', 'public_background_opacity'])
                ->get()
                ->keyBy('key');

            $read = static fn (string $key): string => $stored->get($key)?->stringValue($defaults[$key] ?? '')
                ?? ($defaults[$key] ?? '');

            return [
                'desktop' => PublicSiteController::imageUrl($read('public_background_desktop')),
                'mobile' => PublicSiteController::imageUrl($read('public_background_mobile')),
                'opacity' => (int) ($read('public_background_opacity') ?: '0'),
            ];
        });
    }
}
