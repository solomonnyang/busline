<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Extends the wallet_transactions payment_method ENUM with the values used
 * by wallet bookings ('wallet') and admin manual adjustments ('admin').
 */
class AddPaymentMethodsToWalletTransactionsTable extends Migration
{
    public function up()
    {
        $this->forge->modifyColumn('wallet_transactions', [
            'payment_method' => [
                'type'       => 'ENUM',
                'constraint' => ['paystack', 'cash', 'card', 'transfer', 'wallet', 'admin'],
                'default'    => 'paystack',
                'null'       => false,
            ],
        ]);
    }

    public function down()
    {
        $this->forge->modifyColumn('wallet_transactions', [
            'payment_method' => [
                'type'       => 'ENUM',
                'constraint' => ['paystack', 'cash', 'card', 'transfer'],
                'default'    => 'paystack',
                'null'       => false,
            ],
        ]);
    }
}
