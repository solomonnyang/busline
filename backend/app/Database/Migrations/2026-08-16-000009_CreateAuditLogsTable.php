<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the audit_logs table.
 * Tracks sensitive actions (bookings, payouts, staff changes, profile edits)
 * for the vendor security / activity log. vendor_id allows scoping.
 */
class CreateAuditLogsTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'         => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'user_id'    => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'vendor_id'  => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'action'     => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => false],
            'model_type' => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'model_id'   => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'changes'    => ['type' => 'JSON', 'null' => true],
            'ip_address' => ['type' => 'VARCHAR', 'constraint' => 45, 'null' => true],
            'user_agent' => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('user_id');
        $this->forge->addKey('vendor_id');
        $this->forge->addKey(['vendor_id', 'created_at']);
        $this->forge->addForeignKey('user_id', 'users', 'id', 'SET_NULL', 'CASCADE', 'fk_audit_logs_user');
        $this->forge->addForeignKey('vendor_id', 'vendors', 'id', 'SET_NULL', 'CASCADE', 'fk_audit_logs_vendor');
        $this->forge->createTable('audit_logs');
    }

    public function down()
    {
        $this->forge->dropTable('audit_logs');
    }
}
