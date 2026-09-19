<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Adds the 'wallet' option to the payment_method enums on the payments and
 * wallet_transactions tables so bookings can be paid from the wallet balance.
 */
class AddWalletToPaymentMethods extends Migration
{
    public function up()
    {
        $this->db->query("ALTER TABLE `payments` MODIFY `payment_method` ENUM('cash','paystack','card','transfer','wallet') NOT NULL DEFAULT 'cash'");
        $this->db->query("ALTER TABLE `wallet_transactions` MODIFY `payment_method` ENUM('paystack','cash','card','transfer','wallet') NOT NULL DEFAULT 'paystack'");
    }

    public function down()
    {
        $this->db->query("ALTER TABLE `payments` MODIFY `payment_method` ENUM('cash','paystack','card','transfer') NOT NULL DEFAULT 'cash'");
        $this->db->query("ALTER TABLE `wallet_transactions` MODIFY `payment_method` ENUM('paystack','cash','card','transfer') NOT NULL DEFAULT 'paystack'");
    }
}
