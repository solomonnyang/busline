<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the drivers table.
 * Bus drivers and assistants owned by a vendor, assignable to trips.
 */
class CreateDriversTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'              => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'vendor_id'       => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'name'            => ['type' => 'VARCHAR', 'constraint' => 150, 'null' => false],
            'phone'           => ['type' => 'VARCHAR', 'constraint' => 30, 'null' => true],
            'email'           => ['type' => 'VARCHAR', 'constraint' => 190, 'null' => true],
            'license_number'  => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true],
            'license_expiry'  => ['type' => 'DATE', 'null' => true],
            'avatar'          => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'status'          => ['type' => "ENUM('active','inactive','suspended')", 'default' => 'active', 'null' => false],
            'created_at'      => ['type' => 'DATETIME', 'null' => true],
            'updated_at'      => ['type' => 'DATETIME', 'null' => true],
            'deleted_at'      => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('vendor_id');
        $this->forge->addKey('status');
        $this->forge->addForeignKey('vendor_id', 'vendors', 'id', 'CASCADE', 'RESTRICT', 'fk_drivers_vendor');
        $this->forge->createTable('drivers');
    }

    public function down()
    {
        $this->forge->dropTable('drivers');
    }
}
