<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * SupportTicketModel - manages the support_tickets table.
 */
class SupportTicketModel extends Model
{
    protected $table         = 'support_tickets';
    protected $primaryKey    = 'id';
    protected $useAutoIncrement = true;
    protected $returnType    = 'array';
    protected $allowedFields = [
        'ticket_number', 'user_id', 'subject', 'category',
        'priority', 'status', 'assigned_to', 'needs_human',
    ];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    public function findByNumber(string $number)
    {
        return $this->where('ticket_number', $number)->first();
    }

    /**
     * Tickets opened by one user, newest first.
     */
    public function byUser(int $userId)
    {
        return $this->where('user_id', $userId)->orderBy('id', 'DESC')->findAll();
    }

    /**
     * Admin list: tickets enriched with the opener's name/email and the
     * number of messages in each thread.
     *
     * @param array<string, mixed> $filters  status/priority/category/needs_human/search
     */
    public function adminIndex(array $filters = []): array
    {
        $builder = $this->select(
            'support_tickets.*, users.name as customer_name, users.email as customer_email,
             assignee.name as assignee_name,
             (SELECT COUNT(*) FROM support_ticket_messages m WHERE m.ticket_id = support_tickets.id) as message_count'
        )
            ->join('users', 'users.id = support_tickets.user_id', 'left')
            ->join('users as assignee', 'assignee.id = support_tickets.assigned_to', 'left')
            ->orderBy('support_tickets.id', 'DESC');

        foreach (['status', 'priority', 'category'] as $field) {
            if (! empty($filters[$field])) {
                $builder->where('support_tickets.' . $field, $filters[$field]);
            }
        }
        if (array_key_exists('needs_human', $filters) && $filters['needs_human'] !== '') {
            $builder->where('support_tickets.needs_human', (int) $filters['needs_human']);
        }
        if (! empty($filters['search'])) {
            $q = '%' . $filters['search'] . '%';
            $builder->groupStart()
                ->like('support_tickets.ticket_number', $q)
                ->orLike('support_tickets.subject', $q)
                ->orLike('users.name', $q)
                ->orLike('users.email', $q)
                ->groupEnd();
        }

        $rows = $builder->findAll();
        foreach ($rows as &$row) {
            $row['message_count'] = (int) $row['message_count'];
        }
        unset($row);

        return $rows;
    }

    /**
     * Single ticket with opener and assignee info.
     */
    public function adminDetail(int $id): ?array
    {
        return $this->select(
            'support_tickets.*, users.name as customer_name, users.email as customer_email,
             assignee.name as assignee_name'
        )
            ->join('users', 'users.id = support_tickets.user_id', 'left')
            ->join('users as assignee', 'assignee.id = support_tickets.assigned_to', 'left')
            ->where('support_tickets.id', $id)
            ->first();
    }
}
