<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the routes table.
 * A route links two cities with distance and estimated duration.
 */
class CreateRoutesTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'                  => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'vendor_id'           => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'origin_city_id'      => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'destination_city_id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'distance_km'         => ['type' => 'DECIMAL', 'constraint' => '10,2', 'null' => false],
            'estimated_duration'  => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true, 'comment' => 'Duration in minutes'],
            'status'              => ['type' => "ENUM('active','inactive')", 'default' => 'active', 'null' => false],
            'created_at'          => ['type' => 'DATETIME', 'null' => true],
            'updated_at'          => ['type' => 'DATETIME', 'null' => true],
            'deleted_at'          => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('vendor_id');
        $this->forge->addKey('origin_city_id');
        $this->forge->addKey('destination_city_id');
        $this->forge->addKey(['origin_city_id', 'destination_city_id']);
        $this->forge->addForeignKey('vendor_id', 'vendors', 'id', 'CASCADE', 'RESTRICT', 'fk_routes_vendor');
        $this->forge->addForeignKey('origin_city_id', 'cities', 'id', 'CASCADE', 'RESTRICT', 'fk_routes_origin');
        $this->forge->addForeignKey('destination_city_id', 'cities', 'id', 'CASCADE', 'RESTRICT', 'fk_routes_destination');
        $this->forge->createTable('routes');
    }

    public function down()
    {
        $this->forge->dropTable('routes');
    }
}
