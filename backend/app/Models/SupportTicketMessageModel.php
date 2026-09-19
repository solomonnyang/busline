<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * SupportTicketMessageModel - manages the support_ticket_messages table.
 */
class SupportTicketMessageModel extends Model
{
    protected $table         = 'support_ticket_messages';
    protected $primaryKey    = 'id';
    protected $useAutoIncrement = true;
    protected $returnType    = 'array';
    protected $allowedFields = [
        'ticket_id', 'sender_id', 'body', 'is_admin', 'reply_to_id', 'reactions',
    ];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    /**
     * Full message thread for a ticket, oldest first, with sender names,
     * the body of the message being replied to (for quoting) and decoded
     * emoji reactions.
     */
    public function forTicket(int $ticketId)
    {
        $rows = $this->select(
            'support_ticket_messages.*,
             users.name as sender_name, users.role_id,
             parent.body as reply_to_body'
        )
            ->join('users', 'users.id = support_ticket_messages.sender_id', 'left')
            ->join('support_ticket_messages as parent', 'parent.id = support_ticket_messages.reply_to_id', 'left')
            ->where('support_ticket_messages.ticket_id', $ticketId)
            ->orderBy('support_ticket_messages.id', 'ASC')
            ->findAll();

        foreach ($rows as &$row) {
            $row['reactions'] = $this->decodeReactions($row['reactions'] ?? null);
        }
        unset($row);

        return $rows;
    }

    /**
     * Toggle/upsert the current user's reaction on a message.
     * One reaction per user: same emoji toggles off, a different emoji replaces it.
     *
     * @param array<string, mixed> $user
     */
    public function setReaction(int $messageId, string $emoji, array $user): array
    {
        $message = $this->find($messageId);
        if (! $message) {
            return [];
        }

        $reactions = $this->decodeReactions($message['reactions'] ?? null);
        $userId    = (int) $user['id'];
        $found     = false;

        foreach ($reactions as $index => $reaction) {
            if ((int) $reaction['user_id'] === $userId) {
                if ($reaction['emoji'] === $emoji) {
                    array_splice($reactions, $index, 1);
                } else {
                    $reactions[$index] = [
                        'emoji'       => $emoji,
                        'user_id'     => $userId,
                        'sender_name' => $user['name'] ?? 'User',
                        'created_at'  => date('Y-m-d H:i:s'),
                    ];
                }
                $found = true;
                break;
            }
        }

        if (! $found) {
            $reactions[] = [
                'emoji'       => $emoji,
                'user_id'     => $userId,
                'sender_name' => $user['name'] ?? 'User',
                'created_at'  => date('Y-m-d H:i:s'),
            ];
        }

        $this->update($messageId, ['reactions' => json_encode(array_values($reactions))]);

        return array_values($reactions);
    }

    /**
     * Decode a stored reactions JSON string into an array.
     */
    private function decodeReactions(?string $raw): array
    {
        if (empty($raw)) {
            return [];
        }
        $decoded = json_decode($raw, true);

        return is_array($decoded) ? $decoded : [];
    }
}
