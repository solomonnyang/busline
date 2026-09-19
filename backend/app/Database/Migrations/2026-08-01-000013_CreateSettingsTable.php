<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the settings table.
 * Key/value store for system configuration.
 */
class CreateSettingsTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'         => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'group'      => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => false, 'default' => 'general'],
            'key'        => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => false],
            'value'      => ['type' => 'TEXT', 'null' => true],
            'is_json'    => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 0, 'null' => false],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey(['group', 'key']);
        $this->forge->createTable('settings');
    }

    public function down()
    {
        $this->forge->dropTable('settings');
    }
}
