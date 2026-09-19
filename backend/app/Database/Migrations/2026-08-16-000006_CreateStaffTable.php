<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the staff table.
 * Vendor team members (users with the vendor_staff role) that can be granted
 * scoped permissions inside a vendor's dashboard.
 */
class CreateStaffTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'          => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'vendor_id'   => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'user_id'     => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'role'        => ['type' => "ENUM('manager','operator','accountant','support','viewer')", 'default' => 'viewer', 'null' => false],
            'permissions' => ['type' => 'JSON', 'null' => true],
            'is_active'   => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 1, 'null' => false],
            'created_at'  => ['type' => 'DATETIME', 'null' => true],
            'updated_at'  => ['type' => 'DATETIME', 'null' => true],
            'deleted_at'  => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('user_id');
        $this->forge->addKey('vendor_id');
        $this->forge->addKey('role');
        $this->forge->addForeignKey('vendor_id', 'vendors', 'id', 'CASCADE', 'RESTRICT', 'fk_staff_vendor');
        $this->forge->addForeignKey('user_id', 'users', 'id', 'CASCADE', 'CASCADE', 'fk_staff_user');
        $this->forge->createTable('staff');

        // Ensure the vendor_staff role exists for staff login resolution.
        $exists = $this->db->table('roles')->where('slug', 'vendor_staff')->countAllResults();
        if ($exists === 0) {
            $now = date('Y-m-d H:i:s');
            $this->db->table('roles')->insert([
                'name'        => 'Vendor Staff',
                'slug'        => 'vendor_staff',
                'description' => 'Vendor team member with scoped dashboard permissions',
                'created_at'  => $now,
                'updated_at'  => $now,
            ]);
        }
    }

    public function down()
    {
        $this->forge->dropTable('staff');
    }
}
