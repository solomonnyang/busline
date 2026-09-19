<?php

namespace App\Controllers\API;

use App\Models\SettingModel;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * SiteContentController
 *
 * Public marketing-site configuration endpoint. Every field is optional and
 * merges stored settings (group `site`) over sensible defaults so the website
 * stays editable from the admin backend without hard-coding content.
 */
class SiteContentController extends BaseApiController
{
    public function index(): ResponseInterface
    {
        $model = model(SettingModel::class);

        $s = static function (string $key, $default = null) use ($model) {
            $value = $model->getValue($key, 'site');
            return $value !== null ? $value : $default;
        };

        $content = [
            'brand' => [
                'name'        => $s('brand_name', 'BusLine'),
                'tagline'     => $s('brand_tagline', 'Your journey starts with our app.'),
                'logo'        => $s('brand_logo', ''),
            ],

            'hero' => [
                'title'        => $s('hero_title', 'Your Journey Starts With Our App.'),
                'subtitle'     => $s(
                    'hero_subtitle',
                    'Discover a smarter and more convenient way to travel. Download our mobile app to explore routes, discover transportation options, and manage your journeys from your phone.'
                ),
                'primary_cta'  => $s('hero_primary_cta', 'Download the App'),
                'secondary_cta'=> $s('hero_secondary_cta', 'Become a Vendor'),
                'image'        => $s('hero_image', ''),
            ],

            'app' => [
                'title'            => $s('app_title', 'Everything You Need, Right in Your Pocket'),
                'subtitle'         => $s('app_subtitle', 'Book trips, explore destinations and manage your travel — all from one secure app.'),
                'ios_url'          => $s('app_ios_url', ''),
                'android_url'      => $s('app_android_url', ''),
                'download_page_url'=> $s('app_download_page_url', '/download'),
                'qr_image'         => $s('app_qr_image', ''),
                'features'         => $s(
                    'app_features',
                    [
                        'Discover transportation options',
                        'Explore destinations',
                        'View available routes',
                        'Manage your trips',
                        'Access travel services',
                        'Receive notifications',
                        'Secure and convenient experience',
                    ]
                ),
            ],

            'how_it_works' => $s('how_it_works', [
                ['title' => 'Download', 'text' => 'Get the mobile app from the App Store or Google Play.'],
                ['title' => 'Create Your Account', 'text' => 'Register directly inside the mobile app.'],
                ['title' => 'Explore', 'text' => 'Discover transportation services, routes, destinations and more.'],
                ['title' => 'Travel', 'text' => 'Use the app to manage your whole travel experience.'],
            ]),

            'services' => $s('services', [
                [
                    'title'        => 'Bus & Transportation',
                    'text'         => 'Discover transportation options and routes through the mobile application.',
                    'image'        => '',
                ],
                [
                    'title'        => 'Explore Destinations',
                    'text'         => 'Discover interesting places, destinations, restaurants, hotels, and attractions.',
                    'image'        => '',
                ],
                [
                    'title'        => 'Travel Services',
                    'text'         => 'Access additional services designed to make travelling easier.',
                    'image'        => '',
                ],
                [
                    'title'        => 'Vendor Marketplace',
                    'text'         => 'Let businesses and transportation operators showcase their services on the platform.',
                    'image'        => '',
                ],
            ]),

            'vendor' => [
                'title'    => $s('vendor_title', 'Grow Your Business With Us'),
                'subtitle' => $s(
                    'vendor_subtitle',
                    'Join our growing network of transportation operators and travel businesses. Reach more customers and manage your services through our vendor platform.'
                ),
                'cta'      => $s('vendor_cta', 'Become a Vendor'),
                'benefits' => $s('vendor_benefits', [
                    'Reach more customers',
                    'Manage your services',
                    'Manage bookings / orders',
                    'Manage availability',
                    'Track performance',
                    'Receive notifications',
                    'Business dashboard',
                    'Revenue analytics',
                ]),
            ],

            'about' => [
                'title'    => $s('about_title', 'We are the future of travel'),
                'subtitle' => $s('about_subtitle', 'A modern transportation technology company building a simpler way to move around Nigeria.'),
                'vision'   => $s('about_vision', 'To make travel simple, secure, and accessible for everyone.'),
                'mission'  => $s(
                    'about_mission',
                    'To connect travellers with reliable transport and travel services through one secure app.'
                ),
                'body'     => $s(
                    'about_body',
                    'We are a trust-driven platform connecting passengers with verified transportation operators and travel businesses. Millions of journeys are powered daily by our app, and we are just getting started.'
                ),
            ],

            'stats' => $s('stats', [
                ['label' => 'App Users',   'value' => 50000, 'suffix' => '+'],
                ['label' => 'Transport Partners', 'value' => 500, 'suffix' => '+'],
                ['label' => 'Destinations', 'value' => 100,  'suffix' => '+'],
                ['label' => 'Platform Availability', 'value' => 24, 'suffix' => '/7'],
            ]),

            'testimonials' => $s('testimonials', [
                [
                    'name'      => 'Ada Obi',
                    'role'      => 'Frequent traveller',
                    'text'      => 'Booking trips from my phone has never been easier. The app is fast, secure, and reliable.',
                    'avatar'    => '',
                ],
                [
                    'name'      => 'Chinedu Eze',
                    'role'      => 'Transport partner',
                    'text'      => 'The vendor dashboard gives my fleet everything it needs to reach more customers and grow.',
                    'avatar'    => '',
                ],
                [
                    'name'      => 'Fatima Bello',
                    'role'      => 'Traveller',
                    'text'      => 'I love how I can explore destinations and manage my whole trip in one place.',
                    'avatar'    => '',
                ],
            ]),

            'faqs' => $s('faqs', [
                ['q' => 'How do I use the platform?', 'a' => 'Everything happens in the mobile app. Download BusLine, create your account, and explore routes and services from your phone.'],
                ['q' => 'Where can I download the app?', 'a' => 'BusLine is available on the App Store for iPhone and Google Play for Android. Tap the download links on this website.'],
                ['q' => 'Can I book directly from the website?', 'a' => 'No. Bookings and customer services are handled through the mobile application. The website introduces the platform and helps vendors manage their business.'],
                ['q' => 'How do I become a vendor?', 'a' => 'Click "Become a Vendor" to register your business. Once approved, you can manage your services and bookings from your vendor dashboard.'],
                ['q' => 'How do vendors manage their businesses?', 'a' => 'Vendors sign in to the vendor dashboard to manage services, availability, bookings, performance, and revenue.'],
                ['q' => 'Is the app available on Android?', 'a' => 'Yes. The BusLine app is available on Google Play for Android devices.'],
                ['q' => 'Is the app available on iPhone?', 'a' => 'Yes. The BusLine app is available on the Apple App Store for iPhones.'],
                ['q' => 'How do I contact support?', 'a' => 'Reach our support team using the contact details on this website, or use the in-app help feature.'],
            ]),

            'contact' => [
                'phone'    => $s('contact_phone', '+234 800 000 0000'),
                'email'    => $s('contact_email', 'support@busline.com'),
                'address'  => $s('contact_address', 'Lagos, Nigeria'),
                'support'  => $s('contact_support', 'We are available 24/7 to help you.'),
                'social'   => $s('contact_social', [
                    'facebook'  => '',
                    'twitter'   => '',
                    'instagram' => '',
                    'linkedin'  => '',
                    'youtube'   => '',
                ]),
            ],

            'download_ctas' => $s('download_ctas', [
                ['label' => 'Download the App', 'url' => '/download'],
                ['label' => 'Explore More on the App', 'url' => '/download'],
                ['label' => 'Get Started With the App', 'url' => '/download'],
                ['label' => 'Download Our App', 'url' => '/download'],
            ]),
        ];

        return api_success($content);
    }
}