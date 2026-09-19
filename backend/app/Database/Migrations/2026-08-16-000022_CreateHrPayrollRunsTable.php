<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the hr_payroll_runs table.
 * A payroll run groups the month's pay lines for all active staff so they
 * can be reviewed (draft), approved, and paid as a single batch. Each run
 * snapshots staff into hr_payroll rows linked by run_id.
 */
class CreateHrPayrollRunsTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'              => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'vendor_id'       => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'period_start'    => ['type' => 'DATE', 'null' => false],
            'period_end'      => ['type' => 'DATE', 'null' => false],
            'status'          => ['type' => "ENUM('draft','approved','paid','cancelled')", 'default' => 'draft', 'null' => false],
            'gross_total'     => ['type' => 'DECIMAL', 'constraint' => '12,2', 'default' => 0, 'null' => false],
            'deduction_total' => ['type' => 'DECIMAL', 'constraint' => '12,2', 'default' => 0, 'null' => false],
            'net_total'       => ['type' => 'DECIMAL', 'constraint' => '12,2', 'default' => 0, 'null' => false],
            'payment_ref'     => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'paid_at'         => ['type' => 'DATETIME', 'null' => true],
            'created_by'      => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'approved_by'     => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'created_at'      => ['type' => 'DATETIME', 'null' => true],
            'updated_at'      => ['type' => 'DATETIME', 'null' => true],
            'deleted_at'      => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('vendor_id');
        $this->forge->addKey('status');
        $this->forge->addForeignKey('vendor_id', 'vendors', 'id', 'CASCADE', 'RESTRICT', 'fk_payroll_run_vendor');
        $this->forge->createTable('hr_payroll_runs');
    }

    public function down()
    {
        $this->forge->dropTable('hr_payroll_runs');
    }
}
