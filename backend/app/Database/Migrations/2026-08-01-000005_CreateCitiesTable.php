<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the cities table.
 * Reference data used by routes (origin / destination).
 */
class CreateCitiesTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'         => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'name'       => ['type' => 'VARCHAR', 'constraint' => 120, 'null' => false],
            'state'      => ['type' => 'VARCHAR', 'constraint' => 120, 'null' => true],
            'is_active'  => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 1, 'null' => false],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
            'deleted_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey(['name', 'state']);
        $this->forge->addKey('is_active');
        $this->forge->createTable('cities');
    }

    public function down()
    {
        $this->forge->dropTable('cities');
    }
}
