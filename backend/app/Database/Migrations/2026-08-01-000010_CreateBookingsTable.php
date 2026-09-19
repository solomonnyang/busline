<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the bookings table.
 * One booking = one trip = multiple seats (booking_seats rows).
 */
class CreateBookingsTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'             => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'booking_number' => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => false],
            'customer_id'    => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'trip_id'        => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'booking_date'   => ['type' => 'DATETIME', 'null' => false],
            'total_amount'   => ['type' => 'DECIMAL', 'constraint' => '12,2', 'null' => false, 'default' => 0],
            'seat_count'     => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'default' => 1, 'null' => false],
            'status'         => ['type' => "ENUM('pending','confirmed','cancelled','completed')", 'default' => 'pending', 'null' => false],
            'payment_status' => ['type' => "ENUM('unpaid','paid','refunded','failed')", 'default' => 'unpaid', 'null' => false],
            'qr_code'        => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'checked_in'     => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 0, 'null' => false],
            'checked_in_at'  => ['type' => 'DATETIME', 'null' => true],
            'created_at'     => ['type' => 'DATETIME', 'null' => true],
            'updated_at'     => ['type' => 'DATETIME', 'null' => true],
            'deleted_at'     => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('booking_number');
        $this->forge->addKey('customer_id');
        $this->forge->addKey('trip_id');
        $this->forge->addKey(['trip_id', 'status']);
        $this->forge->addForeignKey('customer_id', 'customers', 'id', 'CASCADE', 'RESTRICT', 'fk_bookings_customer');
        $this->forge->addForeignKey('trip_id', 'trips', 'id', 'CASCADE', 'RESTRICT', 'fk_bookings_trip');
        $this->forge->createTable('bookings');
    }

    public function down()
    {
        $this->forge->dropTable('bookings');
    }
}
