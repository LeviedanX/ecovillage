<?php

namespace Database\Seeders;

use App\Enums\RoleName;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolePermissionSeeder extends Seeder
{
    /** @var array<int, string> */
    private const PERMISSIONS = [
        'collections.view-own',
        'collections.view-assigned',
        'collections.view-region',
        'collections.create',
        'collections.update-own',
        'collections.assign',
        'collections.process',
        'collections.verify',
        'collections.verify-hazardous',
        'collections.export',
        'points.view-own',
        'points.view-region',
        'points.adjust',
        'redemptions.create',
        'redemptions.process',
        'education.view',
        'education.manage',
        'programs.view',
        'programs.manage',
        'products.view',
        'products.manage',
        'forum.access',
        'forum.moderate',
        'map.view-exact-assigned',
        'map.view-exact-region',
        'users.manage',
        'roles.manage',
        'regions.manage',
        'waste.manage',
        'factors.manage',
        'audit.view',
        'settings.manage',
        'reports.view',
        'reports.export',
    ];

    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (self::PERMISSIONS as $permission) {
            Permission::query()->firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $citizen = Role::findOrCreate(RoleName::Citizen->value, 'web');
        $citizen->syncPermissions([
            'collections.view-own',
            'collections.create',
            'collections.update-own',
            'points.view-own',
            'redemptions.create',
            'education.view',
            'programs.view',
            'products.view',
            'forum.access',
        ]);

        $officer = Role::findOrCreate(RoleName::Officer->value, 'web');
        $officer->syncPermissions([
            'collections.view-assigned',
            'collections.process',
            // Staf tetap warga bagi dirinya sendiri: saldo dan penukaran pribadi
            // memakai jalur kepemilikan yang sama, bukan privilese operasional.
            'points.view-own',
            'redemptions.create',
            'education.view',
            'programs.view',
            'products.view',
            'forum.access',
            'map.view-exact-assigned',
        ]);

        $manager = Role::findOrCreate(RoleName::ProgramManager->value, 'web');
        $manager->syncPermissions([
            'collections.view-region',
            'collections.assign',
            'collections.verify',
            'collections.export',
            'points.view-own',
            'points.view-region',
            'points.adjust',
            'redemptions.create',
            'redemptions.process',
            'education.view',
            'education.manage',
            'programs.view',
            'programs.manage',
            'products.view',
            'products.manage',
            'forum.access',
            'forum.moderate',
            'map.view-exact-region',
            'reports.view',
            'reports.export',
        ]);

        Role::findOrCreate(RoleName::SuperAdmin->value, 'web')->syncPermissions(self::PERMISSIONS);
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
