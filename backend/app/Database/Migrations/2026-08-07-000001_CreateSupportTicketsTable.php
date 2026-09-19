<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Creates the support tickets tables.
 * Customers open tickets with a message thread; admins reply, assign
 * and move tickets through open -> in_progress -> resolved/closed.
 */
class CreateSupportTicketsTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'            => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'ticket_number' => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => false],
            'user_id'       => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'subject'       => ['type' => 'VARCHAR', 'constraint' => 150, 'null' => false],
            'category'      => ['type' => "ENUM('general','booking','payment','refund','technical','other')", 'default' => 'general', 'null' => false],
            'priority'      => ['type' => "ENUM('low','medium','high')", 'default' => 'medium', 'null' => false],
            'status'        => ['type' => "ENUM('open','in_progress','resolved','closed')", 'default' => 'open', 'null' => false],
            'assigned_to'   => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'created_at'    => ['type' => 'DATETIME', 'null' => true],
            'updated_at'    => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('ticket_number');
        $this->forge->addKey('user_id');
        $this->forge->addKey('status');
        $this->forge->addForeignKey('user_id', 'users', 'id', 'CASCADE', 'RESTRICT', 'fk_support_tickets_user');
        $this->forge->addForeignKey('assigned_to', 'users', 'id', 'SET NULL', 'RESTRICT', 'fk_support_tickets_assignee');
        $this->forge->createTable('support_tickets');

        $this->forge->addField([
            'id'         => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'ticket_id'  => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'sender_id'  => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => false],
            'body'       => ['type' => 'TEXT', 'null' => false],
            'is_admin'   => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 0, 'null' => false],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('ticket_id');
        $this->forge->addForeignKey('ticket_id', 'support_tickets', 'id', 'CASCADE', 'RESTRICT', 'fk_support_messages_ticket');
        $this->forge->addForeignKey('sender_id', 'users', 'id', 'CASCADE', 'RESTRICT', 'fk_support_messages_sender');
        $this->forge->createTable('support_ticket_messages');
    }

    public function down()
    {
        $this->forge->dropTable('support_ticket_messages');
        $this->forge->dropTable('support_tickets');
    }
}
