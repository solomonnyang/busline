<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Adds lat/lng coordinates to cities so the map can geolocate destinations,
 * and populates them for the seeded cities.
 */
class AddCoordinatesToCitiesTable extends Migration
{
    private const COORDS = [
        'Lagos'         => ['lat' => 6.5244, 'lng' => 3.3792],
        'Abuja'         => ['lat' => 9.0765, 'lng' => 7.3986],
        'Port Harcourt' => ['lat' => 4.8156, 'lng' => 7.0498],
        'Ibadan'        => ['lat' => 7.3775, 'lng' => 3.9470],
        'Kano'          => ['lat' => 12.0022, 'lng' => 8.5920],
        'Enugu'         => ['lat' => 6.4491, 'lng' => 7.5028],
        'Benin City'    => ['lat' => 6.3382, 'lng' => 5.6258],
        'Onitsha'       => ['lat' => 6.1498, 'lng' => 6.7857],
        'Aba'           => ['lat' => 5.1066, 'lng' => 7.3667],
        'Kaduna'        => ['lat' => 10.5105, 'lng' => 7.4165],
        'Jos'           => ['lat' => 9.8965, 'lng' => 8.8583],
        'Owerri'        => ['lat' => 5.4836, 'lng' => 7.0332],
        'Calabar'       => ['lat' => 4.9589, 'lng' => 8.3268],
        'Uyo'           => ['lat' => 5.0389, 'lng' => 7.9099],
    ];

    public function up()
    {
        $this->forge->addColumn('cities', [
            'lat' => ['type' => 'DECIMAL', 'constraint' => '10,7', 'null' => true, 'after' => 'state'],
            'lng' => ['type' => 'DECIMAL', 'constraint' => '10,7', 'null' => true, 'after' => 'lat'],
        ]);

        $builder = $this->db->table('cities');
        foreach (self::COORDS as $name => $coord) {
            $builder->where('name', $name)
                ->update(['lat' => $coord['lat'], 'lng' => $coord['lng']]);
        }
    }

    public function down()
    {
        $this->forge->dropColumn('cities', ['lat', 'lng']);
    }
}
