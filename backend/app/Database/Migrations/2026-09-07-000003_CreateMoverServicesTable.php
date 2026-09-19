<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the mover_services table.
 * The moving services a mover offers (e.g. "House move", "Luggage",
 * "Furniture"), with a fixed base price plus a price per km.
 */
class CreateMoverServicesTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'          => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'mover_id'    => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'name'        => ['type' => 'VARCHAR', 'constraint' => 120, 'null' => false],
            'category'    => ['type' => "ENUM('house','office','luggage','furniture','vehicle','other')", 'default' => 'other', 'null' => false],
            'description' => ['type' => 'TEXT', 'null' => true],
            'base_price'  => ['type' => 'DECIMAL', 'constraint' => '12,2', 'null' => false, 'default' => 0],
            'price_per_km'=> ['type' => 'DECIMAL', 'constraint' => '12,2', 'null' => false, 'default' => 0],
            'is_active'   => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 1, 'null' => false],
            'created_at'  => ['type' => 'DATETIME', 'null' => true],
            'updated_at'  => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('mover_id');
        $this->forge->addKey(['mover_id', 'is_active']);
        $this->forge->addForeignKey('mover_id', 'mover_profiles', 'id', 'CASCADE', 'RESTRICT', 'fk_mover_services_mover');
        $this->forge->createTable('mover_services');
    }

    public function down()
    {
        $this->forge->dropTable('mover_services');
    }
}