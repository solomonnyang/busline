<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the seat_layout_templates table.
 * Admin-defined seat arrangement presets (columns per row) that vendors
 * can apply when creating or updating a bus.
 */
class CreateSeatLayoutTemplatesTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'          => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'name'        => ['type' => 'VARCHAR', 'constraint' => 150, 'null' => false],
            'category_id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'description' => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'columns'     => ['type' => 'JSON', 'null' => false],
            'is_active'   => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 1, 'null' => false],
            'created_at'  => ['type' => 'DATETIME', 'null' => true],
            'updated_at'  => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('name');
        $this->forge->addKey('is_active');
        $this->forge->addForeignKey('category_id', 'bus_categories', 'id', 'SET NULL', 'RESTRICT', 'fk_templates_category');
        $this->forge->createTable('seat_layout_templates');
    }

    public function down()
    {
        $this->forge->dropTable('seat_layout_templates');
    }
}
