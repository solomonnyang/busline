<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the mover_profiles table.
 * One mover profile per vendor (extended info for a moving agency).
 */
class CreateMoverProfilesTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'          => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'vendor_id'   => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'description' => ['type' => 'TEXT', 'null' => true],
            'service_areas' => ['type' => 'JSON', 'null' => true],
            'vehicle_types' => ['type' => 'JSON', 'null' => true],
            'base_fee'    => ['type' => 'DECIMAL', 'constraint' => '12,2', 'null' => false, 'default' => 0],
            'status'      => ['type' => "ENUM('active','inactive')", 'default' => 'active', 'null' => false],
            'created_at'  => ['type' => 'DATETIME', 'null' => true],
            'updated_at'  => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('vendor_id');
        $this->forge->addKey('status');
        $this->forge->addForeignKey('vendor_id', 'vendors', 'id', 'CASCADE', 'RESTRICT', 'fk_mover_profiles_vendor');
        $this->forge->createTable('mover_profiles');
    }

    public function down()
    {
        $this->forge->dropTable('mover_profiles');
    }
}