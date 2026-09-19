<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Adds TOTP two-factor authentication columns to the users table.
 */
class AddTwoFactorToUsersTable extends Migration
{
    public function up()
    {
        $this->forge->addColumn('users', [
            'two_factor_secret'       => ['type' => 'VARCHAR', 'constraint' => 64, 'null' => true],
            'two_factor_enabled'      => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 0, 'null' => false],
            'two_factor_backup_codes' => ['type' => 'TEXT', 'null' => true],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('users', ['two_factor_secret', 'two_factor_enabled', 'two_factor_backup_codes']);
    }
}
