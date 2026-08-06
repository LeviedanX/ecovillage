<?php

namespace App\Policies;

use App\Models\ForumSpace;
use App\Models\User;

class ForumSpacePolicy
{
    public function view(User $user, ForumSpace $space): bool
    {
        if (! $space->is_active || ! $user->hasPermissionTo('forum.access')) {
            return false;
        }

        if ($space->visibility === 'public') {
            return true;
        }

        if ($space->visibility === 'region') {
            return $space->region !== null && $user->canAccessRegion($space->region);
        }

        if ($space->visibility === 'program' && $space->program_id !== null) {
            if ($this->moderate($user, $space)) {
                return true;
            }

            return $user->hasActiveProgramRegistration($space->program_id);
        }

        return false;
    }

    public function createThread(User $user, ForumSpace $space): bool
    {
        return $this->view($user, $space);
    }

    public function moderate(User $user, ForumSpace $space): bool
    {
        if (! $space->is_active || ! $user->hasPermissionTo('forum.moderate')) {
            return false;
        }

        if ($space->region !== null && ! $user->canAccessRegion($space->region)) {
            return false;
        }

        $programRegion = $space->program?->region;

        return $programRegion === null || $user->canAccessRegion($programRegion);
    }
}
