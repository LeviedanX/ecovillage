<?php

namespace App\Http\Controllers;

use App\Enums\RoleName;
use App\Models\AuditLog;
use App\Models\RegionUserAssignment;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Role;

class AdminAccessController extends Controller
{
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
