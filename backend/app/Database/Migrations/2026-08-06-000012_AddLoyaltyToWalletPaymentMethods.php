<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Extends the wallet_transactions payment_method enum with 'admin',
 * 'loyalty' and 'referral' so program credits (points redemption and
 * referral commission) are recorded correctly.
 */
class AddLoyaltyToWalletPaymentMethods extends Migration
{
    public function up()
    {
        $this->db->query("ALTER TABLE `wallet_transactions` MODIFY `payment_method` ENUM('paystack','cash','card','transfer','wallet','admin','loyalty','referral') NOT NULL DEFAULT 'paystack'");
    }

    public function down()
    {
        $this->db->query("ALTER TABLE `wallet_transactions` MODIFY `payment_method` ENUM('paystack','cash','card','transfer','wallet') NOT NULL DEFAULT 'paystack'");
    }
}
