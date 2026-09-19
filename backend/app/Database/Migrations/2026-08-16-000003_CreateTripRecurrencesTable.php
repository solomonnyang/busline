<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the trip_recurrences table.
 * Defines how a scheduled trip repeats (daily / weekly / custom days)
 * so the dashboard can surface repeat trips and generate future schedules.
 */
class CreateTripRecurrencesTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'           => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'trip_id'      => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'frequency'    => ['type' => "ENUM('daily','weekly','custom')", 'default' => 'weekly', 'null' => false],
            'days_of_week' => ['type' => 'JSON', 'null' => true, 'comment' => '[1..7] for custom/weekly repeats'],
            'repeat_until' => ['type' => 'DATE', 'null' => true],
            'created_at'   => ['type' => 'DATETIME', 'null' => true],
            'updated_at'   => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('trip_id');
        $this->forge->addForeignKey('trip_id', 'trips', 'id', 'CASCADE', 'CASCADE', 'fk_trip_recurrences_trip');
        $this->forge->createTable('trip_recurrences');
    }

    public function down()
    {
        $this->forge->dropTable('trip_recurrences');
    }
}
