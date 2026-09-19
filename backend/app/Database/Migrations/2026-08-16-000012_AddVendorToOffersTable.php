<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Adds vendor scope to the offers table.
 * vendor_id NULL means a global (admin-managed) offer; a set vendor_id lets a
 * vendor publish their own promotions in the dashboard.
 */
class AddVendorToOffersTable extends Migration
{
    public function up()
    {
        $this->forge->addColumn('offers', [
            'vendor_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
                'null'       => true,
                'after'      => 'id',
            ],
            'is_featured' => [
                'type'       => 'TINYINT',
                'constraint' => 1,
                'default'    => 0,
                'null'       => false,
                'after'      => 'is_active',
            ],
        ]);

        $this->forge->addForeignKey('vendor_id', 'vendors', 'id', 'SET NULL', 'RESTRICT', 'fk_offers_vendor', 'offers');
        $this->db->query('CREATE INDEX idx_offers_vendor ON offers (vendor_id)');
    }

    public function down()
    {
        $this->forge->dropForeignKey('offers', 'fk_offers_vendor');
        $this->db->query('DROP INDEX idx_offers_vendor ON offers');
        $this->forge->dropColumn('offers', ['vendor_id', 'is_featured']);
    }
}
