<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Removes the movers feature entirely (feature was removed from the app).
 *
 * Reverses the earlier mover migrations:
 *   - deletes mover bookings, services and profiles and their payment rows
 *   - drops the mover-specific columns from payments and restores booking_id
 *     to NOT NULL
 *   - reverts payments.status and vendors.type to their pre-mover enums
 *   - converts any existing 'mover' vendors to the default 'bus_booking' type
 */
class RemoveMoverFeature extends Migration
{
    public function up()
    {
        $this->db->query('SET FOREIGN_KEY_CHECKS = 0');

        // Mover booking payments: always have booking_type='mover' and NULL
        // booking_id. Remove them before touching the payments schema.
        $this->db->query("DELETE FROM payments WHERE booking_type = 'mover'");

        // Revert payments: drop mover FK/columns + index, restore booking_id to NOT NULL.
        $fkCheck = $this->db->query(
            "SELECT COUNT(*) AS cnt FROM information_schema.TABLE_CONSTRAINTS
             WHERE CONSTRAINT_SCHEMA = DATABASE()
               AND TABLE_NAME = 'payments'
               AND CONSTRAINT_NAME = 'fk_payments_mover_booking'"
        )->getRowArray();
        if ((int) ($fkCheck['cnt'] ?? 0) > 0) {
            $this->forge->dropForeignKey('payments', 'fk_payments_mover_booking');
        }
        $this->forge->dropColumn('payments', ['mover_booking_id', 'booking_type']);
        $this->db->query('ALTER TABLE `payments` MODIFY `booking_id` INT(11) UNSIGNED NOT NULL');

        $this->forge->modifyColumn('payments', [
            'status' => [
                'type'    => "ENUM('pending','success','failed')",
                'default' => 'pending',
                'null'    => false,
            ],
        ]);

        // Drop the mover tables (dependency order).
        $this->forge->dropTable('mover_bookings', true);
        $this->forge->dropTable('mover_services', true);
        $this->forge->dropTable('mover_profiles', true);

        // Revert vendors.type enum, converting any 'mover' vendors first.
        $this->db->query("UPDATE vendors SET `type` = 'bus_booking' WHERE `type` = 'mover'");
        $this->forge->modifyColumn('vendors', [
            'type' => [
                'type'    => "ENUM('bus_booking','places')",
                'null'    => false,
                'default' => 'bus_booking',
            ],
        ]);

        $this->db->query('SET FOREIGN_KEY_CHECKS = 1');
    }

    public function down()
    {
        // Feature removal is intentional and permanent. Re-adding it would
        // require restoring the mover migrations in order.
    }
}