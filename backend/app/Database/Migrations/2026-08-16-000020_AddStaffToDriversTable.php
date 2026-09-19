<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Links fleet drivers to vendor staff members so a driver can be
 * created by picking an existing staff member.
 */
class AddStaffToDriversTable extends Migration
{
    public function up()
    {
        $this->forge->addColumn('drivers', [
            'staff_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
                'null'       => true,
                'after'      => 'vendor_id',
            ],
        ]);

        $this->db->query('ALTER TABLE drivers ADD CONSTRAINT fk_drivers_staff FOREIGN KEY (staff_id) REFERENCES staff (id) ON DELETE SET NULL ON UPDATE RESTRICT');
        $this->db->query('CREATE UNIQUE INDEX uq_drivers_staff_id ON drivers (staff_id)');
    }

    public function down()
    {
        $this->db->query('ALTER TABLE drivers DROP FOREIGN KEY fk_drivers_staff');
        $this->db->query('DROP INDEX uq_drivers_staff_id ON drivers');
        $this->forge->dropColumn('drivers', 'staff_id');
    }
}
