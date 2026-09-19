<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the trips table.
 * A trip pairs a bus with a route on a specific departure schedule.
 */
class CreateTripsTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'              => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'vendor_id'       => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'bus_id'          => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'route_id'        => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'departure_date'  => ['type' => 'DATE', 'null' => false],
            'departure_time'  => ['type' => 'TIME', 'null' => false],
            'arrival_time'    => ['type' => 'TIME', 'null' => true],
            'price'           => ['type' => 'DECIMAL', 'constraint' => '12,2', 'null' => false, 'default' => 0],
            'available_seats' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'status'          => ['type' => "ENUM('scheduled','cancelled','completed','in_progress')", 'default' => 'scheduled', 'null' => false],
            'created_at'      => ['type' => 'DATETIME', 'null' => true],
            'updated_at'      => ['type' => 'DATETIME', 'null' => true],
            'deleted_at'      => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('vendor_id');
        $this->forge->addKey('bus_id');
        $this->forge->addKey('route_id');
        $this->forge->addKey(['departure_date', 'departure_time']);
        $this->forge->addForeignKey('vendor_id', 'vendors', 'id', 'CASCADE', 'RESTRICT', 'fk_trips_vendor');
        $this->forge->addForeignKey('bus_id', 'buses', 'id', 'CASCADE', 'RESTRICT', 'fk_trips_bus');
        $this->forge->addForeignKey('route_id', 'routes', 'id', 'CASCADE', 'RESTRICT', 'fk_trips_route');
        $this->forge->createTable('trips');
    }

    public function down()
    {
        $this->forge->dropTable('trips');
    }
}
