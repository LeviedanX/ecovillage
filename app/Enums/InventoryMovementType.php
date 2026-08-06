<?php

namespace App\Enums;

enum InventoryMovementType: string
{
    case Initial = 'initial';
    case Restock = 'restock';
    case Redemption = 'redemption';
    case Adjustment = 'adjustment';
    case Reversal = 'reversal';
}
