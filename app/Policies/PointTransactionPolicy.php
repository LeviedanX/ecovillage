<?php

namespace App\Policies;

use App\Enums\RoleName;
use App\Models\PointTransaction;
use App\Models\User;

class PointTransactionPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('points.view-own') || $user->hasPermissionTo('points.view-region');
    }

    public function view(User $user, PointTransaction $transaction): bool
    {
        if ($transaction->user_id === $user->id && $user->hasPermissionTo('points.view-own')) {
            return true;
        }

        if (! $user->hasPermissionTo('points.view-region')) {
            return false;
        }

        if ($user->hasRole(RoleName::SuperAdmin->value)) {
            return true;
        }

        $transaction->loadMissing('user.profile.primaryRegion');
        $region = $transaction->user->profile?->primaryRegion;

        return $region !== null && $user->canAccessRegion($region);
    }

    public function adjust(User $user): bool
    {
        return $user->hasPermissionTo('points.adjust');
    }
}
