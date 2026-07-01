<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Artisan;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        // Reset cached roles and permissions
        Artisan::call('permission:cache-reset');

        $modules = [
            'users', 'departments', 'filieres', 'promotions', 'modules', 'rooms',
            'seances', 'plannings', 'grades', 'absences', 'courses',
            'assignments', 'announcements', 'messages', 'reports',
        ];

        // Generate CRUD permissions per module: e.g. "grades.view", "grades.create" ...
        $abilities = ['view', 'create', 'update', 'delete'];
        foreach ($modules as $module) {
            foreach ($abilities as $ability) {
                Permission::firstOrCreate([
                    'name' => "{$module}.{$ability}",
                    'guard_name' => 'api',
                ]);
            }
        }

        $all = Permission::where('guard_name', 'api')->pluck('name')->toArray();

        $roles = [
            'SuperAdmin' => $all,
            'Admin' => array_values(array_filter($all, fn ($p) => ! str_starts_with($p, 'reports.'))),
            'ManagementPedagogique' => $this->only($all, [
                'filieres', 'promotions', 'modules', 'seances', 'plannings',
                'grades', 'absences', 'reports', 'announcements', 'rooms',
            ]),
            'Professor' => array_merge(
                $this->only($all, ['seances', 'grades', 'absences', 'courses', 'assignments', 'announcements']),
                ['modules.view', 'promotions.view', 'messages.view', 'messages.create'],
            ),
            'Student' => [
                'seances.view', 'grades.view', 'absences.view', 'courses.view',
                'assignments.view', 'announcements.view', 'messages.view', 'messages.create',
            ],
            'AutoFormation' => ['courses.view'],
        ];

        foreach ($roles as $roleName => $perms) {
            $role = Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);
            $role->syncPermissions(array_values(array_unique($perms)));
        }
    }

    /**
     * Pick every ability for the given modules.
     *
     * @param  array<int, string>  $all
     * @param  array<int, string>  $modules
     * @return array<int, string>
     */
    private function only(array $all, array $modules): array
    {
        return array_values(array_filter(
            $all,
            fn ($p) => in_array(explode('.', $p)[0], $modules, true),
        ));
    }
}
