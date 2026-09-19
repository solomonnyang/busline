<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the offers table.
 * Admin-managed promotional offers (e.g. loyalty program, early bird,
 * refer a friend) surfaced to customers in the mobile/home promo slider,
 * replacing the hardcoded promo list.
 */
class CreateOffersTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'             => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'code'           => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => false],
            'title'          => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => false],
            'description'    => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'badge'          => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'discount_type'  => ['type' => 'ENUM', 'constraint' => ['percent', 'fixed'], 'default' => 'percent', 'null' => false],
            'discount_value' => ['type' => 'DECIMAL', 'constraint' => '10,2', 'default' => 0.00, 'null' => false],
            'icon'           => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true],
            'color'          => ['type' => 'VARCHAR', 'constraint' => 20, 'null' => true],
            'soft'           => ['type' => 'VARCHAR', 'constraint' => 20, 'null' => true],
            'image'          => ['type' => 'VARCHAR', 'constraint' => 500, 'null' => true],
            'is_active'      => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 1, 'null' => false],
            'created_at'     => ['type' => 'DATETIME', 'null' => true],
            'updated_at'     => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('code');
        $this->forge->addKey('is_active');
        $this->forge->createTable('offers');
    }

    public function down()
    {
        $this->forge->dropTable('offers');
    }
}
