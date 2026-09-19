<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

/**
 * Seeds the base roles: super_admin, vendor, customer.
 */
class RoleSeeder extends Seeder
{
    public function run()
    {
        $roles = [
            ['name' => 'Super Admin', 'slug' => 'super_admin', 'description' => 'Platform administrator with full access'],
            ['name' => 'Vendor', 'slug' => 'vendor', 'description' => 'Bus company / vendor account'],
            ['name' => 'Customer', 'slug' => 'customer', 'description' => 'End user who books trips'],
        ];

        $builder = $this->db->table('roles');
        foreach ($roles as $role) {
            $exists = $builder->where('slug', $role['slug'])->countAllResults();
            if ($exists === 0) {
                $role['created_at'] = date('Y-m-d H:i:s');
                $role['updated_at'] = date('Y-m-d H:i:s');
                $builder->insert($role);
            }
        }

        echo "Roles seeded.\n";
    }
}
