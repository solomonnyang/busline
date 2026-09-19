<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the vendors table.
 * Holds bus company / vendor profile information.
 */
class CreateVendorsTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'              => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'user_id'         => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'company_name'    => ['type' => 'VARCHAR', 'constraint' => 150, 'null' => false],
            'company_email'   => ['type' => 'VARCHAR', 'constraint' => 190, 'null' => true],
            'company_phone'   => ['type' => 'VARCHAR', 'constraint' => 30, 'null' => true],
            'address'         => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'city'            => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'country'         => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'logo'            => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'description'     => ['type' => 'TEXT', 'null' => true],
            'approval_status' => ['type' => "ENUM('pending','approved','suspended')", 'default' => 'pending', 'null' => false],
            'approved_by'     => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'approved_at'     => ['type' => 'DATETIME', 'null' => true],
            'created_at'      => ['type' => 'DATETIME', 'null' => true],
            'updated_at'      => ['type' => 'DATETIME', 'null' => true],
            'deleted_at'      => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('user_id');
        $this->forge->addKey('approval_status');
        $this->forge->addForeignKey('user_id', 'users', 'id', 'CASCADE', 'RESTRICT', 'fk_vendors_user');
        $this->forge->addForeignKey('approved_by', 'users', 'id', 'SET_NULL', 'RESTRICT', 'fk_vendors_approved_by');
        $this->forge->createTable('vendors');
    }

    public function down()
    {
        $this->forge->dropTable('vendors');
    }
}
