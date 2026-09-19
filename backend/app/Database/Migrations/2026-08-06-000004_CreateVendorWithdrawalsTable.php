<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the vendor_withdrawals table.
 * Vendors request payouts from their earned revenue; a super admin approves
 * or rejects each request. The vendor's available balance is computed as
 * total paid bookings revenue minus pending/approved withdrawal amounts.
 */
class CreateVendorWithdrawalsTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'             => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'vendor_id'      => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'amount'         => ['type' => 'DECIMAL', 'constraint' => '12,2', 'null' => false],
            'bank_name'      => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => false],
            'account_name'   => ['type' => 'VARCHAR', 'constraint' => 150, 'null' => false],
            'account_number' => ['type' => 'VARCHAR', 'constraint' => 30, 'null' => false],
            'reference'      => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => false],
            'status'         => ['type' => "ENUM('pending','approved','rejected')", 'default' => 'pending', 'null' => false],
            'admin_id'       => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'admin_note'     => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'processed_at'   => ['type' => 'DATETIME', 'null' => true],
            'created_at'     => ['type' => 'DATETIME', 'null' => true],
            'updated_at'     => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('reference');
        $this->forge->addKey('vendor_id');
        $this->forge->addKey('status');
        $this->forge->addForeignKey('vendor_id', 'vendors', 'id', 'CASCADE', 'RESTRICT', 'fk_vendor_withdrawals_vendor');
        $this->forge->createTable('vendor_withdrawals');
    }

    public function down()
    {
        $this->forge->dropTable('vendor_withdrawals');
    }
}
