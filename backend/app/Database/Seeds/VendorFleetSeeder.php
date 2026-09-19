<?php

namespace App\Database\Seeds;

use App\Models\BusModel;
use App\Models\RouteModel;
use App\Models\SeatModel;
use App\Models\TripModel;
use App\Models\VendorModel;
use CodeIgniter\Database\Seeder;

/**
 * Seeds a demo fleet: 10 vendors, one per terminal, each with
 * buses (and seats), a route and scheduled trips.
 *
 * Vendor accounts log in with: vendorN@busline.ng / password123
 */
class VendorFleetSeeder extends Seeder
{
    public function run()
    {
        $db = \Config\Database::connect();

        $existing = $db->table('vendors')->countAllResults();
        if ($existing > 0) {
            echo "Vendors already exist ({$existing}). Skipping VendorFleetSeeder.\n";
            return;
        }

        $vendorRole = $db->table('roles')->where('slug', 'vendor')->get()->getRow();
        if (! $vendorRole) {
            echo "Vendor role not found. Run RoleSeeder first.\n";
            return;
        }

        $password = password_hash('password123', PASSWORD_DEFAULT);
        $now      = date('Y-m-d H:i:s');
        $days     = ['+1 day', '+2 days', '+3 days', '+4 days', '+5 days'];

        $fleet = [
            // terminal_id, company, short, city, origin, destination, distance_km, minutes, price
            [1, 'Lagos Luxury Lines', 'LLL', 'Lagos', 1, 2, 600, 660, 15000],
            [4, 'Abuja Star Motors',  'ASM', 'Abuja', 2, 1, 600, 660, 15000],
            [7, 'Niger Delta Express','NDE', 'Port Harcourt', 3, 1, 640, 780, 18000],
            [9, 'Western Link Motors', 'WLM', 'Ibadan', 4, 1, 145, 180, 5000],
            [11, 'Arewa Transit Co',   'ATC', 'Kano', 5, 2, 380, 420, 12000],
            [13, 'Coal City Travels',  'CCT', 'Enugu', 6, 1, 480, 600, 14000],
            [15, 'Edo Cross Line',     'ECL', 'Benin City', 7, 1, 310, 360, 10000],
            [17, 'Anambra Express',    'AEX', 'Onitsha', 8, 1, 430, 540, 13000],
            [20, 'Aba Metro Motors',   'ABA', 'Aba', 9, 2, 580, 660, 16000],
            [21, 'Kaduna Intercity',   'KIC', 'Kaduna', 10, 1, 780, 840, 22000],
        ];

        $busTypes  = ['standard', 'luxury', 'vip', 'executive'];
        $busIndex  = 1;

        foreach ($fleet as $i => [$terminalId, $company, $short, $city, $origin, $destination, $km, $mins, $price]) {
            $n = $i + 1;

            $userId = $db->table('users')->insert([
                'name'       => $company,
                'email'      => "vendor{$n}@busline.ng",
                'phone'      => "080100000{$n}",
                'password'   => $password,
                'role_id'    => $vendorRole->id,
                'is_active'  => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $userId = $db->insertID();

            $vendorId = model(VendorModel::class)->insert([
                'user_id'         => $userId,
                'terminal_id'     => $terminalId,
                'company_name'    => $company,
                'company_email'   => "vendor{$n}@busline.ng",
                'company_phone'   => "080100000{$n}",
                'address'         => "Main Terminal, {$city}",
                'city'            => $city,
                'country'         => 'Nigeria',
                'description'     => "Intercity bus services from {$city}.",
                'approval_status' => 'approved',
                'approved_by'     => 1,
                'approved_at'     => $now,
            ]);
            model(VendorModel::class)->syncTerminals($vendorId, [$terminalId]);

            $busIds = [];
            foreach ([0, 1] as $k) {
                $totalSeats = $k === 0 ? 30 : 24;
                $busId = model(BusModel::class)->insert([
                    'vendor_id'           => $vendorId,
                    'terminal_id'         => $terminalId,
                    'bus_name'            => "{$short}-Bus-" . ($k + 1),
                    'registration_number' => sprintf('%s-%03d', $short, $busIndex),
                    'bus_type'            => $busTypes[$k],
                    'total_seats'         => $totalSeats,
                    'seat_layout'         => null,
                    'status'              => 'active',
                ]);
                model(SeatModel::class)->generateSeats($busId, $totalSeats, null);
                $busIds[] = $busId;
                $busIndex++;
            }

            $routeId = model(RouteModel::class)->insert([
                'vendor_id'           => $vendorId,
                'origin_city_id'      => $origin,
                'destination_city_id' => $destination,
                'distance_km'         => $km,
                'estimated_duration'  => $mins,
                'status'              => 'active',
            ]);

            foreach ($busIds as $b => $busId) {
                $departure = date('H:i:s', strtotime(($b === 0 ? '06:00' : '09:00')));
                $arrival   = date('H:i:s', strtotime($departure) + $mins * 60);
                model(TripModel::class)->insert([
                    'vendor_id'       => $vendorId,
                    'bus_id'          => $busId,
                    'route_id'        => $routeId,
                    'departure_date'  => date('Y-m-d', strtotime($days[($i + $b) % 5])),
                    'departure_time'  => $departure,
                    'arrival_time'    => $arrival,
                    'price'           => $price,
                    'available_seats' => $b === 0 ? 30 : 24,
                    'status'          => 'scheduled',
                ]);
            }

            echo "Seeded vendor {$n}: {$company} @ terminal {$terminalId} ({$city}) — 2 buses, route {$origin}->{$destination}, 2 trips\n";
        }
    }
}
