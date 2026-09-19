<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Adds business verification fields to the vendors table for the profile view.
 * NOTE: the `type` column already exists in the database (added outside of
 * migrations) and is intentionally not re-created here.
 */
class AddBusinessFieldsToVendorsTable extends Migration
{
    public function up()
    {
        $this->forge->addColumn('vendors', [
            'website'          => ['type' => 'VARCHAR', 'constraint' => 190, 'null' => true, 'after' => 'description'],
            'established_year' => ['type' => 'SMALLINT', 'unsigned' => true, 'null' => true, 'after' => 'website'],
            'license_number'   => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true, 'after' => 'established_year'],
            'tin'              => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true, 'after' => 'license_number'],
            'business_verified'=> ['type' => 'TINYINT', 'constraint' => 1, 'default' => 0, 'null' => false, 'after' => 'tin'],
            'default_currency' => ['type' => 'VARCHAR', 'constraint' => 10, 'default' => 'NGN', 'null' => false, 'after' => 'business_verified'],
            'timezone'         => ['type' => 'VARCHAR', 'constraint' => 60, 'default' => 'Africa/Lagos', 'null' => false, 'after' => 'default_currency'],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('vendors', ['website', 'established_year', 'license_number', 'tin', 'business_verified', 'default_currency', 'timezone']);
    }
}
