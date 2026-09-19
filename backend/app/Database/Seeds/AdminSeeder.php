<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;
use CodeIgniter\I18n\Time;

/**
 * Seeds the super admin user.
 * Credentials: admin@busline.com / admin123
 */
class AdminSeeder extends Seeder
{
    public function run()
    {
        $db = \Config\Database::connect();
        $role = $db->table('roles')->where('slug', 'super_admin')->get()->getRow();

        if (! $role) {
            echo "Roles not found. Run RoleSeeder first.\n";
            return;
        }

        $existing = $db->table('users')->where('email', 'admin@busline.com')->get()->getRow();
        if ($existing) {
            echo "Admin user already exists.\n";
            return;
        }

        $now = date('Y-m-d H:i:s');
        $db->table('users')->insert([
            'name'       => 'System Administrator',
            'email'      => 'admin@busline.com',
            'phone'      => '08000000000',
            'password'   => password_hash('admin123', PASSWORD_DEFAULT),
            'role_id'    => $role->id,
            'is_active'  => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        echo "Super admin seeded: admin@busline.com / admin123\n";
    }
}
