<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\CollectionItem;
use App\Models\CollectionRequest;
use App\Models\ContentReport;
use App\Models\EducationContent;
use App\Models\ImpactCalculation;
use App\Models\PointAccount;
use App\Models\PointTransaction;
use App\Models\Product;
use App\Models\Program;
use App\Models\Region;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user = $this->authenticatedUser($request);
        $role = $user->getRoleNames()->first() ?? 'warga';
        $filters = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'region_id' => ['nullable', 'integer', 'exists:regions,id'],
        ]);

        $collections = CollectionRequest::query()->with(['items.wasteType.category', 'assignments.assignee:id,name']);
        $this->scopeCollections($collections, $user, $role);
        $collections
            ->when(isset($filters['from']), fn (Builder $query) => $query->whereDate('created_at', '>=', $filters['from']))
            ->when(isset($filters['to']), fn (Builder $query) => $query->whereDate('created_at', '<=', $filters['to']));
        if (isset($filters['region_id'])) {
            $region = Region::query()->findOrFail($request->integer('region_id'));
            abort_unless($role === 'super-admin' || $user->canAccessRegion($region), 403);
            $collections->where('region_id', $region->id);
        }

        $collectionIds = (clone $collections)->pluck('id');
        $completedIds = (clone $collections)->where('status', 'completed')->pluck('id');
        $verifiedWeight = (float) CollectionItem::query()->whereIn('collection_request_id', $completedIds)->sum('verified_weight');

        $impactQuery = ImpactCalculation::query()->whereIn('collection_request_id', $collectionIds);
        $scopedUserIds = (clone $collections)->distinct()->pluck('requester_id');
        $pointQuery = PointTransaction::query()->whereIn('user_id', $scopedUserIds);
        $monthlyTrend = CollectionItem::query()
            ->with('wasteType.category:id,slug')
            ->whereIn('collection_request_id', $completedIds)
            ->whereNotNull('verified_at')
            ->get()
            ->groupBy(fn (CollectionItem $item) => Carbon::parse($item->verified_at)->format('Y-m'))
            ->sortKeys()
            ->take(-6)
            ->map(function ($items, string $month): array {
                $totals = ['organic' => 0.0, 'inorganic' => 0.0, 'other' => 0.0];
                foreach ($items as $item) {
                    $slug = $item->wasteType->category->slug;
                    $key = $slug === 'organik' ? 'organic' : ($slug === 'anorganik' ? 'inorganic' : 'other');
                    $totals[$key] += (float) $item->verified_weight;
                }

                return ['month' => $month, ...array_map(fn (float $value) => round($value, 2), $totals)];
            })
            ->values();

        $summary = [
            'role' => $role,
            'total_users' => $role === 'super-admin' ? User::query()->count() : null,
            'total_collections' => (clone $collections)->count(),
            'pending_collections' => (clone $collections)->whereIn('status', ['submitted', 'assigned', 'picked_up', 'weighed'])->count(),
            'verified_weight_kg' => round($verifiedWeight, 2),
            'green_points' => (int) (PointAccount::query()->where('user_id', $user->id)->value('balance') ?? 0),
            'point_balance' => (int) (PointAccount::query()->where('user_id', $user->id)->value('balance') ?? 0),
            'points_issued' => (int) (clone $pointQuery)->where('type', 'earn')->sum('amount'),
            'points_redeemed' => abs((int) (clone $pointQuery)->where('type', 'redeem')->sum('amount')),
            'impact_kg_co2e' => round((float) (clone $impactQuery)->sum('total_carbon_kg_co2e'), 2),
            'impact_recyclable_kg' => round((float) (clone $impactQuery)->sum('total_recyclable_kg'), 2),
            'active_programs' => Program::query()->whereIn('status', ['published', 'registration_open'])->count(),
            'low_stock_products' => in_array($role, ['pengelola', 'super-admin'], true)
                ? Product::query()->where('is_active', true)->where('stock', '<=', 5)->count()
                : null,
        ];

        return Inertia::render($role === 'super-admin' || $role === 'pengelola' ? 'admin/index' : 'app/dashboard', [
            'summary' => $summary,
            'metrics' => $summary,
            'recentCollections' => (clone $collections)->latest()->limit(6)->get(),
            'upcomingPrograms' => Program::query()
                ->whereIn('status', ['published', 'registration_open'])
                ->orderBy('registration_ends_at')
                ->limit(4)
                ->get(),
            'education' => EducationContent::query()->where('status', 'published')->latest('published_at')->limit(3)->get(),
            'monthlyTrend' => $monthlyTrend,
            'statusBreakdown' => (clone $collections)
                ->select('status', DB::raw('COUNT(*) as total'))
                ->groupBy('status')
                ->get()
                ->map(fn (CollectionRequest $item): array => [
                    'status' => $item->status->value,
                    'label' => str($item->status->value)->replace('_', ' ')->title()->toString(),
                    'count' => (int) $item->getAttribute('total'),
                ]),
            'lowStockProducts' => in_array($role, ['pengelola', 'super-admin'], true)
                ? Product::query()->where('is_active', true)->where('stock', '<=', 5)->orderBy('stock')->limit(8)->get()
                : [],
            'moderationCount' => in_array($role, ['pengelola', 'super-admin'], true)
                ? ContentReport::query()->where('status', 'pending')->count()
                : 0,
            'recentActivities' => $role === 'super-admin'
                ? AuditLog::query()->with('actor:id,name')->latest()->limit(10)->get()
                : [],
            'regions' => $role === 'super-admin'
                ? Region::query()->where('is_active', true)->orderBy('code')->get(['id', 'name', 'level'])
                : $user->assignedRegions()->get(['regions.id', 'regions.name', 'regions.level']),
            'filters' => $filters,
        ]);
    }

    /** @param Builder<CollectionRequest> $query */
    private function scopeCollections(Builder $query, User $user, string $role): void
    {
        if ($role === 'warga') {
            $query->where('requester_id', $user->id);

            return;
        }

        if ($role === 'kader') {
            $query->whereHas('assignments', fn (Builder $assignment) => $assignment
                ->where('assignee_id', $user->id)
                ->where('is_active', true));

            return;
        }

        if ($role !== 'super-admin') {
            $query->whereIn('region_id', $user->accessibleRegionIds());
        }
    }

    private function authenticatedUser(Request $request): User
    {
        $user = $request->user();

        abort_unless($user instanceof User, 401);

        return $user;
    }
}
