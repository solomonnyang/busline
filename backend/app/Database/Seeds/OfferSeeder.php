<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

/**
 * Seeds the default promotional offers shown in the customer promo slider:
 * loyalty program (formerly "Student saver"), early bird, and refer & earn.
 */
class OfferSeeder extends Seeder
{
    public function run()
    {
        $db = \Config\Database::connect();
        $now = date('Y-m-d H:i:s');

        if ($db->table('offers')->countAllResults() > 0) {
            echo "Offers already seeded; skipping.\n";
            return;
        }

        $offers = [
            [
                'code'           => 'STUDENT10',
                'title'          => 'Loyalty program',
                'description'    => '10% off every seat with your loyalty code.',
                'badge'          => 'Loyalty',
                'discount_type'  => 'percent',
                'discount_value' => 10,
                'icon'           => 'school-outline',
                'color'          => '#3B82F6',
                'soft'           => '#E4EEFD',
                'image'          => null,
            ],
            [
                'code'           => 'EARLY15',
                'title'          => 'Early bird',
                'description'    => 'Book 3+ days ahead and save up to 15%.',
                'badge'          => 'Seasonal',
                'discount_type'  => 'percent',
                'discount_value' => 15,
                'icon'           => 'sunny-outline',
                'color'          => '#E8598C',
                'soft'           => '#FBE6EF',
                'image'          => null,
            ],
            [
                'code'           => 'FRIEND2K',
                'title'          => 'Refer & earn',
                'description'    => 'Invite a friend and earn ₦2,000 in credit.',
                'badge'          => 'Referral',
                'discount_type'  => 'fixed',
                'discount_value' => 2000,
                'icon'           => 'gift-outline',
                'color'          => '#7C6BE0',
                'soft'           => '#EFEDFB',
                'image'          => null,
            ],
        ];

        foreach ($offers as $offer) {
            $db->table('offers')->insert(array_merge($offer, [
                'is_active'  => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ]));
        }

        echo 'Seeded ' . count($offers) . " offers.\n";
    }
}
