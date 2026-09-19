<?php

namespace App\Services;

use App\Models\NotificationModel;
use App\Models\VendorModel;

/**
 * NotificationService
 * Creates in-app notifications for a user or for a vendor's owner user.
 */
class NotificationService
{
    protected NotificationModel $notifications;
    protected PushNotificationService $push;

    public function __construct()
    {
        $this->notifications = model(NotificationModel::class);
        $this->push          = new PushNotificationService();
    }

    public function notify(int $userId, string $type, string $title, ?string $message = null, ?array $data = null): void
    {
        $this->notifications->insert([
            'user_id'    => $userId,
            'type'       => $type,
            'title'      => $title,
            'message'    => $message,
            'data'       => $data ? json_encode($data) : null,
            'is_read'    => 0,
        ]);

        // Deliver a remote push alongside the in-app notification. Safe to fire
        // and forget: failures (offline, invalid token) never block the caller.
        // The in-app record was already inserted above, so skip the mirror.
        $this->push->notifyUser($userId, $title, $message ?? '', $data, false);
    }

    public function notifyVendor(int $vendorId, string $type, string $title, ?string $message = null, ?array $data = null): void
    {
        $vendor = model(VendorModel::class)->find($vendorId);
        if ($vendor && ! empty($vendor['user_id'])) {
            $this->notify((int) $vendor['user_id'], $type, $title, $message, $data);
        }
    }

    /**
     * Notify every active staff member of a vendor too (for vendor-wide events).
     */
    public function notifyVendorTeam(int $vendorId, string $type, string $title, ?string $message = null, ?array $data = null): void
    {
        $this->notifyVendor($vendorId, $type, $title, $message, $data);

        $staff = model(\App\Models\StaffModel::class)->findByVendorId($vendorId);
        foreach ($staff as $member) {
            if ((int) ($member['is_active'] ?? 0) === 1 && ! empty($member['user_id'])) {
                $this->notify((int) $member['user_id'], $type, $title, $message, $data);
            }
        }
    }
}
