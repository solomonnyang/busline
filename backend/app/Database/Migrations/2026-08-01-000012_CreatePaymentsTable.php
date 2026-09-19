<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the payments table.
 * Tracks payments made against bookings (cash placeholder / Paystack).
 */
class CreatePaymentsTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'                => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'booking_id'        => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'payment_reference' => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => false],
            'amount'            => ['type' => 'DECIMAL', 'constraint' => '12,2', 'null' => false],
            'payment_method'    => ['type' => "ENUM('cash','paystack','card','transfer')", 'default' => 'cash', 'null' => false],
            'status'            => ['type' => "ENUM('pending','success','failed')", 'default' => 'pending', 'null' => false],
            'transaction_id'    => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'paystack_ref'      => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'paid_at'           => ['type' => 'DATETIME', 'null' => true],
            'metadata'          => ['type' => 'JSON', 'null' => true],
            'created_at'        => ['type' => 'DATETIME', 'null' => true],
            'updated_at'        => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('payment_reference');
        $this->forge->addKey('booking_id');
        $this->forge->addKey('status');
        $this->forge->addForeignKey('booking_id', 'bookings', 'id', 'CASCADE', 'RESTRICT', 'fk_payments_booking');
        $this->forge->createTable('payments');
    }

    public function down()
    {
        $this->forge->dropTable('payments');
    }
}
