<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the payment_accounts table.
 * Saved bank accounts a vendor can select from when requesting a withdrawal.
 * Replaces ad-hoc bank details on the withdrawal request form.
 */
class CreatePaymentAccountsTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'             => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'vendor_id'      => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'bank_name'      => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => false],
            'account_name'   => ['type' => 'VARCHAR', 'constraint' => 150, 'null' => false],
            'account_number' => ['type' => 'VARCHAR', 'constraint' => 30, 'null' => false],
            'is_default'     => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 0, 'null' => false],
            'created_at'     => ['type' => 'DATETIME', 'null' => true],
            'updated_at'     => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('vendor_id');
        $this->forge->addKey(['vendor_id', 'is_default']);
        $this->forge->addForeignKey('vendor_id', 'vendors', 'id', 'CASCADE', 'RESTRICT', 'fk_payment_accounts_vendor');
        $this->forge->createTable('payment_accounts');
    }

    public function down()
    {
        $this->forge->dropTable('payment_accounts');
    }
}
