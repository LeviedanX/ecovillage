<?php

namespace App\Enums;

enum PointTransactionType: string
{
    case Earn = 'earn';
    case Redeem = 'redeem';
    case Adjustment = 'adjustment';
    case Reversal = 'reversal';
    case Expired = 'expired';
}
