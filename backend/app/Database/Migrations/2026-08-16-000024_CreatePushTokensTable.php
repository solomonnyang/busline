<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the push_tokens table.
 * Stores a user's Expo push tokens (one or more devices per user) so the
 * admin/support can deliver remote push notifications.
 */
class CreatePushTokensTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'         => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'user_id'    => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'token'      => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => false],
            'platform'   => ['type' => 'VARCHAR', 'constraint' => 30, 'default' => 'ios', 'null' => false],
            'device'     => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'is_active'  => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 1, 'null' => false],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('user_id');
        $this->forge->addUniqueKey(['token']);
        $this->forge->addForeignKey('user_id', 'users', 'id', 'CASCADE', 'CASCADE', 'fk_push_tokens_user');
        $this->forge->createTable('push_tokens');
    }

    public function down()
    {
        $this->forge->dropTable('push_tokens');
    }
}
