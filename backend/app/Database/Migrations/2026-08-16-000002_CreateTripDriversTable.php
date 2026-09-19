<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the trip_drivers table.
 * Assigns a driver (or assistant) to a specific trip.
 */
class CreateTripDriversTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'         => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'trip_id'    => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'driver_id'  => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'role'       => ['type' => "ENUM('driver','assistant')", 'default' => 'driver', 'null' => false],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey(['trip_id', 'driver_id']);
        $this->forge->addKey('driver_id');
        $this->forge->addForeignKey('trip_id', 'trips', 'id', 'CASCADE', 'CASCADE', 'fk_trip_drivers_trip');
        $this->forge->addForeignKey('driver_id', 'drivers', 'id', 'CASCADE', 'RESTRICT', 'fk_trip_drivers_driver');
        $this->forge->createTable('trip_drivers');
    }

    public function down()
    {
        $this->forge->dropTable('trip_drivers');
    }
}
