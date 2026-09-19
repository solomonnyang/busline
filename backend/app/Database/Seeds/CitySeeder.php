<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

/**
 * Seeds a starter set of Nigerian cities for route management.
 */
class CitySeeder extends Seeder
{
    public function run()
    {
        $cities = [
            ['name' => 'Lagos', 'state' => 'Lagos'],
            ['name' => 'Abuja', 'state' => 'FCT'],
            ['name' => 'Port Harcourt', 'state' => 'Rivers'],
            ['name' => 'Ibadan', 'state' => 'Oyo'],
            ['name' => 'Kano', 'state' => 'Kano'],
            ['name' => 'Enugu', 'state' => 'Enugu'],
            ['name' => 'Benin City', 'state' => 'Edo'],
            ['name' => 'Onitsha', 'state' => 'Anambra'],
            ['name' => 'Aba', 'state' => 'Abia'],
            ['name' => 'Kaduna', 'state' => 'Kaduna'],
            ['name' => 'Jos', 'state' => 'Plateau'],
            ['name' => 'Owerri', 'state' => 'Imo'],
            ['name' => 'Calabar', 'state' => 'Cross River'],
            ['name' => 'Uyo', 'state' => 'Akwa Ibom'],
        ];

        $builder = $this->db->table('cities');
        foreach ($cities as $city) {
            $exists = $builder->where('name', $city['name'])->countAllResults();
            if ($exists === 0) {
                $city['is_active']  = 1;
                $city['created_at'] = date('Y-m-d H:i:s');
                $city['updated_at'] = date('Y-m-d H:i:s');
                $builder->insert($city);
            }
        }

        echo count($cities) . " cities seeded.\n";
    }
}
