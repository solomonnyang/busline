<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Adds run_id to hr_payroll so pay lines can be grouped under a payroll run.
 * Soft-deleting a run sets the lines to null run_id via ON DELETE SET NULL.
 */
class AddRunIdToHrPayroll extends Migration
{
    public function up()
    {
        $this->forge->addColumn('hr_payroll', [
            'run_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
                'null'       => true,
                'after'      => 'staff_id',
            ],
        ]);
        $this->forge->addKey('run_id', false, false, 'hr_payroll');
        $this->forge->addForeignKey('run_id', 'hr_payroll_runs', 'id', 'SET NULL', 'RESTRICT', 'fk_payroll_line_run');
    }

    public function down()
    {
        $this->forge->dropForeignKey('hr_payroll', 'fk_payroll_line_run');
        $this->forge->dropColumn('hr_payroll', 'run_id');
    }
}
