<?php

namespace App\Http\Controllers;

use App\Enums\ContentReportStatus;
use App\Enums\PointTransactionType;
use App\Enums\RoleName;
use App\Models\ContentReport;
use App\Models\ForumPost;
use App\Models\ForumThread;
use App\Models\PointTransaction;
use App\Models\Region;
use App\Models\RegionUserAssignment;
use App\Models\SiteSetting;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class AdminOperationsController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $actor = $request->user();
        abort_unless($actor instanceof User && $actor->can('reports.view'), 403);

        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'role' => ['nullable', Rule::enum(RoleName::class)],
            'report_status' => ['nullable', Rule::enum(ContentReportStatus::class)],
            'transaction_type' => ['nullable', Rule::enum(PointTransactionType::class)],
            'users_page' => ['nullable', 'integer', 'min:1', 'max:100000'],
            'points_page' => ['nullable', 'integer', 'min:1', 'max:100000'],
            'reports_page' => ['nullable', 'integer', 'min:1', 'max:100000'],
        ]);

        $search = trim((string) ($validated['q'] ?? ''));
        $globalAccess = $actor->hasRole(RoleName::SuperAdmin->value);
        $regionIds = $globalAccess ? [] : $actor->accessibleRegionIds()->all();

        $users = User::query()
            ->select(['id', 'name', 'email', 'created_at'])
            ->with([
                'profile.primaryRegion:id,name',
                'pointAccount:id,user_id,balance',
                'roles:id,name',
                'regionAssignments:id,user_id,region_id,assignment_type,is_active',
                'regionAssignments.region:id,parent_id,name,level',
                'regionAssignments.region.parent:id,name',
            ])
            ->when(! $globalAccess, fn (Builder $query): Builder => $query
                ->whereHas('profile', fn (Builder $profile): Builder => $profile
                    ->whereIn('primary_region_id', $regionIds)))
            ->when($search !== '', fn (Builder $query): Builder => $query
                ->where(function (Builder $searchQuery) use ($search): void {
                    $searchQuery
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                }))
            ->when(isset($validated['role']), fn (Builder $query): Builder => $query
                ->whereHas('roles', fn (Builder $roles): Builder => $roles
                    ->where('name', $validated['role'])))
            ->orderBy('name')
            ->orderBy('id')
            ->paginate(15, ['*'], 'users_page')
            ->withQueryString()
            ->through(fn (User $user): array => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $user->getRoleNames()->values()->all(),
                'role' => $user->getRoleNames()->first(),
                'primary_region' => $user->profile?->primaryRegion?->name,
                'point_balance' => $user->pointAccount?->balance,
                'assigned_regions' => $user->regionAssignments
                    ->map(fn (RegionUserAssignment $assignment): array => [
                        'id' => $assignment->id,
                        'region_id' => $assignment->region_id,
                        'region_name' => $assignment->region->name,
                        'parent_name' => $assignment->region->parent?->name,
                        'assignment_type' => $assignment->assignment_type,
                        'is_active' => $assignment->is_active,
                    ])
                    ->values()
                    ->all(),
                'created_at' => $user->created_at?->toIso8601String(),
            ]);

        $pointTransactions = PointTransaction::query()
            ->select([
                'id', 'point_account_id', 'user_id', 'actor_id', 'type', 'amount', 'balance_before',
                'balance_after', 'reason', 'occurred_at', 'created_at',
            ])
            ->with([
                'user:id,name,email',
                'account:id,balance',
                'actor:id,name',
            ])
            ->when(! $globalAccess, fn (Builder $query): Builder => $query
                ->whereHas('user.profile', fn (Builder $profile): Builder => $profile
                    ->whereIn('primary_region_id', $regionIds)))
            ->when($search !== '', fn (Builder $query): Builder => $query
                ->whereHas('user', function (Builder $userQuery) use ($search): void {
                    $userQuery
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                }))
            ->when(isset($validated['transaction_type']), fn (Builder $query): Builder => $query
                ->where('type', $validated['transaction_type']))
            ->orderByDesc('occurred_at')
            ->orderByDesc('id')
            ->paginate(20, ['*'], 'points_page')
            ->withQueryString();

        $visibleTransactionIds = $pointTransactions->getCollection()
            ->pluck('id')
            ->map(fn (mixed $id): int => (int) $id);
        $reversedTransactionIds = $this->reversedTransactionIds($visibleTransactionIds);
        $canAdjustPoints = $actor->can('points.adjust');

        $pointTransactions->through(function (PointTransaction $transaction) use ($reversedTransactionIds, $canAdjustPoints): array {
            $isReversed = $reversedTransactionIds->contains($transaction->id);
            $currentBalance = $transaction->account->balance;
            $reversalKeepsValidBalance = $currentBalance - $transaction->amount >= 0;
            $reversible = $canAdjustPoints
                && $transaction->type !== PointTransactionType::Reversal
                && ! $isReversed
                && $reversalKeepsValidBalance;

            return [
                'id' => $transaction->id,
                'user_id' => $transaction->user_id,
                'user' => [
                    'id' => $transaction->user->id,
                    'name' => $transaction->user->name,
                    'email' => $transaction->user->email,
                ],
                'type' => $transaction->type->value,
                'amount' => $transaction->amount,
                'balance_before' => $transaction->balance_before,
                'balance_after' => $transaction->balance_after,
                'reason' => $transaction->reason,
                'actor_name' => $transaction->actor?->name,
                'occurred_at' => $transaction->occurred_at->toIso8601String(),
                'created_at' => $transaction->created_at?->toIso8601String(),
                'reversible' => $reversible,
                'is_reversed' => $isReversed,
            ];
        });

        $reportsQuery = ContentReport::query()
            ->select([
                'id', 'reporter_id', 'reportable_type', 'reportable_id', 'reason',
                'description', 'status', 'created_at',
            ])
            ->with(['reporter:id,name', 'reportable']);

        if (! $globalAccess) {
            $this->scopeReportsToRegions($reportsQuery, $regionIds);
        }

        $reports = $reportsQuery
            ->when($search !== '', function (Builder $query) use ($search): void {
                $query->where(function (Builder $searchQuery) use ($search): void {
                    $searchQuery
                        ->where('reason', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%")
                        ->orWhereHas('reporter', fn (Builder $reporter): Builder => $reporter
                            ->where('name', 'like', "%{$search}%"))
                        ->orWhereHasMorph('reportable', [ForumThread::class], function (Builder $thread) use ($search): void {
                            $thread
                                ->where('title', 'like', "%{$search}%")
                                ->orWhere('body', 'like', "%{$search}%");
                        })
                        ->orWhereHasMorph('reportable', [ForumPost::class], fn (Builder $post): Builder => $post
                            ->where('body', 'like', "%{$search}%"));
                });
            })
            ->when(isset($validated['report_status']), fn (Builder $query): Builder => $query
                ->where('status', $validated['report_status']))
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(12, ['*'], 'reports_page')
            ->withQueryString()
            ->through(fn (ContentReport $report): array => $this->reportPayload($report));

        $siteSettings = $actor->can('settings.manage')
            ? SiteSetting::query()
                ->orderBy('group')
                ->orderBy('key')
                ->get(['id', 'key', 'value', 'type', 'group', 'is_public', 'updated_at'])
                ->map(fn (SiteSetting $setting): array => [
                    'id' => $setting->id,
                    'key' => $setting->key,
                    'value' => $setting->value,
                    'type' => $setting->type,
                    'group' => $setting->group,
                    'is_public' => $setting->is_public,
                    'updated_at' => $setting->updated_at?->toIso8601String(),
                ])
                ->values()
            : [];

        $roles = [];
        $permissions = [];

        if ($actor->can('roles.manage')) {
            $roleModels = Role::query()
                ->where('guard_name', 'web')
                ->whereIn('name', array_map(fn (RoleName $role): string => $role->value, RoleName::cases()))
                ->with('permissions:id,name')
                ->get(['id', 'name'])
                ->keyBy('name');
            $roles = collect(RoleName::cases())
                ->map(function (RoleName $role) use ($roleModels): ?array {
                    $model = $roleModels->get($role->value);

                    if (! $model instanceof Role) {
                        return null;
                    }

                    return [
                        'id' => $model->id,
                        'name' => $role->value,
                        'label' => $this->roleLabel($role),
                        'permissions' => $model->permissions->pluck('name')->sort()->values()->all(),
                        'immutable' => $role === RoleName::SuperAdmin,
                    ];
                })
                ->filter()
                ->values()
                ->all();
            $permissions = Permission::query()
                ->where('guard_name', 'web')
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn (Permission $permission): array => [
                    'id' => $permission->id,
                    'name' => $permission->name,
                ])
                ->values()
                ->all();
        }

        $regions = $actor->hasRole(RoleName::SuperAdmin->value)
            && $actor->can('users.manage')
            && $actor->can('regions.manage')
            ? Region::query()
                ->where('is_active', true)
                ->with('parent:id,name')
                ->orderBy('level')
                ->orderBy('name')
                ->get(['id', 'parent_id', 'name', 'level'])
                ->map(fn (Region $region): array => [
                    'id' => $region->id,
                    'name' => $region->name,
                    'level' => $region->level->value,
                    'parent_name' => $region->parent?->name,
                ])
                ->values()
                ->all()
            : [];

        return Inertia::render('admin/operations', [
            'users' => $users,
            'pointTransactions' => $pointTransactions,
            'reports' => $reports,
            'siteSettings' => $siteSettings,
            'roles' => $roles,
            'permissions' => $permissions,
            'regions' => $regions,
            'filters' => [
                'q' => $search,
                'role' => (string) ($validated['role'] ?? ''),
                'report_status' => (string) ($validated['report_status'] ?? ''),
                'transaction_type' => (string) ($validated['transaction_type'] ?? ''),
            ],
        ]);
    }

    /**
     * @param  Collection<int, int>  $visibleTransactionIds
     * @return Collection<int, int>
     */
    private function reversedTransactionIds(Collection $visibleTransactionIds): Collection
    {
        if ($visibleTransactionIds->isEmpty()) {
            return collect();
        }

        return PointTransaction::query()
            ->where('type', PointTransactionType::Reversal)
            ->where('reference_type', (new PointTransaction)->getMorphClass())
            ->whereIn('reference_id', $visibleTransactionIds)
            ->pluck('reference_id')
            ->map(fn (mixed $id): int => (int) $id);
    }

    /**
     * @param  Builder<ContentReport>  $query
     * @param  array<int, int>  $regionIds
     */
    private function scopeReportsToRegions(Builder $query, array $regionIds): void
    {
        $query->where(function (Builder $reports) use ($regionIds): void {
            $reports
                ->whereHasMorph('reportable', [ForumThread::class], fn (Builder $thread): Builder => $thread
                    ->whereHas('space', fn (Builder $space): Builder => $space
                        ->where(function (Builder $directRegion) use ($regionIds): void {
                            $directRegion
                                ->whereNull('region_id')
                                ->orWhereIn('region_id', $regionIds);
                        })
                        ->where(function (Builder $programRegion) use ($regionIds): void {
                            $programRegion
                                ->whereNull('program_id')
                                ->orWhereHas('program', function (Builder $program) use ($regionIds): void {
                                    $program
                                        ->whereNull('region_id')
                                        ->orWhereIn('region_id', $regionIds);
                                });
                        })))
                ->orWhereHasMorph('reportable', [ForumPost::class], fn (Builder $post): Builder => $post
                    ->whereHas('thread.space', fn (Builder $space): Builder => $space
                        ->where(function (Builder $directRegion) use ($regionIds): void {
                            $directRegion
                                ->whereNull('region_id')
                                ->orWhereIn('region_id', $regionIds);
                        })
                        ->where(function (Builder $programRegion) use ($regionIds): void {
                            $programRegion
                                ->whereNull('program_id')
                                ->orWhereHas('program', function (Builder $program) use ($regionIds): void {
                                    $program
                                        ->whereNull('region_id')
                                        ->orWhereIn('region_id', $regionIds);
                                });
                        })));
        });
    }

    /** @return array<string, mixed> */
    private function reportPayload(ContentReport $report): array
    {
        $reportable = $report->reportable;

        if ($reportable instanceof ForumThread) {
            $contentType = 'thread';
            $content = [
                'id' => $reportable->id,
                'type' => $contentType,
                'title' => $reportable->title,
                'excerpt' => Str::limit(Str::squish(strip_tags($reportable->body)), 240),
                'status' => $reportable->status->value,
                'is_locked' => $reportable->is_locked,
            ];
        } elseif ($reportable instanceof ForumPost) {
            $contentType = 'post';
            $content = [
                'id' => $reportable->id,
                'type' => $contentType,
                'excerpt' => Str::limit(Str::squish(strip_tags($reportable->body)), 240),
                'status' => $reportable->status->value,
                'is_locked' => false,
            ];
        } else {
            $contentType = null;
            $content = null;
        }

        return [
            'id' => $report->id,
            'reporter' => $report->reporter === null ? null : [
                'id' => $report->reporter->id,
                'name' => $report->reporter->name,
            ],
            'reportable_id' => $report->reportable_id,
            'content_type' => $contentType,
            'reportable' => $content,
            'reason' => $report->reason,
            'description' => $report->description,
            'status' => $report->status->value,
            'created_at' => $report->created_at?->toIso8601String(),
        ];
    }

    private function roleLabel(RoleName $role): string
    {
        return match ($role) {
            RoleName::Citizen => 'Warga',
            RoleName::Officer => 'Kader',
            RoleName::ProgramManager => 'Pengelola',
            RoleName::SuperAdmin => 'Super admin',
        };
    }
}
