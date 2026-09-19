<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the bus_categories table.
 * Admin-managed bus classes (e.g. standard, luxury, vip) that vendors
 * pick from when creating buses, replacing the hardcoded bus_type ENUM.
 */
class CreateBusCategoriesTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'          => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'name'        => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => false],
            'slug'        => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => false],
            'description' => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'is_active'   => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 1, 'null' => false],
            'created_at'  => ['type' => 'DATETIME', 'null' => true],
            'updated_at'  => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('slug');
        $this->forge->addKey('name');
        $this->forge->addKey('is_active');
        $this->forge->createTable('bus_categories');
    }

    public function down()
    {
        $this->forge->dropTable('bus_categories');
    }
}
