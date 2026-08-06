<?php

namespace App\Enums;

enum ProgramStatus: string
{
    case Draft = 'draft';
    case Published = 'published';
    case RegistrationOpen = 'registration_open';
    case RegistrationClosed = 'registration_closed';
    case Completed = 'completed';
    case Cancelled = 'cancelled';
}
