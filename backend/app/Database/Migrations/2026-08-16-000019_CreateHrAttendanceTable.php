<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the hr_attendance table.
 * Daily attendance records per staff member. One row per staff member per date.
 */
class CreateHrAttendanceTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'           => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'vendor_id'    => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'staff_id'     => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'date'         => ['type' => 'DATE', 'null' => false],
            'check_in'     => ['type' => 'TIME', 'null' => true],
            'check_out'    => ['type' => 'TIME', 'null' => true],
            'hours_worked' => ['type' => 'DECIMAL', 'constraint' => '5,2', 'default' => 0, 'null' => false],
            'status'       => ['type' => "ENUM('present','late','half_day','absent','leave','holiday')", 'default' => 'present', 'null' => false],
            'note'         => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'recorded_by'  => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'created_at'   => ['type' => 'DATETIME', 'null' => true],
            'updated_at'   => ['type' => 'DATETIME', 'null' => true],
            'deleted_at'   => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('vendor_id');
        $this->forge->addKey('staff_id');
        $this->forge->addKey('date');
        $this->forge->addUniqueKey(['staff_id', 'date']);
        $this->forge->addForeignKey('vendor_id', 'vendors', 'id', 'CASCADE', 'RESTRICT', 'fk_attendance_vendor');
        $this->forge->addForeignKey('staff_id', 'staff', 'id', 'CASCADE', 'CASCADE', 'fk_attendance_staff');
        $this->forge->createTable('hr_attendance');
    }

    public function down()
    {
        $this->forge->dropTable('hr_attendance');
    }
}
