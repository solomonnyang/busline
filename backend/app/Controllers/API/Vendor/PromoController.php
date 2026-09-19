<?php

namespace App\Controllers\API\Vendor;

use App\Models\OfferModel;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * PromoController
 * Vendor-published promotions (vendor-scoped offers for the dashboard).
 */
class PromoController extends BaseVendorController
{
    protected OfferModel $offers;

    public function __construct()
    {
        $this->offers = model(OfferModel::class);
    }

    /**
     * GET /api/vendor/promotions
     */
    public function index(): ResponseInterface
    {
        $vendor = $this->requireApprovedVendor();
        return api_success($this->offers->where('vendor_id', (int) $vendor['id'])->orderBy('id', 'DESC')->findAll());
    }

    /**
     * POST /api/vendor/promotions/generate-code
     */
    public function generateCode(): ResponseInterface
    {
        return api_success(['code' => $this->newCode()]);
    }

    /**
     * POST /api/vendor/promotions
     */
    public function create(): ResponseInterface
    {
        $data = $this->validateOrFail([
            'title'          => 'required|max_length[100]',
            'description'    => 'permit_empty|max_length[255]',
            'badge'          => 'permit_empty|max_length[100]',
            'discount_type'  => 'required|in_list[percent,fixed]',
            'discount_value' => 'required|numeric|greater_than[0]',
            'code'           => 'permit_empty|max_length[50]',
            'is_active'      => 'permit_empty|in_list[0,1]',
        ]);

        try {
            $vendor = $this->requireApprovedVendor();
            $this->requirePermission('promos.manage');

            $code = trim(strtoupper((string) ($data['code'] ?? '')));
            if ($code === '' || $this->offers->where('code', $code)->first()) {
                $code = $this->newCode();
            }

            $id = $this->offers->insert([
                'vendor_id'      => $vendor['id'],
                'code'           => $code,
                'title'          => $data['title'],
                'description'    => $data['description'] ?? null,
                'badge'          => $data['badge'] ?? null,
                'discount_type'  => $data['discount_type'],
                'discount_value' => (float) $data['discount_value'],
                'is_active'      => (int) ($data['is_active'] ?? 1),
            ]);

            $this->audit()->vendorAction((int) $vendor['id'], 'promo.created', 'Offer', $id, ['code' => $code]);

            return api_success($this->offers->find($id), 'Promotion created successfully.', 201);
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 403);
        }
    }

    /**
     * PUT /api/vendor/promotions/(:num)
     */
    public function update(int $id): ResponseInterface
    {
        $data = $this->validateOrFail([
            'title'          => 'permit_empty|max_length[100]',
            'description'    => 'permit_empty|max_length[255]',
            'badge'          => 'permit_empty|max_length[100]',
            'discount_type'  => 'permit_empty|in_list[percent,fixed]',
            'discount_value' => 'permit_empty|numeric|greater_than[0]',
            'code'           => 'permit_empty|max_length[50]',
            'is_active'      => 'permit_empty|in_list[0,1]',
        ]);

        try {
            $vendor = $this->requireApprovedVendor();
            $offer = $this->offers->find($id);
            if (! $offer || (int) $offer['vendor_id'] !== (int) $vendor['id']) {
                return api_error('Promotion not found.', 404);
            }

            $this->requirePermission('promos.manage');

            $payload = [];
            foreach (['title', 'description', 'badge', 'discount_type', 'code', 'is_active'] as $field) {
                if (array_key_exists($field, $data) && $data[$field] !== '' && $data[$field] !== null) {
                    $payload[$field] = $data[$field];
                }
            }
            if (array_key_exists('discount_value', $data) && $data['discount_value'] !== '') {
                $payload['discount_value'] = (float) $data['discount_value'];
            }

            if ($payload) {
                $this->offers->update($id, $payload);
            }

            $this->audit()->vendorAction((int) $vendor['id'], 'promo.updated', 'Offer', $id);

            return api_success($this->offers->find($id), 'Promotion updated successfully.');
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 403);
        }
    }

    /**
     * DELETE /api/vendor/promotions/(:num)
     */
    public function delete(int $id): ResponseInterface
    {
        try {
            $vendor = $this->requireApprovedVendor();
            $offer = $this->offers->find($id);
            if (! $offer || (int) $offer['vendor_id'] !== (int) $vendor['id']) {
                return api_error('Promotion not found.', 404);
            }

            $this->requirePermission('promos.manage');
            $this->offers->delete($id);
            $this->audit()->vendorAction((int) $vendor['id'], 'promo.deleted', 'Offer', $id);

            return api_success(null, 'Promotion deleted successfully.');
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 403);
        }
    }

    protected function newCode(): string
    {
        return 'BUS' . date('ymd') . strtoupper(bin2hex(random_bytes(3)));
    }
}
