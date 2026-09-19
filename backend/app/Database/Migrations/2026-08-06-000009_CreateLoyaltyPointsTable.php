<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the loyalty_points table.
 * Ledger of loyalty points: positive rows for earned points (from paid
 * bookings) and negative rows for redemptions to wallet balance. The
 * balance is the running SUM(points) per customer.
 */
class CreateLoyaltyPointsTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'          => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'customer_id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'points'      => ['type' => 'INT', 'constraint' => 11, 'default' => 0, 'null' => false],
            'type'        => ['type' => "ENUM('earn','redeem')", 'default' => 'earn', 'null' => false],
            'source'      => ['type' => "ENUM('booking','redeem')", 'default' => 'booking', 'null' => false],
            'description' => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'reference'   => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => false],
            'booking_id'  => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'created_at'  => ['type' => 'DATETIME', 'null' => true],
            'updated_at'  => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('reference');
        $this->forge->addKey('customer_id');
        $this->forge->addKey('booking_id');
        $this->forge->addForeignKey('customer_id', 'customers', 'id', 'CASCADE', 'RESTRICT', 'fk_loyalty_customer');
        $this->forge->createTable('loyalty_points');
    }

    public function down()
    {
        $this->forge->dropTable('loyalty_points');
    }
}
