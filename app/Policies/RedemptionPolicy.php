<?php

namespace App\Policies;

use App\Enums\RoleName;
use App\Models\Redemption;
use App\Models\User;

class RedemptionPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('redemptions.create') || $user->hasPermissionTo('redemptions.process');
    }

    public function view(User $user, Redemption $redemption): bool
    {
        return $redemption->user_id === $user->id
            || ($user->hasPermissionTo('redemptions.process')
                && ($user->hasRole(RoleName::SuperAdmin->value)
                    || ($redemption->region !== null && $user->canAccessRegion($redemption->region))));
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('redemptions.create');
    }

    public function process(User $user, Redemption $redemption): bool
    {
        return $user->hasPermissionTo('redemptions.process')
            && ($user->hasRole(RoleName::SuperAdmin->value)
                || ($redemption->region !== null && $user->canAccessRegion($redemption->region)));
    }
}
