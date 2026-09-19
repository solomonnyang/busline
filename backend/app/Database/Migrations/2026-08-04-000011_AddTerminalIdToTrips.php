<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Adds an optional terminal_id to trips so a trip can be assigned to a
 * departure terminal directly, overriding the bus's default terminal.
 */
class AddTerminalIdToTrips extends Migration
{
    public function up()
    {
        $this->forge->addColumn('trips', [
            'terminal_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
                'null'       => true,
                'after'      => 'route_id',
            ],
        ]);
        $this->forge->addKey('terminal_id', false, false, 'trips_terminal_idx');
        $this->forge->addForeignKey('terminal_id', 'terminals', 'id', 'SET NULL', 'RESTRICT', 'fk_trips_terminal');
    }

    public function down()
    {
        $this->forge->dropForeignKey('trips', 'fk_trips_terminal');
        $this->forge->dropKey('trips', 'trips_terminal_idx');
        $this->forge->dropColumn('trips', 'terminal_id');
    }
}
