<?php

namespace App\Controllers\API;

use App\Models\BookingModel;
use App\Models\ReviewModel;
use App\Models\TripModel;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * ReviewController
 * Customer-facing reviews: submit a rating for a completed trip, list the
 * customer's own reviews, and (public) published reviews for a vendor.
 */
class ReviewController extends BaseApiController
{
    protected ReviewModel $reviews;
    protected BookingModel $bookings;

    public function __construct()
    {
        $this->reviews  = model(ReviewModel::class);
        $this->bookings = model(BookingModel::class);
    }

    /**
     * POST /api/reviews
     * Submit a review for one of the customer's completed bookings.
     * Body: { booking_id, rating: 1-5, comment? }
     */
    public function create(): ResponseInterface
    {
        $data = $this->validateOrFail([
            'booking_id' => 'required|is_natural_no_zero',
            'rating'     => 'required|is_natural|greater_than[0]|less_than[6]',
            'comment'    => 'permit_empty|max_length[2000]',
        ]);

        $customer = $this->currentCustomer();

        $booking = $this->bookings->find((int) $data['booking_id']);
        if (! $booking || (int) $booking['customer_id'] !== (int) $customer['id']) {
            return api_error('Booking not found.', 404);
        }
        if ($booking['status'] !== 'completed') {
            return api_error('You can only review a booking after the trip is completed.', 422);
        }

        $existing = $this->reviews->where('booking_id', (int) $data['booking_id'])->first();
        if ($existing) {
            return api_error('You have already reviewed this booking.', 422);
        }

        $trip = model(TripModel::class)->find((int) $booking['trip_id']);
        if (! $trip) {
            return api_error('Trip not found.', 404);
        }

        $reviewId = $this->reviews->insert([
            'booking_id'  => (int) $data['booking_id'],
            'trip_id'     => (int) $booking['trip_id'],
            'vendor_id'   => (int) $trip['vendor_id'],
            'customer_id' => (int) $customer['id'],
            'rating'      => (int) $data['rating'],
            'comment'     => $data['comment'] ?? null,
            'status'      => 'pending',
        ]);

        return api_success($this->reviews->find($reviewId), 'Review submitted successfully. It will appear after moderation.', 201);
    }

    /**
     * GET /api/reviews
     * The customer's own reviews.
     */
    public function index(): ResponseInterface
    {
        $customer = $this->currentCustomer();
        $rows = $this->reviews->select(
            'reviews.*, vendors.company_name as vendor_name,
             trips.departure_date as trip_date,
             origin.name as origin_city, destination.name as destination_city'
        )
            ->join('vendors', 'vendors.id = reviews.vendor_id', 'left')
            ->join('trips', 'trips.id = reviews.trip_id', 'left')
            ->join('routes', 'routes.id = trips.route_id', 'left')
            ->join('cities as origin', 'origin.id = routes.origin_city_id', 'left')
            ->join('cities as destination', 'destination.id = routes.destination_city_id', 'left')
            ->where('reviews.customer_id', (int) $customer['id'])
            ->orderBy('reviews.created_at', 'DESC')
            ->findAll();

        return api_success($rows);
    }

    /**
     * GET /api/reviews/vendor/{id}
     * Public: published reviews + summary for a vendor's profile/trip page.
     */
    public function vendor(int $id): ResponseInterface
    {
        $vendor = model(\App\Models\VendorModel::class)->find($id);
        if (! $vendor) {
            return api_error('Vendor not found.', 404);
        }

        $rows = $this->reviews->select(
            'reviews.rating, reviews.comment, reviews.created_at,
             reviews.reply, reviews.replied_at,
             users.name as customer_name'
        )
            ->join('customers', 'customers.id = reviews.customer_id', 'left')
            ->join('users', 'users.id = customers.user_id', 'left')
            ->where('reviews.vendor_id', (int) $id)
            ->where('reviews.status', 'published')
            ->orderBy('reviews.created_at', 'DESC')
            ->findAll(100);

        return api_success([
            'vendor_id' => (int) $id,
            'average'   => $this->reviews->averageForVendor((int) $id),
            'total'     => count($rows),
            'breakdown' => $this->reviews->ratingBreakdown((int) $id),
            'reviews'   => $rows,
        ]);
    }
}
