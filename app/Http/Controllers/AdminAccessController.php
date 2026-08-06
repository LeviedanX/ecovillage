<?php

namespace App\Http\Controllers;

use App\Enums\RoleName;
use App\Models\AuditLog;
use App\Models\Region;
use App\Models\RegionUserAssignment;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class AdminAccessController extends Controller
{
    /**
     * Panel kewenangan: role pengguna, penugasan wilayah, dan permission tiap
     * role. Sebelumnya ketiga endpoint di kelas ini hanya dapat dipanggil
     * dengan merakit request sendiri, sehingga pengelolaan akses tidak dapat
     * dilakukan lewat aplikasi.
     */
    public function index(Request $request): Response
    {
        $actor = $request->user();
        $isSuperAdmin = $actor->hasRole(RoleName::SuperAdmin->value);
        $abilities = [
            'manageUsers' => (bool) $actor->can('users.manage'),
            'manageRoles' => (bool) $actor->can('roles.manage'),
            // Penugasan wilayah menuntut ketiganya sekaligus, sama seperti
            // middleware pada route-nya.
            'manageRegionAssignments' => $isSuperAdmin
                && $actor->can('users.manage')
                && $actor->can('regions.manage'),
        ];

        abort_unless($abilities['manageUsers'] || $abilities['manageRoles'], 403);

        $regionIds = $isSuperAdmin ? null : $actor->accessibleRegionIds();

        $users = User::query()
            ->with([
                'roles:id,name',
                'profile:id,user_id,primary_region_id',
                'regionAssignments.region:id,name,level',
            ])
            ->whereNull('anonymized_at')
            ->when($regionIds !== null, fn ($query) => $query->whereHas(
                'profile',
                fn ($profile) => $profile->whereIn('primary_region_id', $regionIds),
            ))
            ->orderBy('name')
            ->limit(200)
            ->get()
            ->map(fn (User $user): array => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->getRoleNames()->first(),
                'assignments' => $user->regionAssignments
                    ->map(fn (RegionUserAssignment $assignment): array => [
                        'id' => $assignment->id,
                        'region' => $assignment->region?->name,
                        'level' => $assignment->region?->level->value,
                        'type' => $assignment->assignment_type,
                        'is_active' => (bool) $assignment->is_active,
                    ])
                    ->values()
                    ->all(),
            ]);

        $roles = Role::query()
            ->with('permissions:id,name')
            ->orderBy('name')
            ->get()
            ->map(fn (Role $role): array => [
                'id' => $role->id,
                'name' => $role->name,
                // Permission super admin bersifat tetap; UI menandainya
                // terkunci agar tidak terlihat seperti dapat disunting.
                'locked' => $role->name === RoleName::SuperAdmin->value,
                'permissions' => $role->permissions->pluck('name')->sort()->values(),
            ]);

        return Inertia::render('admin/access', [
            'abilities' => $abilities,
            'users' => $users,
            'roles' => $roles,
            'permissions' => Permission::query()
                ->orderBy('name')
                ->pluck('name'),
            'assignableRoles' => array_map(
                static fn (RoleName $role): string => $role->value,
                RoleName::cases(),
            ),
            'assignmentTypes' => [RoleName::Officer->value, RoleName::ProgramManager->value],
            'regions' => Region::query()
                ->where('is_active', true)
                ->orderBy('code')
                ->get(['id', 'name', 'level', 'code']),
        ]);
    }

    public function storeRegionAssignment(Request $request, User $user): RedirectResponse
    {
        $actor = $this->authorizeRegionManagement($request);
        $validated = $request->validate([
            'region_id' => [
                'required',
                'integer',
                Rule::exists('regions', 'id')->where('is_active', true),
            ],
            'assignment_type' => [
                'required',
                Rule::in([RoleName::Officer->value, RoleName::ProgramManager->value]),
            ],
        ]);
        $assignmentType = (string) $validated['assignment_type'];

        if (! $user->hasRole($assignmentType)) {
            throw ValidationException::withMessages([
                'assignment_type' => 'Jenis penugasan harus sama dengan role aktif pengguna.',
            ]);
        }

        DB::transaction(function () use ($actor, $request, $user, $validated, $assignmentType): void {
            $assignment = RegionUserAssignment::query()
                ->where('user_id', $user->id)
                ->where('region_id', $validated['region_id'])
                ->where('assignment_type', $assignmentType)
                ->lockForUpdate()
                ->first();
            $before = $assignment?->only(['user_id', 'region_id', 'assignment_type', 'is_active']) ?? [];

            if ($assignment === null) {
                $assignment = RegionUserAssignment::query()->create([
                    'user_id' => $user->id,
                    'region_id' => $validated['region_id'],
                    'assignment_type' => $assignmentType,
                    'is_active' => true,
                ]);
            } else {
                $assignment->update(['is_active' => true]);
            }

            AuditLog::record(
                actor: $actor,
                event: $before === [] ? 'region-assignment.created' : 'region-assignment.reactivated',
                auditable: $assignment,
                before: $before,
                after: $assignment->only(['user_id', 'region_id', 'assignment_type', 'is_active']),
                request: $request,
            );
        }, 3);

        return back()->with('success', 'Penugasan wilayah pengguna disimpan.');
    }

    public function updateRegionAssignment(Request $request, RegionUserAssignment $assignment): RedirectResponse
    {
        $actor = $this->authorizeRegionManagement($request);
        $validated = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);
        $shouldActivate = (bool) $validated['is_active'];
        $assignment->loadMissing('user');

        if ($shouldActivate && ! $assignment->user->hasRole($assignment->assignment_type)) {
            throw ValidationException::withMessages([
                'is_active' => 'Penugasan tidak dapat diaktifkan karena role pengguna sudah berubah.',
            ]);
        }

        DB::transaction(function () use ($actor, $request, $assignment, $shouldActivate): void {
            $lockedAssignment = RegionUserAssignment::query()->lockForUpdate()->findOrFail($assignment->id);
            $before = $lockedAssignment->only(['is_active']);
            $lockedAssignment->update(['is_active' => $shouldActivate]);

            AuditLog::record(
                actor: $actor,
                event: 'region-assignment.status-changed',
                auditable: $lockedAssignment,
                before: $before,
                after: $lockedAssignment->only(['is_active']),
                request: $request,
            );
        }, 3);

        return back()->with('success', $shouldActivate
            ? 'Penugasan wilayah diaktifkan.'
            : 'Penugasan wilayah dinonaktifkan.');
    }

    public function updateRolePermissions(Request $request, Role $role): RedirectResponse
    {
        $actor = $request->user();
        abort_unless($actor instanceof User && $actor->can('roles.manage'), 403);

        if ($role->name === RoleName::SuperAdmin->value) {
            throw ValidationException::withMessages([
                'role' => 'Permission role super-admin bersifat tetap dan tidak dapat diubah.',
            ]);
        }

        $validated = $request->validate([
            'permissions' => ['present', 'array'],
            'permissions.*' => [
                'string',
                'distinct',
                Rule::exists('permissions', 'name')->where('guard_name', 'web'),
            ],
        ]);
        /** @var array<int, string> $permissionNames */
        $permissionNames = $validated['permissions'];

        DB::transaction(function () use ($actor, $request, $role, $permissionNames): void {
            $lockedRole = Role::query()->lockForUpdate()->findOrFail($role->id);

            if ($lockedRole->name === RoleName::SuperAdmin->value) {
                throw ValidationException::withMessages([
                    'role' => 'Permission role super-admin bersifat tetap dan tidak dapat diubah.',
                ]);
            }

            $before = $lockedRole->permissions()->pluck('name')->sort()->values()->all();
            $lockedRole->syncPermissions($permissionNames);
            $after = $lockedRole->permissions()->pluck('name')->sort()->values()->all();

            AuditLog::record(
                actor: $actor,
                event: 'role.permissions-synced',
                auditable: $lockedRole,
                before: ['permissions' => $before],
                after: ['permissions' => $after],
                request: $request,
            );
        }, 3);

        return back()->with('success', 'Permission role berhasil disinkronkan.');
    }

    private function authorizeRegionManagement(Request $request): User
    {
        $actor = $request->user();
        abort_unless(
            $actor instanceof User
            && $actor->hasRole(RoleName::SuperAdmin->value)
            && $actor->can('users.manage')
            && $actor->can('regions.manage'),
            403,
        );

        return $actor;
    }
}
