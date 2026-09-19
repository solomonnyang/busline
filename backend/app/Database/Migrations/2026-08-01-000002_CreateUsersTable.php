<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the users table.
 * Single authentication identity for all roles.
 */
class CreateUsersTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'                => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'name'              => ['type' => 'VARCHAR', 'constraint' => 150, 'null' => false],
            'email'             => ['type' => 'VARCHAR', 'constraint' => 190, 'null' => false],
            'phone'             => ['type' => 'VARCHAR', 'constraint' => 30, 'null' => true],
            'password'          => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => false],
            'role_id'           => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'avatar'            => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'is_active'         => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 1, 'null' => false],
            'email_verified_at' => ['type' => 'DATETIME', 'null' => true],
            'remember_token'    => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'created_at'        => ['type' => 'DATETIME', 'null' => true],
            'updated_at'        => ['type' => 'DATETIME', 'null' => true],
            'deleted_at'        => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('email');
        $this->forge->addKey('phone');
        $this->forge->addKey('role_id');
        $this->forge->addForeignKey('role_id', 'roles', 'id', 'CASCADE', 'RESTRICT', 'fk_users_role');
        $this->forge->createTable('users');
    }

    public function down()
    {
        $this->forge->dropTable('users');
    }
}
