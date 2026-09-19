<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the login_history table.
 * Records every sign-in attempt (success and failure) for the security view.
 */
class CreateLoginHistoryTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'         => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'user_id'    => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'ip_address' => ['type' => 'VARCHAR', 'constraint' => 45, 'null' => true],
            'user_agent' => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'device'     => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'location'   => ['type' => 'VARCHAR', 'constraint' => 150, 'null' => true],
            'is_success' => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 1, 'null' => false],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('user_id');
        $this->forge->addKey(['user_id', 'created_at']);
        $this->forge->addForeignKey('user_id', 'users', 'id', 'CASCADE', 'CASCADE', 'fk_login_history_user');
        $this->forge->createTable('login_history');
    }

    public function down()
    {
        $this->forge->dropTable('login_history');
    }
}
