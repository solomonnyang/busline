<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Adds discount columns to bookings so automatically applied offers
 * (e.g. early bird) are recorded on the booking and shown on the ticket.
 */
class AddDiscountToBookingsTable extends Migration
{
    public function up()
    {
        $this->forge->addColumn('bookings', [
            'discount_type'   => ['type' => 'VARCHAR', 'constraint' => 30, 'null' => true],
            'discount_amount' => ['type' => 'DECIMAL', 'constraint' => '12,2', 'default' => 0, 'null' => false],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('bookings', ['discount_type', 'discount_amount']);
    }
}
