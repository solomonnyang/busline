<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Marks every existing account as email-verified so only accounts created
 * after this change go through the email verification flow.
 */
class BackfillEmailVerificationUsers extends Migration
{
    public function up()
    {
        $this->db->query(
            'UPDATE users SET email_verified_at = COALESCE(email_verified_at, created_at) WHERE email_verified_at IS NULL'
        );
    }

    public function down()
    {
        $this->db->query('UPDATE users SET email_verified_at = NULL');
    }
}
