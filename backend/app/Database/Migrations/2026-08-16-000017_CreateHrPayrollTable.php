<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the hr_payroll table.
 * Pay runs per staff member. net_pay = basic_salary + allowances - deductions.
 */
class CreateHrPayrollTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'            => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'vendor_id'     => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'staff_id'      => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'period_start'  => ['type' => 'DATE', 'null' => false],
            'period_end'    => ['type' => 'DATE', 'null' => false],
            'basic_salary'  => ['type' => 'DECIMAL', 'constraint' => '12,2', 'default' => 0, 'null' => false],
            'allowances'    => ['type' => 'DECIMAL', 'constraint' => '12,2', 'default' => 0, 'null' => false],
            'deductions'    => ['type' => 'DECIMAL', 'constraint' => '12,2', 'default' => 0, 'null' => false],
            'net_pay'       => ['type' => 'DECIMAL', 'constraint' => '12,2', 'default' => 0, 'null' => false],
            'status'        => ['type' => "ENUM('draft','paid','cancelled')", 'default' => 'draft', 'null' => false],
            'paid_at'       => ['type' => 'DATETIME', 'null' => true],
            'note'          => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'created_by'    => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'created_at'    => ['type' => 'DATETIME', 'null' => true],
            'updated_at'    => ['type' => 'DATETIME', 'null' => true],
            'deleted_at'    => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('vendor_id');
        $this->forge->addKey('staff_id');
        $this->forge->addKey('status');
        $this->forge->addForeignKey('vendor_id', 'vendors', 'id', 'CASCADE', 'RESTRICT', 'fk_payroll_vendor');
        $this->forge->addForeignKey('staff_id', 'staff', 'id', 'CASCADE', 'CASCADE', 'fk_payroll_staff');
        $this->forge->createTable('hr_payroll');
    }

    public function down()
    {
        $this->forge->dropTable('hr_payroll');
    }
}
