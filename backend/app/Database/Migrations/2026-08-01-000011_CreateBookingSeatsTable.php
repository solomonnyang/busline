<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the booking_seats table.
 * Ties each booked seat to a booking and stores passenger details.
 */
class CreateBookingSeatsTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'              => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'booking_id'      => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'trip_id'         => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'seat_id'         => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'passenger_name'  => ['type' => 'VARCHAR', 'constraint' => 150, 'null' => false],
            'passenger_age'   => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'passenger_gender'=> ['type' => "ENUM('male','female','other')", 'null' => true],
            'ticket_price'    => ['type' => 'DECIMAL', 'constraint' => '12,2', 'null' => false, 'default' => 0],
            'created_at'      => ['type' => 'DATETIME', 'null' => true],
            'updated_at'      => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('booking_id');
        $this->forge->addKey('trip_id');
        $this->forge->addKey('seat_id');
        $this->forge->addUniqueKey(['trip_id', 'seat_id']);
        $this->forge->addForeignKey('booking_id', 'bookings', 'id', 'CASCADE', 'CASCADE', 'fk_booking_seats_booking');
        $this->forge->addForeignKey('trip_id', 'trips', 'id', 'CASCADE', 'RESTRICT', 'fk_booking_seats_trip');
        $this->forge->addForeignKey('seat_id', 'seats', 'id', 'CASCADE', 'RESTRICT', 'fk_booking_seats_seat');
        $this->forge->createTable('booking_seats');
    }

    public function down()
    {
        $this->forge->dropTable('booking_seats');
    }
}
