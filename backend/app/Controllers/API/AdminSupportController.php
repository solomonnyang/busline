<?php

namespace App\Controllers\API;

use App\Models\SupportTicketModel;
use App\Models\SupportTicketMessageModel;
use App\Models\UserModel;
use App\Models\RoleModel;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * AdminSupportController
 * Super admin support ticket management: list/filter every ticket,
 * view a thread, reply as staff, change status/priority and assign.
 */
class AdminSupportController extends BaseApiController
{
    /**
     * GET /api/admin/tickets
     * Query params: status, priority, category, needs_human, search.
     */
    public function index(): ResponseInterface
    {
        $filters = [];
        foreach (['status', 'priority', 'category', 'search'] as $key) {
            $value = $this->request->getGet($key);
            if ($value !== null) {
                $filters[$key] = trim($value);
            }
        }

        $needsHuman = $this->request->getGet('needs_human');
        if ($needsHuman !== null && $needsHuman !== '') {
            $filters['needs_human'] = (int) $needsHuman;
        }

        $tickets = model(SupportTicketModel::class)->adminIndex($filters);
        foreach ($tickets as &$ticket) {
            $ticket['needs_human'] = (int) ($ticket['needs_human'] ?? 0) === 1;
        }
        unset($ticket);

        return api_success($tickets);
    }

    /**
     * GET /api/admin/tickets/{id}
     * Full ticket with message thread.
     */
    public function show(int $id): ResponseInterface
    {
        $ticket = model(SupportTicketModel::class)->adminDetail($id);
        if (! $ticket) {
            return api_error('Ticket not found.', 404);
        }

        $ticket['messages'] = model(SupportTicketMessageModel::class)->forTicket($id);
        $ticket['message_count'] = count($ticket['messages']);
        $ticket['needs_human'] = (int) ($ticket['needs_human'] ?? 0) === 1;

        return api_success($ticket);
    }

    /**
     * POST /api/admin/tickets/{id}/reply
     * Reply to a ticket as staff. Body: { message, reply_to? }
     */
    public function reply(int $id): ResponseInterface
    {
        $data = $this->validateOrFail([
            'message'  => 'required|min_length[1]|max_length[5000]',
            'reply_to' => 'permit_empty|is_natural_no_zero',
        ]);

        $ticket = model(SupportTicketModel::class)->find($id);
        if (! $ticket) {
            return api_error('Ticket not found.', 404);
        }

        $replyTo = $this->resolveReplyTo($ticket, $data['reply_to'] ?? null);
        if ($replyTo === false) {
            return api_error('The message being replied to is invalid.', 422);
        }

        $admin = $this->currentUser();

        model(SupportTicketMessageModel::class)->insert([
            'ticket_id'   => $id,
            'sender_id'   => (int) $admin['id'],
            'body'        => trim($data['message']),
            'is_admin'    => 1,
            'reply_to_id' => $replyTo,
        ]);

        $ticket = model(SupportTicketModel::class)->adminDetail($id);
        $ticket['messages'] = model(SupportTicketMessageModel::class)->forTicket($id);
        $ticket['message_count'] = count($ticket['messages']);
        $ticket['needs_human'] = (int) ($ticket['needs_human'] ?? 0) === 1;

        return api_success($ticket, 'Reply sent.');
    }

    /**
     * POST /api/admin/tickets/{ticketId}/messages/{messageId}/react
     * Toggle an emoji reaction on a message as staff. Body: { emoji }
     */
    public function react(int $ticketId, int $messageId): ResponseInterface
    {
        $data = $this->validateOrFail([
            'emoji' => 'required|max_length[16]',
        ]);

        $ticket = model(SupportTicketModel::class)->find($ticketId);
        if (! $ticket) {
            return api_error('Ticket not found.', 404);
        }

        $message = model(SupportTicketMessageModel::class)
            ->where('id', $messageId)
            ->where('ticket_id', $ticketId)
            ->first();

        if (! $message) {
            return api_error('Message not found.', 404);
        }

        $admin = $this->currentUser();
        model(SupportTicketMessageModel::class)->setReaction((int) $messageId, $data['emoji'], $admin);

        $ticket = model(SupportTicketModel::class)->adminDetail($ticketId);
        $ticket['messages'] = model(SupportTicketMessageModel::class)->forTicket($ticketId);
        $ticket['message_count'] = count($ticket['messages']);
        $ticket['needs_human'] = (int) ($ticket['needs_human'] ?? 0) === 1;

        return api_success($ticket, 'Reaction updated.');
    }

    /**
     * Validate a reply_to message id and return it (or null/false).
     *
     * @param array<string, mixed> $ticket
     */
    private function resolveReplyTo(array $ticket, $replyTo)
    {
        if ($replyTo === null || $replyTo === '') {
            return null;
        }

        $quoted = model(SupportTicketMessageModel::class)->find((int) $replyTo);
        if (! $quoted || (int) $quoted['ticket_id'] !== (int) $ticket['id']) {
            return false;
        }

        return (int) $replyTo;
    }

    /**
     * PUT /api/admin/tickets/{id}
     * Body: { status?, priority?, assigned_to?, needs_human? }
     */
    public function update(int $id): ResponseInterface
    {
        $data = $this->validateOrFail([
            'status'      => 'permit_empty|in_list[open,in_progress,resolved,closed]',
            'priority'    => 'permit_empty|in_list[low,medium,high]',
            'assigned_to' => 'permit_empty|is_natural_no_zero',
            'needs_human' => 'permit_empty|in_list[0,1]',
        ]);

        $ticket = model(SupportTicketModel::class)->find($id);
        if (! $ticket) {
            return api_error('Ticket not found.', 404);
        }

        $updates = [];
        if (array_key_exists('status', $data) && $data['status'] !== '') {
            $updates['status'] = $data['status'];
        }
        if (array_key_exists('priority', $data) && $data['priority'] !== '') {
            $updates['priority'] = $data['priority'];
        }
        if (array_key_exists('assigned_to', $data)) {
            $assignee = $data['assigned_to'] !== '' && $data['assigned_to'] !== null
                ? (int) $data['assigned_to']
                : null;
            if ($assignee !== null) {
                $user = model(UserModel::class)->find($assignee);
                $role = $user ? model(RoleModel::class)->find((int) $user['role_id']) : null;
                if (! $user || ($role['slug'] ?? '') !== 'super_admin') {
                    return api_error('Assignee must be an active administrator.', 422);
                }
                $updates['assigned_to'] = $assignee;
            } else {
                $updates['assigned_to'] = null;
            }
        }

        if (array_key_exists('needs_human', $data) && $data['needs_human'] !== '') {
            $updates['needs_human'] = (int) $data['needs_human'];
        }

        if ($updates) {
            model(SupportTicketModel::class)->update($id, $updates);
        }

        $ticket = model(SupportTicketModel::class)->adminDetail($id);
        $ticket['messages'] = model(SupportTicketMessageModel::class)->forTicket($id);
        $ticket['message_count'] = count($ticket['messages']);
        $ticket['needs_human'] = (int) ($ticket['needs_human'] ?? 0) === 1;

        return api_success($ticket, 'Ticket updated.');
    }
}
