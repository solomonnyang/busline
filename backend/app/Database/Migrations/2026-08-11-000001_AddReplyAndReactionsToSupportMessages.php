<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Extends support_ticket_messages with quoting (reply_to_id) and emoji
 * reactions (reactions as a JSON-encoded array of { emoji, user_id, ... }).
 */
class AddReplyAndReactionsToSupportMessages extends Migration
{
    public function up()
    {
        $this->forge->addColumn('support_ticket_messages', [
            'reply_to_id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true, 'after' => 'body'],
            'reactions'   => ['type' => 'TEXT', 'null' => true, 'after' => 'is_admin'],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('support_ticket_messages', ['reply_to_id', 'reactions']);
    }
}
