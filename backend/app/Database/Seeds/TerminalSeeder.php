<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

/**
 * Seeds starter bus terminals for the seeded cities.
 * Each terminal carries a name, address and coordinates for map markers.
 */
class TerminalSeeder extends Seeder
{
    private const TERMINALS = [
        'Lagos' => [
            ['Ikeja Transport Terminal', 'Ikeja Along, Lagos', 6.6065, 3.3506, ['parking' => true, 'restroom' => true, 'waiting_lounge' => true, 'refreshments' => true, 'wifi' => true, 'security' => true]],
            ['Oshodi Interchange Terminal', 'Oshodi, Lagos', 6.5485, 3.3517, ['parking' => true, 'restroom' => true, 'waiting_lounge' => true, 'refreshments' => true, 'wifi' => false, 'security' => true]],
            ['Jibowu Motor Park', 'Jibowu, Yaba, Lagos', 6.5120, 3.3710, ['parking' => false, 'restroom' => true, 'waiting_lounge' => false, 'refreshments' => true, 'wifi' => false, 'security' => true]],
        ],
        'Abuja' => [
            ['Kubwa Central Motor Park', 'Kubwa, Abuja', 9.1030, 7.5340, ['parking' => true, 'restroom' => true, 'waiting_lounge' => true, 'refreshments' => true, 'wifi' => false, 'security' => true]],
            ['Jabi Motor Park', 'Jabi, Abuja', 9.0530, 7.4350, ['parking' => true, 'restroom' => true, 'waiting_lounge' => true, 'refreshments' => true, 'wifi' => true, 'security' => true]],
            ['Wuse Central Terminal', 'Wuse Zone 4, Abuja', 9.0760, 7.4780, ['parking' => true, 'restroom' => true, 'waiting_lounge' => true, 'refreshments' => false, 'wifi' => false, 'security' => true]],
        ],
        'Port Harcourt' => [
            ['Rumuokwuta Motor Park', 'Rumuokwuta, Port Harcourt', 4.8580, 6.9560, ['parking' => true, 'restroom' => true, 'waiting_lounge' => false, 'refreshments' => true, 'wifi' => false, 'security' => true]],
            ['Mile 3 Terminal', 'Mile 3, Diobu, Port Harcourt', 4.8060, 7.0390, ['parking' => true, 'restroom' => true, 'waiting_lounge' => true, 'refreshments' => true, 'wifi' => false, 'security' => true]],
        ],
        'Ibadan' => [
            ['Challenge Motor Park', 'Challenge, Ibadan', 7.3580, 3.8970, ['parking' => true, 'restroom' => true, 'waiting_lounge' => false, 'refreshments' => true, 'wifi' => false, 'security' => true]],
            ['Iwo Road Transport Terminal', 'Iwo Road, Ibadan', 7.3810, 3.9350, ['parking' => true, 'restroom' => true, 'waiting_lounge' => true, 'refreshments' => true, 'wifi' => true, 'security' => true]],
        ],
        'Kano' => [
            ['Dawanau Motor Park', 'Dawanau, Kano', 11.9680, 8.5470, ['parking' => true, 'restroom' => true, 'waiting_lounge' => true, 'refreshments' => true, 'wifi' => false, 'security' => true]],
            ['Sabon Gari Terminal', 'Sabon Gari, Kano', 12.0180, 8.5000, ['parking' => true, 'restroom' => false, 'waiting_lounge' => true, 'refreshments' => true, 'wifi' => false, 'security' => true]],
        ],
        'Enugu' => [
            ['Ogbete Main Motor Park', 'Ogbete, Enugu', 6.4540, 7.5080, ['parking' => true, 'restroom' => true, 'waiting_lounge' => true, 'refreshments' => true, 'wifi' => false, 'security' => true]],
            ['Holy Ghost Motor Park', 'Holy Ghost, Enugu', 6.4410, 7.4910, ['parking' => true, 'restroom' => true, 'waiting_lounge' => false, 'refreshments' => true, 'wifi' => false, 'security' => true]],
        ],
        'Benin City' => [
            ['Benin Motor Park', 'Ring Road, Benin City', 6.3350, 5.6210, ['parking' => true, 'restroom' => true, 'waiting_lounge' => false, 'refreshments' => true, 'wifi' => false, 'security' => true]],
            ['Uselu Terminal', 'Uselu, Benin City', 6.3540, 5.6100, ['parking' => true, 'restroom' => false, 'waiting_lounge' => true, 'refreshments' => true, 'wifi' => false, 'security' => true]],
        ],
        'Onitsha' => [
            ['Ose Okwodu Motor Park', 'Ose Okwodu, Onitsha', 6.1430, 6.7860, ['parking' => true, 'restroom' => true, 'waiting_lounge' => true, 'refreshments' => true, 'wifi' => false, 'security' => true]],
            ['Upper Iweka Terminal', 'Upper Iweka, Onitsha', 6.1600, 6.7770, ['parking' => true, 'restroom' => true, 'waiting_lounge' => false, 'refreshments' => true, 'wifi' => false, 'security' => true]],
        ],
        'Aba' => [
            ['Ariaria Junction Motor Park', 'Ariaria, Aba', 5.1060, 7.3440, ['parking' => true, 'restroom' => true, 'waiting_lounge' => false, 'refreshments' => true, 'wifi' => false, 'security' => true]],
            ['Osisioma Motor Park', 'Osisioma, Aba', 5.0820, 7.3240, ['parking' => true, 'restroom' => true, 'waiting_lounge' => true, 'refreshments' => true, 'wifi' => false, 'security' => true]],
        ],
        'Kaduna' => [
            ['Kaduna Motor Park', 'Kawo, Kaduna', 10.5410, 7.4370, ['parking' => true, 'restroom' => true, 'waiting_lounge' => true, 'refreshments' => true, 'wifi' => false, 'security' => true]],
            ['Katsina Road Terminal', 'Katsina Road, Kaduna', 10.5210, 7.4110, ['parking' => true, 'restroom' => false, 'waiting_lounge' => true, 'refreshments' => false, 'wifi' => false, 'security' => true]],
        ],
        'Jos' => [
            ['Terminus Motor Park', 'Terminus, Jos', 9.9140, 8.8760, ['parking' => true, 'restroom' => true, 'waiting_lounge' => true, 'refreshments' => true, 'wifi' => false, 'security' => true]],
            ['Zaria Road Terminal', 'Zaria Road, Jos', 9.9260, 8.8860, ['parking' => true, 'restroom' => true, 'waiting_lounge' => false, 'refreshments' => true, 'wifi' => false, 'security' => true]],
        ],
        'Owerri' => [
            ['Ihiagwa Motor Park', 'Ihiagwa, Owerri', 5.4920, 7.0480, ['parking' => true, 'restroom' => true, 'waiting_lounge' => false, 'refreshments' => true, 'wifi' => false, 'security' => true]],
            ['Wethedral Terminal', 'Wethedral Road, Owerri', 5.4860, 7.0260, ['parking' => true, 'restroom' => true, 'waiting_lounge' => true, 'refreshments' => true, 'wifi' => false, 'security' => true]],
        ],
        'Calabar' => [
            ['Calabar Motor Park', 'Wat Market, Calabar', 4.9580, 8.3270, ['parking' => true, 'restroom' => true, 'waiting_lounge' => true, 'refreshments' => true, 'wifi' => false, 'security' => true]],
            ['Eight Miles Terminal', 'Eight Miles, Calabar', 5.0200, 8.3740, ['parking' => true, 'restroom' => false, 'waiting_lounge' => false, 'refreshments' => true, 'wifi' => false, 'security' => true]],
        ],
        'Uyo' => [
            ['Uyo Motor Park', 'Itam, Uyo', 5.0440, 7.9180, ['parking' => true, 'restroom' => true, 'waiting_lounge' => true, 'refreshments' => true, 'wifi' => false, 'security' => true]],
            ['Nwaniba Road Terminal', 'Nwaniba Road, Uyo', 5.0330, 7.9320, ['parking' => true, 'restroom' => true, 'waiting_lounge' => true, 'refreshments' => true, 'wifi' => true, 'security' => true]],
        ],
    ];

    public function run()
    {
        $cityTable = $this->db->table('cities');
        $terminalTable = $this->db->table('terminals');
        $count = 0;

        foreach (self::TERMINALS as $cityName => $terminals) {
            $city = $cityTable->where('name', $cityName)->get()->getRowArray();
            if (! $city) {
                continue;
            }
            foreach ($terminals as [$name, $address, $lat, $lng, $amenities]) {
                $exists = $terminalTable->where('name', $name)->countAllResults();
                if ($exists > 0) {
                    continue;
                }
                $terminalTable->insert([
                    'city_id'    => $city['id'],
                    'name'       => $name,
                    'address'    => $address,
                    'lat'        => $lat,
                    'lng'        => $lng,
                    'photo_url'  => null,
                    'amenities'  => json_encode($amenities),
                    'is_active'  => 1,
                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s'),
                ]);
                $count++;
            }
        }

        echo "{$count} terminals seeded.\n";
    }
}
