<?php

namespace App\Controllers\API\Vendor;

use App\Models\ReviewModel;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * ReviewController
 * Vendor-scoped reviews: list, summary, reply and status management.
 */
class ReviewController extends BaseVendorController
{
    protected ReviewModel $reviews;

    public function __construct()
    {
        $this->reviews = model(ReviewModel::class);
    }

    /**
     * GET /api/vendor/reviews?status=&rating=
     */
    public function index(): ResponseInterface
    {
        $vendor = $this->requireApprovedVendor();
        $filters = array_filter([
            'status' => $this->request->getGet('status'),
            'rating' => $this->request->getGet('rating'),
        ]);
        return api_success($this->reviews->findByVendorId((int) $vendor['id'], $filters));
    }

    /**
     * GET /api/vendor/reviews/summary
     */
    public function summary(): ResponseInterface
    {
        $vendor = $this->requireApprovedVendor();
        $id = (int) $vendor['id'];

        return api_success([
            'average'   => $this->reviews->averageForVendor($id),
            'total'     => $this->reviews->where('vendor_id', $id)->countAllResults(),
            'published' => $this->reviews->where('vendor_id', $id)->where('status', 'published')->countAllResults(),
            'pending'   => $this->reviews->where('vendor_id', $id)->where('status', 'pending')->countAllResults(),
            'hidden'    => $this->reviews->where('vendor_id', $id)->where('status', 'hidden')->countAllResults(),
            'breakdown' => $this->reviews->ratingBreakdown($id),
        ]);
    }

    /**
     * PUT /api/vendor/reviews/(:num)/reply
     */
    public function reply(int $id): ResponseInterface
    {
        $data = $this->validateOrFail([
            'reply' => 'required|max_length[2000]',
        ]);

        try {
            $vendor = $this->requireApprovedVendor();
            $review = $this->reviews->find($id);
            if (! $review || (int) $review['vendor_id'] !== (int) $vendor['id']) {
                return api_error('Review not found.', 404);
            }

            $this->requirePermission('reviews.reply');
            $this->reviews->update($id, [
                'reply'      => $data['reply'],
                'replied_at' => date('Y-m-d H:i:s'),
            ]);

            return api_success($this->reviews->find($id), 'Reply saved successfully.');
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 403);
        }
    }

    /**
     * PUT /api/vendor/reviews/(:num)/status
     */
    public function updateStatus(int $id): ResponseInterface
    {
        $data = $this->validateOrFail([
            'status' => 'required|in_list[pending,published,hidden]',
        ]);

        try {
            $vendor = $this->requireApprovedVendor();
            $review = $this->reviews->find($id);
            if (! $review || (int) $review['vendor_id'] !== (int) $vendor['id']) {
                return api_error('Review not found.', 404);
            }

            $this->requirePermission('reviews.reply');
            $this->reviews->update($id, ['status' => $data['status']]);

            return api_success($this->reviews->find($id), 'Review updated successfully.');
        } catch (\RuntimeException $e) {
            return api_error($e->getMessage(), 403);
        }
    }
}
