<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the sessions table.
 * Tracks active JWT sessions per user so the security view can list devices,
 * revoke individual sessions, and the AuthFilter can reject revoked tokens.
 */
class CreateSessionsTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'               => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'user_id'          => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'token_hash'       => ['type' => 'VARCHAR', 'constraint' => 64, 'null' => false],
            'device'           => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'ip_address'       => ['type' => 'VARCHAR', 'constraint' => 45, 'null' => true],
            'user_agent'       => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'expires_at'       => ['type' => 'DATETIME', 'null' => false],
            'is_active'        => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 1, 'null' => false],
            'last_activity_at' => ['type' => 'DATETIME', 'null' => true],
            'created_at'       => ['type' => 'DATETIME', 'null' => true],
            'updated_at'       => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('token_hash');
        $this->forge->addKey('user_id');
        $this->forge->addKey(['user_id', 'is_active']);
        $this->forge->addForeignKey('user_id', 'users', 'id', 'CASCADE', 'CASCADE', 'fk_sessions_user');
        $this->forge->createTable('sessions');
    }

    public function down()
    {
        $this->forge->dropTable('sessions');
    }
}
