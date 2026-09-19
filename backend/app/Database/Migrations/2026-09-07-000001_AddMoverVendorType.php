<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Adds the `mover` value to the vendors.type enum so a vendor can register
 * as a moving agency instead of (or alongside) a bus booking vendor.
 */
class AddMoverVendorType extends Migration
{
    public function up()
    {
        $this->forge->modifyColumn('vendors', [
            'type' => [
                'type'    => "ENUM('bus_booking','places','mover')",
                'null'    => false,
                'default' => 'bus_booking',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->modifyColumn('vendors', [
            'type' => [
                'type'    => "ENUM('bus_booking','places')",
                'null'    => false,
                'default' => 'bus_booking',
            ],
        ]);
    }
}