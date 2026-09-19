<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the referrals table.
 * Records each referral link signup. A referral starts as 'registered' and
 * becomes 'qualified' once the referred customer's first booking is paid,
 * at which point the referrer's wallet is credited a commission.
 */
class CreateReferralsTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'                    => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'referrer_customer_id'  => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'referred_user_id'      => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'referred_customer_id'  => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'code'                  => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => false],
            'status'                => ['type' => "ENUM('registered','qualified')", 'default' => 'registered', 'null' => false],
            'commission_amount'     => ['type' => 'DECIMAL', 'constraint' => '12,2', 'default' => 0, 'null' => false],
            'booking_id'            => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'created_at'            => ['type' => 'DATETIME', 'null' => true],
            'updated_at'            => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('referred_customer_id');
        $this->forge->addKey('referrer_customer_id');
        $this->forge->addKey('status');
        $this->forge->addKey('booking_id');
        $this->forge->addForeignKey('referrer_customer_id', 'customers', 'id', 'CASCADE', 'RESTRICT', 'fk_referrals_referrer');
        $this->forge->addForeignKey('referred_customer_id', 'customers', 'id', 'CASCADE', 'RESTRICT', 'fk_referrals_referred');
        $this->forge->createTable('referrals');
    }

    public function down()
    {
        $this->forge->dropTable('referrals');
    }
}
