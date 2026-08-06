<?php

namespace App\Policies;

use App\Enums\CollectionStatus;
use App\Models\CollectionRequest;
use App\Models\User;

class CollectionRequestPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('collections.view-own')
            || $user->hasPermissionTo('collections.view-assigned')
            || $user->hasPermissionTo('collections.view-region');
    }

    public function view(User $user, CollectionRequest $request): bool
    {
        if ($request->requester_id === $user->id && $user->hasPermissionTo('collections.view-own')) {
            return true;
        }

        if ($user->hasPermissionTo('collections.view-assigned')
            && $request->assignments()->where('assignee_id', $user->id)->exists()) {
            return true;
        }

        return $user->hasPermissionTo('collections.view-region') && $user->canAccessRegion($request->region);
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('collections.create');
    }

    public function update(User $user, CollectionRequest $request): bool
    {
        return $request->requester_id === $user->id
            && $user->hasPermissionTo('collections.update-own')
            && in_array($request->status, [CollectionStatus::Submitted, CollectionStatus::Assigned], true);
    }

    public function cancel(User $user, CollectionRequest $request): bool
    {
        return $this->update($user, $request);
    }

    public function assign(User $user, CollectionRequest $request): bool
    {
        return $user->hasPermissionTo('collections.assign') && $user->canAccessRegion($request->region);
    }

    public function process(User $user, CollectionRequest $request): bool
    {
        return $user->hasPermissionTo('collections.process')
            && $request->assignments()
                ->where('assignee_id', $user->id)
                ->where('is_active', true)
                ->exists();
    }

    public function verify(User $user, CollectionRequest $request): bool
    {
        return $user->hasPermissionTo('collections.verify') && $user->canAccessRegion($request->region);
    }
}
