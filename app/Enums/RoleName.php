<?php

namespace App\Enums;

enum RoleName: string
{
    case Citizen = 'warga';
    case Officer = 'kader';
    case ProgramManager = 'pengelola';
    case SuperAdmin = 'super-admin';
}
