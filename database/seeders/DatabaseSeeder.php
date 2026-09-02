<?php

namespace Database\Seeders;

// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Spatie\Permission\PermissionRegistrar;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->call([
            PermissionSeeder::class,
            UnitSeeder::class,
            ServiceSeeder::class,
            RoleSeeder::class,
            UserSeeder::class,
            OperationalCoreSeeder::class,
            FeatureCoverageSeeder::class,
            AgentLinkSeeder::class,
            BulkProductSeeder::class,
        ]);

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
