<?php

namespace App\Controllers\API;

use App\Models\RoleModel;
use App\Models\SupportTicketModel;
use App\Models\SupportTicketMessageModel;
use App\Models\UserModel;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * SupportController
 * Customer-facing support tickets: open a ticket, list your tickets,
 * view the thread and reply. The AI assistant answers the ticket first;
 * tickets the assistant cannot answer are forwarded to a human agent.
 * Admins manage tickets via AdminSupportController.
 */
class SupportController extends BaseApiController
{
    /** Email of the bot account that sends AI replies in support threads. */
    private const ASSISTANT_EMAIL = 'assistant@busline.ng';

    /** Shown to the customer when the AI hands the ticket to a human. */
    private const ESCALATED_MESSAGE =
        'Thanks for reaching out. I\'ve forwarded your request to our support team, and a human agent will get back to you here shortly.';
    /**
     * GET /api/support/tickets
     * The authenticated user's tickets, newest first.
     */
    public function index(): ResponseInterface
    {
        $user = $this->currentUser();

        $tickets = model(SupportTicketModel::class)->byUser((int) $user['id']);
        foreach ($tickets as &$ticket) {
            $this->decorate($ticket);
        }
        unset($ticket);

        return api_success($tickets);
    }

    /**
     * POST /api/support/tickets
     * Open a new ticket. Body:
     * { subject, message, category?, priority? }
     */
    public function create(): ResponseInterface
    {
        $data = $this->validateOrFail([
            'subject'  => 'required|min_length[3]|max_length[150]',
            'message'  => 'required|min_length[5]|max_length[5000]',
            'category' => 'permit_empty|in_list[general,booking,payment,refund,technical,other]',
            'priority' => 'permit_empty|in_list[low,medium,high]',
        ]);

        $user = $this->currentUser();

        $number = $this->generateNumber();
        while (model(SupportTicketModel::class)->findByNumber($number)) {
            $number = $this->generateNumber();
        }

        $ticketId = model(SupportTicketModel::class)->insert([
            'ticket_number' => $number,
            'user_id'       => (int) $user['id'],
            'subject'       => trim($data['subject']),
            'category'      => $data['category'] ?? 'general',
            'priority'      => $data['priority'] ?? 'medium',
            'status'        => 'open',
        ]);

        model(SupportTicketMessageModel::class)->insert([
            'ticket_id' => (int) $ticketId,
            'sender_id' => (int) $user['id'],
            'body'      => trim($data['message']),
            'is_admin'  => 0,
        ]);

        $ticket = model(SupportTicketModel::class)->find((int) $ticketId);
        $this->autoRespond($ticket, $user);
        $ticket = model(SupportTicketModel::class)->find((int) $ticketId);
        $this->decorate($ticket);

        return api_success($ticket, 'Ticket created successfully.', 201);
    }

    /**
     * GET /api/support/tickets/{id}
     * A ticket's details and message thread (owner only).
     */
    public function show(int $id): ResponseInterface
    {
        $user = $this->currentUser();
        $ticket = model(SupportTicketModel::class)->find($id);

        if (! $ticket || (int) $ticket['user_id'] !== (int) $user['id']) {
            return api_error('Ticket not found.', 404);
        }

        $this->decorate($ticket);
        $ticket['messages'] = model(SupportTicketMessageModel::class)->forTicket((int) $ticket['id']);

        return api_success($ticket);
    }

    /**
     * POST /api/support/tickets/{id}/reply
     * Add a message to an open ticket (owner only). Body: { message, reply_to? }
     */
    public function reply(int $id): ResponseInterface
    {
        $data = $this->validateOrFail([
            'message'  => 'required|min_length[1]|max_length[5000]',
            'reply_to' => 'permit_empty|is_natural_no_zero',
        ]);

        $user = $this->currentUser();
        $ticket = model(SupportTicketModel::class)->find($id);

        if (! $ticket || (int) $ticket['user_id'] !== (int) $user['id']) {
            return api_error('Ticket not found.', 404);
        }
        if ($ticket['status'] === 'closed') {
            return api_error('This ticket is closed and cannot be replied to.', 422);
        }

        $replyTo = $this->resolveReplyTo($ticket, $data['reply_to'] ?? null);
        if ($replyTo === false) {
            return api_error('The message being replied to is invalid.', 422);
        }

        model(SupportTicketMessageModel::class)->insert([
            'ticket_id'   => (int) $ticket['id'],
            'sender_id'   => (int) $user['id'],
            'body'        => trim($data['message']),
            'is_admin'    => 0,
            'reply_to_id' => $replyTo,
        ]);

        // Reopening a resolved ticket brings it back to in progress.
        if ($ticket['status'] === 'resolved') {
            model(SupportTicketModel::class)->update((int) $ticket['id'], ['status' => 'in_progress']);
            $ticket['status'] = 'in_progress';
        }

        $this->autoRespond($ticket, $user);

        $ticket = model(SupportTicketModel::class)->find((int) $ticket['id']);
        $ticket['messages'] = model(SupportTicketMessageModel::class)->forTicket((int) $ticket['id']);
        $this->decorate($ticket);

        return api_success($ticket, 'Reply sent.');
    }

    /**
     * POST /api/support/tickets/{ticketId}/messages/{messageId}/react
     * Toggle an emoji reaction on a message in one of your tickets.
     * Body: { emoji }
     */
    public function react(int $ticketId, int $messageId): ResponseInterface
    {
        $data = $this->validateOrFail([
            'emoji' => 'required|max_length[16]',
        ]);

        $user = $this->currentUser();
        $ticket = model(SupportTicketModel::class)->find($ticketId);

        if (! $ticket || (int) $ticket['user_id'] !== (int) $user['id']) {
            return api_error('Ticket not found.', 404);
        }

        $message = model(SupportTicketMessageModel::class)
            ->where('id', $messageId)
            ->where('ticket_id', $ticketId)
            ->first();

        if (! $message) {
            return api_error('Message not found.', 404);
        }

        model(SupportTicketMessageModel::class)->setReaction((int) $messageId, $data['emoji'], $user);

        $ticket['messages'] = model(SupportTicketMessageModel::class)->forTicket($ticketId);
        $this->decorate($ticket);

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
     * Normalize enums and counts for JSON display.
     */
    private function decorate(array &$ticket): void
    {
        $ticket['message_count'] = (int) model(SupportTicketMessageModel::class)
            ->where('ticket_id', (int) $ticket['id'])->countAllResults();
        $ticket['needs_human'] = (int) ($ticket['needs_human'] ?? 0) === 1;
    }

    /**
     * Let the AI assistant answer the ticket when it can. When the assistant
     * escalates (or fails), the ticket is marked needs_human so a support
     * agent takes over and the assistant stops auto-responding.
     *
     * @param array<string, mixed> $ticket
     * @param array<string, mixed> $user
     */
    private function autoRespond(array $ticket, array $user): void
    {
        if ((int) ($ticket['needs_human'] ?? 0) === 1) {
            return;
        }

        $result = (new SupportAgentController())->handleTicket($ticket, $user);
        $reply = trim((string) ($result['reply'] ?? ''));
        $escalated = (bool) ($result['escalated'] ?? false);

        if ($escalated) {
            model(SupportTicketModel::class)->update((int) $ticket['id'], [
                'needs_human' => 1,
                'status'      => 'in_progress',
            ]);
            if ($reply === '') {
                $reply = self::ESCALATED_MESSAGE;
            }
        } elseif ($reply === '') {
            return;
        }

        $assistant = $this->assistantUser();
        if (! $assistant) {
            return;
        }

        model(SupportTicketMessageModel::class)->insert([
            'ticket_id' => (int) $ticket['id'],
            'sender_id' => (int) ($assistant['id'] ?? 0),
            'body'      => $reply,
            'is_admin'  => 1,
        ]);
    }

    /**
     * The dedicated AI assistant account used as the sender of AI replies.
     * Created on demand so the thread always resolves to a real user.
     *
     * @return array<string, mixed>|null
     */
    private function assistantUser(): ?array
    {
        $model = model(UserModel::class);
        $existing = $model->where('email', self::ASSISTANT_EMAIL)->first();
        if ($existing) {
            return $existing;
        }

        $role = model(RoleModel::class)->where('slug', 'customer')->first();

        try {
            $id = $model->insert([
                'name'              => 'BusLine Assistant',
                'email'             => self::ASSISTANT_EMAIL,
                'password'          => bin2hex(random_bytes(24)),
                'role_id'           => (int) ($role['id'] ?? 1),
                'is_active'         => 1,
                'email_verified_at' => date('Y-m-d H:i:s'),
            ]);
        } catch (\Throwable $e) {
            log_message('error', 'Support: could not create assistant user: ' . $e->getMessage());
            return null;
        }

        return $model->find((int) $id);
    }

    /**
     * Ticket number, e.g. SUP2608074F2A1B (matches booking number style).
     */
    private function generateNumber(): string
    {
        return 'SUP' . date('ymd') . strtoupper(bin2hex(random_bytes(3)));
    }
}
