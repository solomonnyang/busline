<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Adds the "driver" role to the staff table enum so team members can be
 * tagged as drivers (and then linked to a fleet driver record).
 */
class AddDriverRoleToStaff extends Migration
{
    public function up()
    {
        $this->db->query("ALTER TABLE staff MODIFY role ENUM('manager','operator','accountant','support','driver','viewer') NOT NULL DEFAULT 'viewer'");
    }

    public function down()
    {
        // Drivers with the role removed are reset to viewer on rollback.
        $this->db->query("UPDATE staff SET role = 'viewer' WHERE role = 'driver'");
        $this->db->query("ALTER TABLE staff MODIFY role ENUM('manager','operator','accountant','support','viewer') NOT NULL DEFAULT 'viewer'");
    }
}
