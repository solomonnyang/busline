<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the terminals table.
 * Bus terminals belong to a city and carry coordinates for map markers.
 */
class CreateTerminalsTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'         => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'city_id'    => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'name'       => ['type' => 'VARCHAR', 'constraint' => 160, 'null' => false],
            'address'    => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'lat'        => ['type' => 'DECIMAL', 'constraint' => '10,7', 'null' => false],
            'lng'        => ['type' => 'DECIMAL', 'constraint' => '10,7', 'null' => false],
            'photo_url'  => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'amenities'  => ['type' => 'TEXT', 'null' => true],
            'is_active'  => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 1, 'null' => false],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
            'deleted_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('city_id');
        $this->forge->addKey(['lat', 'lng']);
        $this->forge->createTable('terminals');
    }

    public function down()
    {
        $this->forge->dropTable('terminals');
    }
}
