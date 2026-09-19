<?php

namespace App\Services;

use App\Models\AuditLogModel;

/**
 * AuditService
 * Records sensitive actions to the audit_logs table, attaching the current
 * authenticated user, vendor scope and request metadata automatically.
 */
class AuditService
{
    protected AuditLogModel $audits;

    public function __construct()
    {
        $this->audits = model(AuditLogModel::class);
    }

    /**
     * Record an audit entry.
     *
     * @param int|null    $vendorId  vendor scope (null → derived from the user)
     * @param string|null $modelType
     * @param int|null    $modelId
     * @param array|null  $changes   before/after diff or relevant payload
     * @param int|null    $userId    actor (defaults to the authenticated user)
     */
    public function record(
        string $action,
        ?int $vendorId = null,
        ?string $modelType = null,
        ?int $modelId = null,
        ?array $changes = null,
        ?int $userId = null
    ): void {
        $request = service('request');

        $actor = $userId;
        if ($actor === null) {
            $actor = isset($request->user['id']) ? (int) $request->user['id'] : null;
        }

        $scope = $vendorId;
        if ($scope === null && ! empty($request->vendor)) {
            $scope = (int) $request->vendor['id'];
        }

        $this->audits->log([
            'user_id'    => $actor,
            'vendor_id'  => $scope,
            'action'     => $action,
            'model_type' => $modelType,
            'model_id'   => $modelId,
            'changes'    => $changes,
            'ip_address' => $request->getIPAddress(),
            'user_agent' => substr((string) $request->getUserAgent(), 0, 255),
        ]);
    }

    /**
     * Convenience wrapper for vendor-scoped controller actions.
     */
    public function vendorAction(int $vendorId, string $action, ?string $modelType = null, ?int $modelId = null, ?array $changes = null): void
    {
        $this->record($action, $vendorId, $modelType, $modelId, $changes);
    }
}
