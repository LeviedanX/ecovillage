<?php

namespace App\Enums;

enum CollectionStatus: string
{
    case Submitted = 'submitted';
    case Assigned = 'assigned';
    case PickedUp = 'picked_up';
    case Weighed = 'weighed';
    case Verified = 'verified';
    case Completed = 'completed';
    case Rejected = 'rejected';
    case Cancelled = 'cancelled';

    public function canTransitionTo(self $next): bool
    {
        return match ($this) {
            self::Submitted => in_array($next, [self::Assigned, self::Rejected, self::Cancelled], true),
            self::Assigned => in_array($next, [self::PickedUp, self::Rejected, self::Cancelled], true),
            self::PickedUp => in_array($next, [self::Weighed, self::Rejected], true),
            self::Weighed => in_array($next, [self::Verified, self::Rejected], true),
            self::Verified => $next === self::Completed,
            self::Completed, self::Rejected, self::Cancelled => false,
        };
    }

    public function isTerminal(): bool
    {
        return in_array($this, [self::Completed, self::Rejected, self::Cancelled], true);
    }
}
