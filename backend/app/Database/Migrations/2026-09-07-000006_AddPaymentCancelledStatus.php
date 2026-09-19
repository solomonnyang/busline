<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Adds 'cancelled' to the payments.status enum so cancelled mover/bus
 * booking payments are recorded explicitly rather than being coerced to ''.
 */
class AddPaymentCancelledStatus extends Migration
{
    public function up()
    {
        $this->forge->modifyColumn('payments', [
            'status' => [
                'type'    => "ENUM('pending','success','failed','cancelled')",
                'default' => 'pending',
                'null'    => false,
            ],
        ]);
    }

    public function down()
    {
        $this->forge->modifyColumn('payments', [
            'status' => [
                'type'    => "ENUM('pending','success','failed')",
                'default' => 'pending',
                'null'    => false,
            ],
        ]);
    }
}