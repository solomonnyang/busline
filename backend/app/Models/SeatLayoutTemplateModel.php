<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * SeatLayoutTemplateModel - manages the seat_layout_templates table.
 * Admin-defined seat arrangement presets (columns per row) that vendors
 * apply when creating or updating a bus.
 */
class SeatLayoutTemplateModel extends Model
{
    protected $table         = 'seat_layout_templates';
    protected $primaryKey    = 'id';
    protected $useAutoIncrement = true;
    protected $returnType    = 'array';
    protected $allowedFields = ['name', 'category_id', 'description', 'columns', 'is_active'];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    public function findActive()
    {
        $rows = $this->select(
            'seat_layout_templates.*, bus_categories.name as category_name, bus_categories.slug as category_slug'
        )
            ->join('bus_categories', 'bus_categories.id = seat_layout_templates.category_id', 'left')
            ->where('seat_layout_templates.is_active', 1)
            ->orderBy('seat_layout_templates.name', 'ASC')
            ->findAll();

        foreach ($rows as &$row) {
            $row['columns'] = json_decode($row['columns'] ?? '[]', true) ?: [];
        }
        unset($row);

        return $rows;
    }

    public function withCategory()
    {
        $rows = $this->select(
            'seat_layout_templates.*, bus_categories.name as category_name, bus_categories.slug as category_slug'
        )
            ->join('bus_categories', 'bus_categories.id = seat_layout_templates.category_id', 'left')
            ->orderBy('seat_layout_templates.name', 'ASC')
            ->findAll();

        foreach ($rows as &$row) {
            $row['columns'] = json_decode($row['columns'] ?? '[]', true) ?: [];
        }
        unset($row);

        return $rows;
    }
}
