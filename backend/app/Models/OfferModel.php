<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * OfferModel - manages the offers table.
 * Admin-managed promotional offers surfaced to customers in the
 * mobile/home promo slider.
 */
class OfferModel extends Model
{
    protected $table         = 'offers';
    protected $primaryKey    = 'id';
    protected $useAutoIncrement = true;
    protected $returnType    = 'array';
    protected $allowedFields = [
        'vendor_id',
        'code',
        'title',
        'description',
        'badge',
        'discount_type',
        'discount_value',
        'icon',
        'color',
        'soft',
        'image',
        'is_active',
        'is_featured',
    ];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    /**
     * Active offers, ordered by insertion (curated admin order).
     */
    public function findActive(): array
    {
        return $this->where('is_active', 1)->orderBy('id', 'ASC')->findAll();
    }
}
