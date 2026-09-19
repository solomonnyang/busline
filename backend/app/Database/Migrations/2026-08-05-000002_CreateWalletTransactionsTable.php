<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the wallet_transactions table.
 * Every credit (top-up) and debit (future wallet payments) is recorded here
 * so the wallet history can be shown on the payment screen.
 */
class CreateWalletTransactionsTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'             => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'wallet_id'      => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'type'           => ['type' => "ENUM('credit','debit')", 'default' => 'credit', 'null' => false],
            'amount'         => ['type' => 'DECIMAL', 'constraint' => '12,2', 'null' => false],
            'reference'      => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => false],
            'description'    => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'status'         => ['type' => "ENUM('pending','success','failed')", 'default' => 'pending', 'null' => false],
            'payment_method' => ['type' => "ENUM('paystack','cash','card','transfer')", 'default' => 'paystack', 'null' => false],
            'paystack_ref'   => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'paid_at'        => ['type' => 'DATETIME', 'null' => true],
            'created_at'     => ['type' => 'DATETIME', 'null' => true],
            'updated_at'     => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('reference');
        $this->forge->addKey('wallet_id');
        $this->forge->addKey('status');
        $this->forge->addForeignKey('wallet_id', 'wallets', 'id', 'CASCADE', 'RESTRICT', 'fk_wallet_tx_wallet');
        $this->forge->createTable('wallet_transactions');
    }

    public function down()
    {
        $this->forge->dropTable('wallet_transactions');
    }
}
