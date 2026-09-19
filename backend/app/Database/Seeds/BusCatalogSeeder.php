<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

/**
 * Seeds the admin-managed bus catalog:
 *  - the four original bus types as bus categories,
 *  - a few starter seat arrangement templates,
 *  - backfills category_id on existing buses from their bus_type.
 */
class BusCatalogSeeder extends Seeder
{
    public function run()
    {
        $db = \Config\Database::connect();
        $now = date('Y-m-d H:i:s');

        $categories = [
            ['standard',  'standard',  'Standard intercity service, 2+2 seating'],
            ['luxury',    'luxury',    'Premium coach with extra legroom, 2+1 seating'],
            ['vip',       'vip',       'VIP express, fewer seats and more space, 1+1 seating'],
            ['executive', 'executive', 'Executive class with 2+2 recliners'],
        ];

        $categoryIds = [];
        $existing = $db->table('bus_categories')->countAllResults();
        if ($existing === 0) {
            foreach ($categories as [$name, $slug, $description]) {
                $db->table('bus_categories')->insert([
                    'name'        => $name,
                    'slug'        => $slug,
                    'description' => $description,
                    'is_active'   => 1,
                    'created_at'  => $now,
                    'updated_at'  => $now,
                ]);
                $categoryIds[$slug] = $db->insertID();
            }
            echo "Seeded " . count($categories) . " bus categories.\n";
        } else {
            foreach ($db->table('bus_categories')->get()->getResultArray() as $row) {
                $categoryIds[$row['slug']] = (int) $row['id'];
            }
        }

        if ($db->table('seat_layout_templates')->countAllResults() === 0) {
            $templates = [
                ['Standard 2+2', 'standard', 'Two seats on each side of the aisle', ['A', 'B', 'C', 'D']],
                ['Standard 2+2 (wide aisle)', 'standard', 'Two seats per side with a wider centre aisle', ['A', 'B', 'C', 'D']],
                ['Luxury 2+1', 'luxury', 'Two seats on one side, one on the other', ['A', 'B', 'C']],
                ['VIP 1+1', 'vip', 'Single seat per row side for maximum space', ['A', 'B']],
                ['Executive 2+2', 'executive', 'Executive recliners, two per side', ['A', 'B', 'C', 'D']],
                ['Executive 2+1', 'executive', 'Executive recliners with 2+1 arrangement', ['A', 'B', 'C']],
            ];

            foreach ($templates as [$name, $slug, $description, $columns]) {
                $db->table('seat_layout_templates')->insert([
                    'name'        => $name,
                    'category_id' => $categoryIds[$slug] ?? null,
                    'description' => $description,
                    'columns'     => json_encode($columns),
                    'is_active'   => 1,
                    'created_at'  => $now,
                    'updated_at'  => $now,
                ]);
            }
            echo "Seeded " . count($templates) . " seat layout templates.\n";
        }

        // Backfill category_id on existing buses from their bus_type value.
        $buses = $db->table('buses')->select('id, bus_type')->where('category_id', null)->get()->getResultArray();
        $matched = 0;
        foreach ($buses as $bus) {
            $slug = strtolower(trim((string) $bus['bus_type']));
            if (isset($categoryIds[$slug])) {
                $db->table('buses')->where('id', $bus['id'])->update(['category_id' => $categoryIds[$slug]]);
                $matched++;
            }
        }
        if ($matched > 0) {
            echo "Linked {$matched} existing buses to their category.\n";
        }
    }
}
