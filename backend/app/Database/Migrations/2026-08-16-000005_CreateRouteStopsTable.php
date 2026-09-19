<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the route_stops table.
 * Ordered intermediate stops along a vendor route with offsets in minutes
 * relative to the route departure time.
 */
class CreateRouteStopsTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'               => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'route_id'         => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'city_id'          => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'name'             => ['type' => 'VARCHAR', 'constraint' => 150, 'null' => false],
            'stop_order'       => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'default' => 0, 'null' => false],
            'arrival_offset'   => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true, 'comment' => 'Minutes after departure'],
            'departure_offset' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true, 'comment' => 'Minutes after departure'],
            'created_at'       => ['type' => 'DATETIME', 'null' => true],
            'updated_at'       => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('route_id');
        $this->forge->addUniqueKey(['route_id', 'stop_order']);
        $this->forge->addForeignKey('route_id', 'routes', 'id', 'CASCADE', 'CASCADE', 'fk_route_stops_route');
        $this->forge->addForeignKey('city_id', 'cities', 'id', 'SET_NULL', 'RESTRICT', 'fk_route_stops_city');
        $this->forge->createTable('route_stops');
    }

    public function down()
    {
        $this->forge->dropTable('route_stops');
    }
}
