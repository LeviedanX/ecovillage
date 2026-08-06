<?php

namespace App\Enums;

enum FactorSetStatus: string
{
    case Draft = 'draft';
    case Active = 'active';
    case Archived = 'archived';
}
