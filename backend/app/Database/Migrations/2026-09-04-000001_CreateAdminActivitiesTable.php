<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the admin_activities table.
 * Realtime feed of website activity surfaced in the admin notification bell
 * (new registrations, bookings, payments, cancellations).
 */
class CreateAdminActivitiesTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'         => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'type'       => ['type' => 'VARCHAR', 'constraint' => 30, 'null' => false],
            'title'      => ['type' => 'VARCHAR', 'constraint' => 200, 'null' => false],
            'message'    => ['type' => 'VARCHAR', 'constraint' => 500, 'null' => true],
            'data'       => ['type' => 'JSON', 'null' => true],
            'is_read'    => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 0, 'null' => false],
            'read_at'    => ['type' => 'DATETIME', 'null' => true],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('type');
        $this->forge->addKey('is_read');
        $this->forge->createTable('admin_activities');
    }

    public function down()
    {
        $this->forge->dropTable('admin_activities');
    }
}
