<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the notifications table.
 * Per-user in-app notifications (booking updates, payouts, approvals, reviews).
 */
class CreateNotificationsTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'         => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'user_id'    => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'type'       => ['type' => 'VARCHAR', 'constraint' => 50, 'default' => 'info', 'null' => false],
            'title'      => ['type' => 'VARCHAR', 'constraint' => 150, 'null' => false],
            'message'    => ['type' => 'VARCHAR', 'constraint' => 500, 'null' => true],
            'data'       => ['type' => 'JSON', 'null' => true],
            'is_read'    => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 0, 'null' => false],
            'read_at'    => ['type' => 'DATETIME', 'null' => true],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('user_id');
        $this->forge->addKey('is_read');
        $this->forge->addForeignKey('user_id', 'users', 'id', 'CASCADE', 'CASCADE', 'fk_notifications_user');
        $this->forge->createTable('notifications');
    }

    public function down()
    {
        $this->forge->dropTable('notifications');
    }
}
