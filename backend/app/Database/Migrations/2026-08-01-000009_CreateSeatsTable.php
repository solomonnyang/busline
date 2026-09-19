<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the seats table.
 * Pre-generated physical seats for every bus.
 */
class CreateSeatsTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'          => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'bus_id'      => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'seat_number' => ['type' => 'VARCHAR', 'constraint' => 10, 'null' => false],
            'seat_row'    => ['type' => 'INT', 'constraint' => 11, 'null' => false],
            'seat_column' => ['type' => 'VARCHAR', 'constraint' => 5, 'null' => false],
            'seat_type'   => ['type' => "ENUM('window','aisle','middle')", 'default' => 'aisle', 'null' => false],
            'is_active'   => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 1, 'null' => false],
            'created_at'  => ['type' => 'DATETIME', 'null' => true],
            'updated_at'  => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('bus_id');
        $this->forge->addUniqueKey(['bus_id', 'seat_number']);
        $this->forge->addForeignKey('bus_id', 'buses', 'id', 'CASCADE', 'RESTRICT', 'fk_seats_bus');
        $this->forge->createTable('seats');
    }

    public function down()
    {
        $this->forge->dropTable('seats');
    }
}
