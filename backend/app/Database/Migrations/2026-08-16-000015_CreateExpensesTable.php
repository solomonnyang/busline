<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the expenses table.
 * Vendors record operating expenses (fuel, maintenance, salaries, tolls, etc.)
 * so the dashboard can compute profit = revenue - expenses for a period.
 */
class CreateExpensesTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'             => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'vendor_id'      => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'category'       => ['type' => "ENUM('fuel','maintenance','salaries','terminal_fees','tolls','insurance','licensing','marketing','utilities','other')", 'default' => 'other', 'null' => false],
            'description'    => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => false],
            'amount'         => ['type' => 'DECIMAL', 'constraint' => '12,2', 'null' => false],
            'expense_date'   => ['type' => 'DATE', 'null' => false],
            'payment_method' => ['type' => "ENUM('cash','bank_transfer','card','wallet','other')", 'default' => 'cash', 'null' => false],
            'reference'      => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'created_by'     => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'created_at'     => ['type' => 'DATETIME', 'null' => true],
            'updated_at'     => ['type' => 'DATETIME', 'null' => true],
            'deleted_at'     => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('vendor_id');
        $this->forge->addKey('expense_date');
        $this->forge->addKey('category');
        $this->forge->addForeignKey('vendor_id', 'vendors', 'id', 'CASCADE', 'RESTRICT', 'fk_expenses_vendor');
        $this->forge->createTable('expenses');
    }

    public function down()
    {
        $this->forge->dropTable('expenses');
    }
}
