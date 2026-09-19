<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Adds human-resources fields to the staff table.
 * Position, department, hire date, compensation and bank details power the
 * payroll, leave and attendance modules.
 */
class AddHRFieldsToStaffTable extends Migration
{
    public function up()
    {
        $this->forge->addColumn('staff', [
            'position'         => ['type' => 'VARCHAR', 'constraint' => 150, 'null' => true],
            'department'       => ['type' => 'VARCHAR', 'constraint' => 150, 'null' => true],
            'hire_date'        => ['type' => 'DATE', 'null' => true],
            'base_salary'      => ['type' => 'DECIMAL', 'constraint' => '12,2', 'null' => true],
            'salary_frequency' => ['type' => "ENUM('monthly','weekly','daily')", 'default' => 'monthly', 'null' => false],
            'account_name'     => ['type' => 'VARCHAR', 'constraint' => 150, 'null' => true],
            'account_number'   => ['type' => 'VARCHAR', 'constraint' => 30, 'null' => true],
            'bank_name'        => ['type' => 'VARCHAR', 'constraint' => 150, 'null' => true],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('staff', ['position', 'department', 'hire_date', 'base_salary', 'salary_frequency', 'account_name', 'account_number', 'bank_name']);
    }
}
