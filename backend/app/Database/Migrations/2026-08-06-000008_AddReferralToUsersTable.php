<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Adds referral fields to users:
 *  - referral_code: unique code each customer can share.
 *  - referred_by: the referrer user id when an account signs up via a link.
 */
class AddReferralToUsersTable extends Migration
{
    public function up()
    {
        $this->forge->addColumn('users', [
            'referral_code' => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true],
            'referred_by'   => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
        ]);
        $this->forge->addUniqueKey('users', 'referral_code', 'uc_users_referral_code');
        $this->forge->addKey('users', 'referred_by', false, 'idx_users_referred_by');
    }

    public function down()
    {
        $this->forge->dropKey('users', 'uc_users_referral_code', false, true);
        $this->forge->dropKey('users', 'idx_users_referred_by', false, true);
        $this->forge->dropColumn('users', ['referral_code', 'referred_by']);
    }
}
