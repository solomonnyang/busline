<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

/**
 * Seeds default system settings.
 */
class SettingSeeder extends Seeder
{
    public function run()
    {
        $settings = [
            ['group' => 'general', 'key' => 'site_name', 'value' => 'BusLine', 'is_json' => 0],
            ['group' => 'general', 'key' => 'currency', 'value' => 'NGN', 'is_json' => 0],
            ['group' => 'general', 'key' => 'currency_symbol', 'value' => '₦', 'is_json' => 0],
            ['group' => 'general', 'key' => 'booking_prefix', 'value' => 'BL', 'is_json' => 0],
            ['group' => 'payment', 'key' => 'paystack_public_key', 'value' => '', 'is_json' => 0],
            ['group' => 'payment', 'key' => 'paystack_secret_key', 'value' => '', 'is_json' => 0],
            ['group' => 'payment', 'key' => 'default_method', 'value' => 'cash', 'is_json' => 0],
            ['group' => 'booking', 'key' => 'max_seats_per_booking', 'value' => '10', 'is_json' => 0],
            ['group' => 'booking', 'key' => 'allow_checkin_before_hours', 'value' => '2', 'is_json' => 0],
            ['group' => 'loyalty', 'key' => 'points_per_booking', 'value' => '10', 'is_json' => 0],
            ['group' => 'loyalty', 'key' => 'points_value_ngn', 'value' => '1.00', 'is_json' => 0],
            ['group' => 'loyalty', 'key' => 'min_points_redeem', 'value' => '10', 'is_json' => 0],
            ['group' => 'early_bird', 'key' => 'early_bird_days', 'value' => '3', 'is_json' => 0],
            ['group' => 'early_bird', 'key' => 'early_bird_percent', 'value' => '15', 'is_json' => 0],
            ['group' => 'referral', 'key' => 'commission_percent', 'value' => '10', 'is_json' => 0],
            ['group' => 'referral', 'key' => 'signup_url', 'value' => 'http://localhost:5173', 'is_json' => 0],
        ];

        $builder = $this->db->table('settings');
        foreach ($settings as $setting) {
            $exists = $builder
                ->where('group', $setting['group'])
                ->where('key', $setting['key'])
                ->countAllResults();
            if ($exists === 0) {
                $setting['created_at'] = date('Y-m-d H:i:s');
                $setting['updated_at'] = date('Y-m-d H:i:s');
                $builder->insert($setting);
            }
        }

        echo count($settings) . " settings seeded.\n";
    }
}
