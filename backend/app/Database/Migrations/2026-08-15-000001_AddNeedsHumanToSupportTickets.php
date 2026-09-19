<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Marks a support ticket as waiting on a human agent after the AI support
 * assistant escalates a request it cannot answer. While the flag is set, the
 * AI stops auto-responding to the thread.
 */
class AddNeedsHumanToSupportTickets extends Migration
{
    public function up()
    {
        $this->forge->addColumn('support_tickets', [
            'needs_human' => [
                'type'       => 'TINYINT',
                'constraint' => 1,
                'default'    => 0,
                'null'       => false,
                'after'      => 'assigned_to',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('support_tickets', ['needs_human']);
    }
}
