<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Adds a terminal_id column to the buses table so a vendor can assign each
 * bus to one of the terminals they are registered to. The bus's terminal
 * determines which terminal its scheduled trips depart from.
 */
class AddTerminalToBusesTable extends Migration
{
    public function up()
    {
        $this->forge->addColumn('buses', [
            'terminal_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
                'null'       => true,
                'after'      => 'vendor_id',
            ],
        ]);

        $this->db->query('ALTER TABLE buses ADD CONSTRAINT fk_buses_terminal FOREIGN KEY (terminal_id) REFERENCES terminals(id) ON DELETE SET NULL ON UPDATE RESTRICT');
        $this->db->query('CREATE INDEX idx_buses_terminal ON buses (terminal_id)');

        // Backfill existing buses from their vendor's primary terminal.
        $this->db->query(
            'UPDATE buses b JOIN vendors v ON v.id = b.vendor_id
             SET b.terminal_id = v.terminal_id
             WHERE b.terminal_id IS NULL'
        );
    }

    public function down()
    {
        $this->db->query('ALTER TABLE buses DROP FOREIGN KEY fk_buses_terminal');
        $this->db->query('DROP INDEX idx_buses_terminal ON buses');
        $this->forge->dropColumn('buses', 'terminal_id');
    }
}
