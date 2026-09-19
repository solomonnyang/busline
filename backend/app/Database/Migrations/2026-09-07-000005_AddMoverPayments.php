<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Extends the payments table so the same payment stack (Paystack / wallet /
 * cash, PaymentService) also records mover bookings.
 *
 * - booking_id     becomes nullable (either a bus booking OR a mover booking)
 * - booking_type   discriminator: 'bus' | 'mover'
 * - mover_booking_id links to mover_bookings when booking_type = 'mover'
 */
class AddMoverPayments extends Migration
{
    public function up()
    {
        $this->db->query('ALTER TABLE `payments` MODIFY `booking_id` INT(11) UNSIGNED NULL');

        $this->forge->addColumn('payments', [
            'mover_booking_id' => [
                'type'    => 'INT',
                'constraint' => 11,
                'unsigned' => true,
                'null'    => true,
            ],
            'booking_type' => [
                'type'    => "ENUM('bus','mover')",
                'default' => 'bus',
                'null'    => false,
            ],
        ]);

        $this->forge->addKey('mover_booking_id', false, 'payments_mover_booking');
        $this->forge->addKey('booking_type', false, 'payments_booking_type');
        $this->forge->addForeignKey('mover_booking_id', 'mover_bookings', 'id', 'CASCADE', 'RESTRICT', 'fk_payments_mover_booking');
    }

    public function down()
    {
        $this->forge->dropForeignKey('payments', 'fk_payments_mover_booking');
        $this->forge->dropColumn('payments', ['mover_booking_id', 'booking_type']);

        $this->db->query('ALTER TABLE `payments` MODIFY `booking_id` INT(11) UNSIGNED NOT NULL');
    }
}