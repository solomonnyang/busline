<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Migrates buses to admin-managed bus categories:
 *  - bus_type ENUM becomes VARCHAR(100) so any active category name fits.
 *  - adds nullable category_id FK to bus_categories (SET NULL on delete).
 * Existing buses keep their bus_type value; a seeder backfills category_id.
 */
class UpdateBusesForCategoriesTable extends Migration
{
    public function up()
    {
        $this->forge->modifyColumn('buses', [
            'bus_type' => ['type' => 'VARCHAR', 'constraint' => 100, 'default' => 'standard', 'null' => false],
        ]);

        $this->forge->addColumn('buses', [
            'category_id' => [
                'type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true,
                'after' => 'bus_type',
            ],
        ]);

        $this->forge->addForeignKey('category_id', 'bus_categories', 'id', 'SET NULL', 'RESTRICT', 'fk_buses_category', 'buses');
    }

    public function down()
    {
        $this->forge->dropForeignKey('buses', 'fk_buses_category');
        $this->forge->dropColumn('buses', 'category_id');
        $this->forge->modifyColumn('buses', [
            'bus_type' => ['type' => "ENUM('standard','luxury','vip','executive')", 'default' => 'standard', 'null' => false],
        ]);
    }
}
