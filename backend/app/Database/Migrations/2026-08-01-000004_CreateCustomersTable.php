<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the customers table.
 * Holds customer profile information.
 */
class CreateCustomersTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'            => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'user_id'       => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'address'       => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'city'          => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'country'       => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'date_of_birth' => ['type' => 'DATE', 'null' => true],
            'gender'        => ['type' => "ENUM('male','female','other')", 'null' => true],
            'created_at'    => ['type' => 'DATETIME', 'null' => true],
            'updated_at'    => ['type' => 'DATETIME', 'null' => true],
            'deleted_at'    => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('user_id');
        $this->forge->addForeignKey('user_id', 'users', 'id', 'CASCADE', 'RESTRICT', 'fk_customers_user');
        $this->forge->createTable('customers');
    }

    public function down()
    {
        $this->forge->dropTable('customers');
    }
}
