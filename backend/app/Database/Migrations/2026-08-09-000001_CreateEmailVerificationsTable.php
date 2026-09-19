<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the email_verifications table for the email verification flow.
 * Stores a hashed 6-digit code per email with an expiry timestamp.
 */
class CreateEmailVerificationsTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'         => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'email'      => ['type' => 'VARCHAR', 'constraint' => 190, 'null' => false],
            'code'       => ['type' => 'VARCHAR', 'constraint' => 64, 'null' => false],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('email');
        $this->forge->addKey('code');
        $this->forge->createTable('email_verifications');
    }

    public function down()
    {
        $this->forge->dropTable('email_verifications');
    }
}
