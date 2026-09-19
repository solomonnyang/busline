<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the buses table.
 * Buses belong to a vendor and define seating capacity / layout.
 */
class CreateBusesTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'                  => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'vendor_id'           => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'bus_name'            => ['type' => 'VARCHAR', 'constraint' => 150, 'null' => false],
            'registration_number' => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => false],
            'bus_type'            => ['type' => "ENUM('standard','luxury','vip','executive')", 'default' => 'standard', 'null' => false],
            'total_seats'         => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'default' => 30, 'null' => false],
            'seat_layout'         => ['type' => 'JSON', 'null' => true],
            'status'              => ['type' => "ENUM('active','inactive','maintenance')", 'default' => 'active', 'null' => false],
            'created_at'          => ['type' => 'DATETIME', 'null' => true],
            'updated_at'          => ['type' => 'DATETIME', 'null' => true],
            'deleted_at'          => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('registration_number');
        $this->forge->addKey('vendor_id');
        $this->forge->addKey('status');
        $this->forge->addForeignKey('vendor_id', 'vendors', 'id', 'CASCADE', 'RESTRICT', 'fk_buses_vendor');
        $this->forge->createTable('buses');
    }

    public function down()
    {
        $this->forge->dropTable('buses');
    }
}
