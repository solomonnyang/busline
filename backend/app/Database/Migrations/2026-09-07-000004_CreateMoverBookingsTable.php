<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the mover_bookings table.
 * A user books a mover agency to move items between two addresses/cities.
 */
class CreateMoverBookingsTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'             => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'booking_number' => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => false],
            'customer_id'    => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'mover_id'       => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'service_id'     => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'pickup_address' => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => false],
            'pickup_city_id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'dropoff_address'=> ['type' => 'VARCHAR', 'constraint' => 255, 'null' => false],
            'dropoff_city_id'=> ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'scheduled_date' => ['type' => 'DATETIME', 'null' => false],
            'distance_km'    => ['type' => 'DECIMAL', 'constraint' => '10,2', 'null' => false, 'default' => 0],
            'quantity'       => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false, 'default' => 1],
            'total_amount'   => ['type' => 'DECIMAL', 'constraint' => '12,2', 'null' => false, 'default' => 0],
            'status'         => ['type' => "ENUM('pending','confirmed','completed','cancelled')", 'default' => 'pending', 'null' => false],
            'payment_status' => ['type' => "ENUM('unpaid','paid','refunded','failed')", 'default' => 'unpaid', 'null' => false],
            'notes'          => ['type' => 'TEXT', 'null' => true],
            'created_at'     => ['type' => 'DATETIME', 'null' => true],
            'updated_at'     => ['type' => 'DATETIME', 'null' => true],
            'deleted_at'     => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('booking_number');
        $this->forge->addKey('customer_id');
        $this->forge->addKey('mover_id');
        $this->forge->addKey(['mover_id', 'status']);
        $this->forge->addForeignKey('customer_id', 'customers', 'id', 'CASCADE', 'RESTRICT', 'fk_mover_bookings_customer');
        $this->forge->addForeignKey('mover_id', 'vendors', 'id', 'CASCADE', 'RESTRICT', 'fk_mover_bookings_mover');
        $this->forge->addForeignKey('service_id', 'mover_services', 'id', 'RESTRICT', 'RESTRICT', 'fk_mover_bookings_service');
        $this->forge->createTable('mover_bookings');
    }

    public function down()
    {
        $this->forge->dropTable('mover_bookings');
    }
}