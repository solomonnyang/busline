<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the hr_leave table.
 * Leave requests per staff member with an approval workflow.
 */
class CreateHrLeaveTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'          => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'vendor_id'   => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'staff_id'    => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'leave_type'  => ['type' => "ENUM('annual','sick','personal','maternity','paternity','unpaid','other')", 'default' => 'annual', 'null' => false],
            'start_date'  => ['type' => 'DATE', 'null' => false],
            'end_date'    => ['type' => 'DATE', 'null' => false],
            'days'        => ['type' => 'INT', 'constraint' => 11, 'null' => false],
            'reason'      => ['type' => 'VARCHAR', 'constraint' => 500, 'null' => true],
            'status'      => ['type' => "ENUM('pending','approved','rejected','cancelled')", 'default' => 'pending', 'null' => false],
            'approved_by' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'approved_at' => ['type' => 'DATETIME', 'null' => true],
            'note'        => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'created_by'  => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'created_at'  => ['type' => 'DATETIME', 'null' => true],
            'updated_at'  => ['type' => 'DATETIME', 'null' => true],
            'deleted_at'  => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('vendor_id');
        $this->forge->addKey('staff_id');
        $this->forge->addKey('status');
        $this->forge->addForeignKey('vendor_id', 'vendors', 'id', 'CASCADE', 'RESTRICT', 'fk_leave_vendor');
        $this->forge->addForeignKey('staff_id', 'staff', 'id', 'CASCADE', 'CASCADE', 'fk_leave_staff');
        $this->forge->createTable('hr_leave');
    }

    public function down()
    {
        $this->forge->dropTable('hr_leave');
    }
}
