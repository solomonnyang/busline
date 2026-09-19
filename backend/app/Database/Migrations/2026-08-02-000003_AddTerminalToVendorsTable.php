<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Adds a terminal_id column to the vendors table so each vendor
 * belongs to a bus terminal. Nullable until an admin assigns one.
 */
class AddTerminalToVendorsTable extends Migration
{
    public function up()
    {
        $this->forge->addColumn('vendors', [
            'terminal_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
                'null'       => true,
                'after'      => 'user_id',
            ],
        ]);

        $this->db->query('ALTER TABLE vendors ADD CONSTRAINT fk_vendors_terminal FOREIGN KEY (terminal_id) REFERENCES terminals(id) ON DELETE SET NULL ON UPDATE RESTRICT');
        $this->db->query('CREATE INDEX idx_vendors_terminal ON vendors (terminal_id)');
    }

    public function down()
    {
        $this->db->query('ALTER TABLE vendors DROP FOREIGN KEY fk_vendors_terminal');
        $this->db->query('DROP INDEX idx_vendors_terminal ON vendors');
        $this->forge->dropColumn('vendors', 'terminal_id');
    }
}
