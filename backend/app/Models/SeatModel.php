<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * SeatModel - manages the seats table.
 */
class SeatModel extends Model
{
    protected $table         = 'seats';
    protected $primaryKey    = 'id';
    protected $useAutoIncrement = true;
    protected $returnType    = 'array';
    protected $allowedFields = ['bus_id', 'seat_number', 'seat_row', 'seat_column', 'seat_type', 'is_active'];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    public function findByBusId(int $busId)
    {
        return $this->where('bus_id', $busId)->where('is_active', 1)->orderBy('seat_row', 'ASC')->orderBy('seat_column', 'ASC')->findAll();
    }

    /**
     * Hard-delete all physical seats for a bus (used when regenerating a layout).
     */
    public function clearSeats(int $busId): int
    {
        return $this->where('bus_id', $busId)->delete();
    }

    /**
     * Generate seat rows for a bus based on the layout definition.
     *
     * Two layout shapes are supported:
     *  - Explicit multi-row grid: { "rows": [ ["A","B",null,"C","D"], ... ] }
     *    Each row is an array of cells; null or '' marks an aisle gap / empty
     *    slot (no seat), anything else is a seat column label. Row 1 of the
     *    grid maps to seat_row 1, and so on.
     *  - Legacy: { "columns": [...], "rows": N } (one pattern repeated N times),
     *    or null for the default 2+2 layout.
     *
     * Returns the number of physical seats created.
     */
    public function generateSeats(int $busId, int $totalSeats, ?array $layout): int
    {
        $data       = [];
        $seatNumber = 1;

        if (! empty($layout) && ! empty($layout['rows']) && is_array($layout['rows'])) {
            // Explicit multi-row grid with aisle gaps.
            foreach ($layout['rows'] as $rowIndex => $rowCells) {
                if (! is_array($rowCells)) {
                    continue;
                }
                $row = $rowIndex + 1;
                foreach ($rowCells as $index => $cell) {
                    if ($cell === null || $cell === '' || $cell === 'DRIVER') {
                        continue;
                    }
                    $data[] = $this->seatPayload($busId, $seatNumber++, $row, $cell, $rowCells, $index);
                }
            }
        } else {
            // Legacy flat columns x rows, or the default 2+2.
            if (! empty($layout) && isset($layout['columns']) && isset($layout['rows'])) {
                $columns = $layout['columns'];
                $rows    = $layout['rows'];
            } else {
                $columns = ['A', 'B', 'C', 'D'];
                $rows    = (int) ceil($totalSeats / 4);
            }

            for ($r = 1; $r <= (int) $rows; $r++) {
                foreach ($columns as $index => $col) {
                    if (($r - 1) * count($columns) + ($index + 1) > $totalSeats) {
                        break;
                    }
                    $data[] = $this->seatPayload($busId, $seatNumber++, $r, $col, $columns, $index);
                }
            }
        }

        if ($data) {
            $this->insertBatch($data);
        }

        return $seatNumber - 1;
    }

    /**
     * Build a physical seat row payload for insertion.
     */
    private function seatPayload(int $busId, int $seatNumber, int $row, string $column, array $cells, int $index): array
    {
        return [
            'bus_id'      => $busId,
            'seat_number' => (string) $seatNumber,
            'seat_row'    => $row,
            'seat_column' => strtoupper($column),
            'seat_type'   => $this->seatType($cells, $index),
            'is_active'   => 1,
            'created_at'  => date('Y-m-d H:i:s'),
            'updated_at'  => date('Y-m-d H:i:s'),
        ];
    }

    /**
     * Classify a seat as window / aisle / middle based on its position in the
     * row's cells: outer seats are windows, seats adjacent to a gap are aisles.
     */
    private function seatType(array $cells, int $index): string
    {
        $positions = [];
        foreach ($cells as $i => $cell) {
            if ($cell !== null && $cell !== '' && $cell !== 'DRIVER') {
                $positions[] = $i;
            }
        }
        $first = $positions[0] ?? $index;
        $last  = $positions[count($positions) - 1] ?? $index;

        if ($index === $first || $index === $last) {
            return 'window';
        }
        $left  = ($index > 0) ? ($cells[$index - 1] ?? null) : null;
        $right = ($index < count($cells) - 1) ? ($cells[$index + 1] ?? null) : null;
        if ($left === null || $left === '' || $right === null || $right === '') {
            return 'aisle';
        }
        return 'middle';
    }
}
