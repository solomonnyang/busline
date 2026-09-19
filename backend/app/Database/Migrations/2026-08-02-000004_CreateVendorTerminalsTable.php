<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the vendor_terminals pivot table so a vendor can be registered
 * to multiple bus terminals (many-to-many). vendors.terminal_id is kept as
 * the vendor's primary terminal for display/backward compatibility.
 */
class CreateVendorTerminalsTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'          => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'vendor_id'   => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'terminal_id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'created_at'  => ['type' => 'DATETIME', 'null' => true],
            'updated_at'  => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey(['vendor_id', 'terminal_id']);
        $this->forge->addKey('terminal_id');
        $this->forge->createTable('vendor_terminals');

        $this->db->query('ALTER TABLE vendor_terminals ADD CONSTRAINT fk_vendor_terminals_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE ON UPDATE RESTRICT');
        $this->db->query('ALTER TABLE vendor_terminals ADD CONSTRAINT fk_vendor_terminals_terminal FOREIGN KEY (terminal_id) REFERENCES terminals(id) ON DELETE CASCADE ON UPDATE RESTRICT');

        // Backfill assignments from each vendor's current primary terminal.
        $this->db->query(
            'INSERT INTO vendor_terminals (vendor_id, terminal_id, created_at, updated_at)
             SELECT id, terminal_id, NOW(), NOW() FROM vendors WHERE terminal_id IS NOT NULL'
        );
    }

    public function down()
    {
        $this->db->query('ALTER TABLE vendor_terminals DROP FOREIGN KEY fk_vendor_terminals_terminal');
        $this->db->query('ALTER TABLE vendor_terminals DROP FOREIGN KEY fk_vendor_terminals_vendor');
        $this->forge->dropTable('vendor_terminals');
    }
}
