<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Adds richer fleet details to the buses table: manufacturer, model, year,
 * amenities, photos and internal notes for the vendor fleet management view.
 */
class AddFleetFieldsToBusesTable extends Migration
{
    public function up()
    {
        $this->forge->addColumn('buses', [
            'manufacturer' => [
                'type'       => 'VARCHAR',
                'constraint' => 100,
                'null'       => true,
                'after'      => 'bus_name',
            ],
            'model' => [
                'type'       => 'VARCHAR',
                'constraint' => 100,
                'null'       => true,
                'after'      => 'manufacturer',
            ],
            'year' => [
                'type'       => 'SMALLINT',
                'unsigned'   => true,
                'null'       => true,
                'after'      => 'model',
            ],
            'amenities' => [
                'type'  => 'JSON',
                'null'  => true,
                'after' => 'seat_layout',
            ],
            'photos' => [
                'type'  => 'JSON',
                'null'  => true,
                'after' => 'amenities',
            ],
            'notes' => [
                'type'  => 'TEXT',
                'null'  => true,
                'after' => 'photos',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('buses', ['manufacturer', 'model', 'year', 'amenities', 'photos', 'notes']);
    }
}
