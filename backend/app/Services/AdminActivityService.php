<?php

namespace App\Services;

use App\Models\AdminActivityModel;

/**
 * AdminActivityService
 * Records website activity into the admin_activities feed (shown in the admin
 * notification bell in realtime). Includes new registrations, bookings,
 * payments and cancellations.
 */
class AdminActivityService
{
    protected AdminActivityModel $activities;

    public function __construct()
    {
        $this->activities = model(AdminActivityModel::class);
    }

    /**
     * Persist a new activity entry.
     *
     * @param string      $type    registration|booking|payment|cancellation
     * @param string      $title   short bold headline
     * @param string|null $message descriptive line
     * @param array|null  $data    extra payload (ids, names, amounts, etc.)
     */
    public function record(string $type, string $title, ?string $message = null, ?array $data = null): void
    {
        try {
            $entry = [
                'type'    => $type,
                'title'   => $title,
                'message' => $message,
                'data'    => $data ? json_encode($data) : null,
                'is_read' => 0,
            ];
            $this->activities->insert($entry);
        } catch (\Throwable $e) {
            // Activity recording must never block the primary transaction
            // (booking, payment, registration). Failures are silently skipped.
        }
    }

    public function recent(int $limit = 25): array
    {
        return $this->activities->recent($limit);
    }

    public function unreadCount(): int
    {
        return $this->activities->unreadCount();
    }

    public function markAllRead(): int
    {
        return $this->activities->markAllRead();
    }
}
