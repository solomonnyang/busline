<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * ReviewModel - manages the reviews table.
 */
class ReviewModel extends Model
{
    protected $table         = 'reviews';
    protected $primaryKey    = 'id';
    protected $useAutoIncrement = true;
    protected $returnType    = 'array';
    protected $allowedFields = ['booking_id', 'trip_id', 'vendor_id', 'customer_id', 'rating', 'comment', 'status', 'reply', 'replied_at'];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    /**
     * Reviews for a vendor with customer + trip context.
     */
    public function findByVendorId(int $vendorId, array $filters = [])
    {
        $query = $this->select(
            'reviews.*,
             users.name as customer_name, users.avatar as customer_avatar,
             trips.departure_date as trip_date,
             origin.name as origin_city, destination.name as destination_city'
        )
            ->join('customers', 'customers.id = reviews.customer_id', 'left')
            ->join('users', 'users.id = customers.user_id', 'left')
            ->join('trips', 'trips.id = reviews.trip_id', 'left')
            ->join('routes', 'routes.id = trips.route_id', 'left')
            ->join('cities as origin', 'origin.id = routes.origin_city_id', 'left')
            ->join('cities as destination', 'destination.id = routes.destination_city_id', 'left')
            ->where('reviews.vendor_id', $vendorId);

        if (! empty($filters['status'])) {
            $query->where('reviews.status', $filters['status']);
        }
        if (! empty($filters['rating'])) {
            $query->where('reviews.rating', (int) $filters['rating']);
        }

        return $query->orderBy('reviews.created_at', 'DESC')->findAll();
    }

    public function averageForVendor(int $vendorId): float
    {
        $row = $this->select('AVG(rating) as avg, COUNT(*) as total')
            ->where('vendor_id', $vendorId)
            ->where('status', 'published')
            ->first();

        return round((float) ($row['avg'] ?? 0), 1);
    }

    public function ratingBreakdown(int $vendorId): array
    {
        $rows = $this->select('rating, COUNT(*) as total')
            ->where('vendor_id', $vendorId)
            ->where('status', 'published')
            ->groupBy('rating')
            ->findAll();

        $map = array_fill(1, 5, 0);
        foreach ($rows as $row) {
            $map[(int) $row['rating']] = (int) $row['total'];
        }
        return $map;
    }
}
