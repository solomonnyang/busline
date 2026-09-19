<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the wallets table.
 * One wallet per customer; the running balance is stored here and updated
 * transactionally from wallet_transactions.
 */
class CreateWalletsTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'          => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'customer_id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'balance'     => ['type' => 'DECIMAL', 'constraint' => '12,2', 'null' => false, 'default' => 0],
            'created_at'  => ['type' => 'DATETIME', 'null' => true],
            'updated_at'  => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('customer_id');
        $this->forge->addForeignKey('customer_id', 'customers', 'id', 'CASCADE', 'RESTRICT', 'fk_wallets_customer');
        $this->forge->createTable('wallets');
    }

    public function down()
    {
        $this->forge->dropTable('wallets');
    }
}
