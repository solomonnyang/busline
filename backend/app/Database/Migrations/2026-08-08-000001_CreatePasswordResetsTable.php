<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the password_resets table for the "forgot password" flow.
 * Stores a hashed reset token per email with an expiry timestamp.
 */
class CreatePasswordResetsTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'         => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'email'      => ['type' => 'VARCHAR', 'constraint' => 190, 'null' => false],
            'token'      => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => false],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('email');
        $this->forge->addKey('token');
        $this->forge->createTable('password_resets');
    }

    public function down()
    {
        $this->forge->dropTable('password_resets');
    }
}
