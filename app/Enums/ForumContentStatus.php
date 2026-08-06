<?php

namespace App\Enums;

enum ForumContentStatus: string
{
    case Pending = 'pending';
    case Visible = 'visible';
    case Hidden = 'hidden';
}
