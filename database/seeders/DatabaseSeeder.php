<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call(RolePermissionSeeder::class);
        $this->call(SiteContentSeeder::class);

        if (app()->environment(['local', 'testing']) && config('ecovillage.demo_accounts_enabled')) {
            $this->call(DemoDataSeeder::class);
        }
    }
}
