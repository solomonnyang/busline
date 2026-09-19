<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * SettingModel - manages the settings table.
 */
class SettingModel extends Model
{
    protected $table         = 'settings';
    protected $primaryKey    = 'id';
    protected $useAutoIncrement = true;
    protected $returnType    = 'array';
    protected $allowedFields = ['group', 'key', 'value', 'is_json'];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    /**
     * Get a setting value by key.
     */
    public function getValue(string $key, ?string $group = 'general')
    {
        $row = $this->where('key', $key)->where('group', $group)->first();
        if (! $row) {
            return null;
        }
        return $row['is_json'] ? json_decode($row['value'], true) : $row['value'];
    }

    /**
     * Set a setting value by key (creates or updates).
     */
    public function saveValue(string $key, $value, string $group = 'general')
    {
        $isJson = ! is_scalar($value);
        $value  = is_scalar($value) ? $value : json_encode($value);

        $row = $this->where('key', $key)->where('group', $group)->first();
        $data = ['key' => $key, 'group' => $group, 'value' => $value, 'is_json' => (int) $isJson];

        if ($row) {
            return $this->update($row['id'], $data);
        }
        return $this->insert($data);
    }
}
