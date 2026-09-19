<?php

use CodeIgniter\Router\RouteCollection;

/**
 * API Routes - Multi-Vendor Bus Booking
 * All API routes are namespaced under /api.
 *
 * @var RouteCollection $routes
 */

$routes->get('/', 'Home::index');

$routes->group('api', function ($routes) {

    // CORS preflight handler: matches any OPTIONS request under /api so the
    // global CorsFilter runs and returns 204 with CORS headers.
    $routes->options('(:any)', function () {
        return service('response')->setStatusCode(204);
    });

    // ------------------------------------------------------------------
    // Public endpoints
    // Auth endpoints carry tighter per-route limits to deter brute-force
    // attempts, on top of the global limit applied to every /api route.
    $routes->post('register/customer', 'API\AuthController::registerCustomer', ['filter' => 'ratelimit:5@60']);
    $routes->post('register/vendor', 'API\AuthController::registerVendor', ['filter' => 'ratelimit:5@60']);
    $routes->post('login', 'API\AuthController::login', ['filter' => 'ratelimit:5@60']);
    $routes->post('login/2fa', 'API\AuthController::loginTwoFactor', ['filter' => 'ratelimit:5@60']);
    $routes->post('logout', 'API\AuthController::logout');

    // Password reset (public)
    $routes->post('password/forgot', 'API\AuthController::forgotPassword', ['filter' => 'ratelimit:3@60']);
    $routes->post('password/reset', 'API\AuthController::resetPassword', ['filter' => 'ratelimit:3@60']);

    // Email verification (public — accounts can't sign in until verified)
    $routes->post('email/verify', 'API\AuthController::verifyEmail', ['filter' => 'ratelimit:5@60']);
    $routes->post('email/resend', 'API\AuthController::resendVerification', ['filter' => 'ratelimit:5@60']);

    // Paystack webhook (public; authenticated by HMAC signature server-side).
    $routes->post('paystack/webhook', 'API\WebhookController::paystack');

    // Public marketing-site configuration (editable from admin settings).
    $routes->get('site-content', 'API\SiteContentController::index');

    $routes->get('cities', 'API\TripController::cities');
    $routes->get('upcoming-trips', 'API\TripController::upcoming');
    $routes->get('trips', 'API\TripController::index');
    $routes->get('trips/popular', 'API\TripController::popular');
    $routes->get('trips/(:num)', 'API\TripController::show/$1');
    $routes->get('trips/(:num)/seats', 'API\BookingController::seats/$1');

    // Terminals (public map/search data)
    $routes->get('terminals', 'API\TerminalController::index');
    $routes->get('terminals/suggestions', 'API\TerminalController::suggestions');
    $routes->get('terminals/(:num)', 'API\TerminalController::show/$1');

    // Road route geometry (public proxy to OSRM)
    $routes->get('route/road', 'API\RoadRouteController::index');

    // Offers / promotions (public promo slider)
    $routes->get('offers', 'API\OfferController::index');
    $routes->get('offers/rules', 'API\OfferController::rules');
    $routes->get('loyalty/rules', 'API\LoyaltyController::rules');

    // Referral-link shortener (public redirect to signup with ?ref=)
    $routes->get('o/(:segment)', 'API\LoyaltyController::referralRedirect/$1');

    // Published vendor reviews (public — trip/vendor pages)
    $routes->get('reviews/vendor/(:num)', 'API\ReviewController::vendor/$1');

    // ------------------------------------------------------------------
    // Authenticated (any role)
    // ------------------------------------------------------------------
    $routes->group('', ['filter' => 'auth'], function ($routes) {
        $routes->get('profile', 'API\ProfileController::show');
        $routes->put('profile', 'API\ProfileController::update');
        $routes->delete('account', 'API\ProfileController::destroy');
        $routes->post('upload', 'API\UploadController::store');

        // Two-factor authentication
        $routes->get('2fa', 'API\TwoFactorController::status');
        $routes->post('2fa/setup', 'API\TwoFactorController::setup');
        $routes->post('2fa/enable', 'API\TwoFactorController::enable');
        $routes->post('2fa/disable', 'API\TwoFactorController::disable');
        $routes->post('2fa/backup-codes', 'API\TwoFactorController::backupCodes');

        // Bookings (customer)
        $routes->post('bookings', 'API\BookingController::create');
        $routes->get('bookings', 'API\BookingController::index');
        $routes->get('bookings/(:num)', 'API\BookingController::show/$1');
        $routes->get('bookings/(:num)/ticket', 'API\BookingController::ticket/$1');
        $routes->post('bookings/(:num)/cancel', 'API\BookingController::cancel/$1');
        $routes->get('payments', 'API\BookingController::payments');
        $routes->get('payments/status/(:segment)', 'API\BookingController::paymentStatus/$1');
        $routes->post('payments/verify', 'API\BookingController::verifyPayment');

        // Wallet (customer)
        $routes->get('wallet', 'API\WalletController::index');
        $routes->post('wallet/topup', 'API\WalletController::topup');
        $routes->get('wallet/topup/status/(:segment)', 'API\WalletController::status/$1');
        $routes->post('wallet/topup/verify', 'API\WalletController::verify');

        // Loyalty (customer)
        $routes->get('loyalty/overview', 'API\LoyaltyController::overview');
        $routes->post('loyalty/redeem', 'API\LoyaltyController::redeem');

        // Support tickets (customer)
        $routes->get('support/tickets', 'API\SupportController::index');
        $routes->post('support/tickets', 'API\SupportController::create');
        $routes->get('support/tickets/(:num)', 'API\SupportController::show/$1');
        $routes->post('support/tickets/(:num)/reply', 'API\SupportController::reply/$1');
        $routes->post('support/tickets/(:num)/messages/(:num)/react', 'API\SupportController::react/$1/$2');

        // Reviews (customer)
        $routes->get('reviews', 'API\ReviewController::index');
        $routes->post('reviews', 'API\ReviewController::create');

        // BusLine Assistant (Claude helper: answers + books trips)
        $routes->post('agent/chat', 'API\AgentController::chat');

        // Voice-to-text for the AI chat mic
        $routes->post('voice/transcribe', 'API\VoiceController::transcribe');

        // Push notification token registration (any role)
        $routes->post('push/register', 'API\PushController::register');
        $routes->post('push/unregister', 'API\PushController::unregister');
    });

    // ------------------------------------------------------------------
    // Driver endpoints (vendor_staff whose staff record is a linked driver)
    // ------------------------------------------------------------------
    $routes->group('', ['filter' => ['auth', 'role:vendor_staff']], function ($routes) {
        $routes->get('driver/trips', 'API\DriverController::trips');
        $routes->get('driver/trips/(:num)', 'API\DriverController::tripDetail/$1');
    });

    // ------------------------------------------------------------------
    // Vendor endpoints (owners + staff)
    // ------------------------------------------------------------------
    $routes->group('', ['filter' => ['auth', 'role:vendor,vendor_staff']], function ($routes) {
        $routes->get('vendor/dashboard', 'API\VendorController::dashboard');
        $routes->put('vendor/profile', 'API\VendorController::updateProfile');
        $routes->get('vendor/cities', 'API\VendorController::cities');
        $routes->get('vendor/bus-categories', 'API\VendorController::busCategories');
        $routes->get('vendor/seat-layout-templates', 'API\VendorController::seatLayoutTemplates');
        $routes->get('vendor/terminals', 'API\VendorController::terminals');
        $routes->get('vendor/terminals/all', 'API\VendorController::allTerminals');
        $routes->post('vendor/terminals', 'API\VendorController::createTerminal');
        $routes->put('vendor/terminals', 'API\VendorController::updateTerminals');

        // Buses + fleet + seats
        $routes->get('vendor/buses', 'API\VendorController::buses');
        $routes->post('vendor/buses', 'API\VendorController::createBus');
        $routes->put('vendor/buses/(:num)', 'API\VendorController::updateBus/$1');
        $routes->delete('vendor/buses/(:num)', 'API\VendorController::deleteBus/$1');
        $routes->get('vendor/buses/(:num)', 'API\VendorController::busDetail/$1');
        $routes->put('vendor/buses/(:num)/fleet', 'API\VendorController::updateBusFleet/$1');
        $routes->get('vendor/buses/(:num)/seats', 'API\Vendor\SeatController::busSeats/$1');
        $routes->post('vendor/buses/(:num)/seats/generate', 'API\Vendor\SeatController::regenerate/$1');

        // Routes + stops
        $routes->get('vendor/routes', 'API\VendorController::routes');
        $routes->post('vendor/routes', 'API\VendorController::createRoute');
        $routes->put('vendor/routes/(:num)', 'API\VendorController::updateRoute/$1');
        $routes->delete('vendor/routes/(:num)', 'API\VendorController::deleteRoute/$1');
        $routes->get('vendor/routes/(:num)', 'API\VendorController::routeDetail/$1');
        $routes->get('vendor/routes/(:num)/stops', 'API\VendorController::routeStops/$1');
        $routes->put('vendor/routes/(:num)/stops', 'API\VendorController::updateRouteStops/$1');

        // Trips + drivers + recurrence + availability
        $routes->get('vendor/trips', 'API\VendorController::trips');
        $routes->post('vendor/trips', 'API\VendorController::createTrip');
        $routes->get('vendor/trips/(:num)', 'API\VendorController::tripDetail/$1');
        $routes->put('vendor/trips/(:num)', 'API\VendorController::updateTrip/$1');
        $routes->delete('vendor/trips/(:num)', 'API\VendorController::deleteTrip/$1');
        $routes->get('vendor/trips/(:num)/drivers', 'API\VendorController::tripDrivers/$1');
        $routes->put('vendor/trips/(:num)/drivers', 'API\VendorController::updateTripDrivers/$1');
        $routes->put('vendor/trips/(:num)/recurrence', 'API\VendorController::updateTripRecurrence/$1');
        $routes->post('vendor/trips/(:num)/availability', 'API\VendorController::refreshTripAvailability/$1');

        // Bookings + tickets
        $routes->get('vendor/bookings', 'API\VendorController::bookings');
        $routes->post('vendor/bookings', 'API\VendorController::createBooking');
        $routes->get('vendor/bookings/(:num)', 'API\VendorController::bookingDetail/$1');
        $routes->put('vendor/bookings/(:num)/seats', 'API\VendorController::updateBookingSeats/$1');
        $routes->post('vendor/bookings/(:num)/confirm', 'API\VendorController::confirmBooking/$1');
        $routes->post('vendor/bookings/(:num)/cancel', 'API\VendorController::cancelBooking/$1');
        $routes->post('vendor/bookings/(:num)/refund', 'API\VendorController::refundBooking/$1');
        $routes->post('vendor/bookings/(:num)/reschedule', 'API\VendorController::rescheduleBooking/$1');
        $routes->post('vendor/tickets/validate', 'API\VendorController::validateTicket');
        $routes->post('vendor/bookings/(:num)/checkin', 'API\VendorController::checkin/$1');

        // Revenue / wallet / finance
        $routes->get('vendor/revenue', 'API\VendorController::revenue');
        $routes->get('vendor/wallet', 'API\VendorController::wallet');
        $routes->post('vendor/withdrawals', 'API\VendorController::createWithdrawal');
        $routes->get('vendor/withdrawals', 'API\Vendor\FinanceController::withdrawals');
        $routes->get('vendor/payment-accounts', 'API\Vendor\FinanceController::accounts');
        $routes->post('vendor/payment-accounts', 'API\Vendor\FinanceController::createAccount');
        $routes->put('vendor/payment-accounts/(:num)', 'API\Vendor\FinanceController::updateAccount/$1');
        $routes->delete('vendor/payment-accounts/(:num)', 'API\Vendor\FinanceController::deleteAccount/$1');
        $routes->get('vendor/finance/transactions', 'API\Vendor\FinanceController::transactions');

        // Expenses (profit = revenue - expenses)
        $routes->get('vendor/expenses', 'API\Vendor\ExpenseController::index');
        $routes->get('vendor/expenses/summary', 'API\Vendor\ExpenseController::summary');
        $routes->post('vendor/expenses', 'API\Vendor\ExpenseController::create');
        $routes->put('vendor/expenses/(:num)', 'API\Vendor\ExpenseController::update/$1');
        $routes->delete('vendor/expenses/(:num)', 'API\Vendor\ExpenseController::delete/$1');

        // Drivers
        $routes->get('vendor/drivers', 'API\Vendor\DriverController::index');
        $routes->get('vendor/drivers/available', 'API\Vendor\DriverController::available');
        $routes->get('vendor/drivers/staff-options', 'API\Vendor\DriverController::staffOptions');
        $routes->post('vendor/drivers', 'API\Vendor\DriverController::create');
        $routes->put('vendor/drivers/(:num)', 'API\Vendor\DriverController::update/$1');
        $routes->delete('vendor/drivers/(:num)', 'API\Vendor\DriverController::delete/$1');

        // Passengers
        $routes->get('vendor/passengers', 'API\Vendor\PassengerController::index');
        $routes->get('vendor/passengers/(:num)', 'API\Vendor\PassengerController::show/$1');

        // Reviews (vendor management)
        $routes->get('vendor/reviews', 'API\Vendor\ReviewController::index');
        $routes->get('vendor/reviews/summary', 'API\Vendor\ReviewController::summary');
        $routes->put('vendor/reviews/(:num)/reply', 'API\Vendor\ReviewController::reply/$1');
        $routes->put('vendor/reviews/(:num)/status', 'API\Vendor\ReviewController::updateStatus/$1');

        // Notifications
        $routes->get('vendor/notifications', 'API\Vendor\NotificationController::index');
        $routes->get('vendor/notifications/unread', 'API\Vendor\NotificationController::unread');
        $routes->put('vendor/notifications/read-all', 'API\Vendor\NotificationController::markAllRead');
        $routes->put('vendor/notifications/(:num)/read', 'API\Vendor\NotificationController::markRead/$1');

        // Staff
        $routes->get('vendor/staff', 'API\Vendor\StaffController::index');
        $routes->get('vendor/staff/permissions', 'API\Vendor\StaffController::permissions');
        $routes->post('vendor/staff', 'API\Vendor\StaffController::create');
        $routes->put('vendor/staff/(:num)', 'API\Vendor\StaffController::update/$1');
        $routes->delete('vendor/staff/(:num)', 'API\Vendor\StaffController::delete/$1');

        // Staff self-service (own payment history + receipts)
        $routes->get('vendor/my/payments', 'API\Vendor\StaffPaymentsController::index');
        $routes->get('vendor/my/payments/(:num)', 'API\Vendor\StaffPaymentsController::show/$1');

        // HR (staff directory, payroll, leave, attendance)
        $routes->get('vendor/hr/overview', 'API\Vendor\HRController::overview');
        $routes->get('vendor/hr/staff', 'API\Vendor\HRController::staffDirectory');
        $routes->get('vendor/hr/payroll', 'API\Vendor\HRController::payroll');
        $routes->post('vendor/hr/payroll', 'API\Vendor\HRController::createPayroll');
        $routes->post('vendor/hr/payroll/pay', 'API\Vendor\HRController::paySalary');
        $routes->get('vendor/hr/payroll/runs', 'API\Vendor\HRController::payrollRuns');
        $routes->post('vendor/hr/payroll/runs/generate', 'API\Vendor\HRController::generatePayrollRun');
        $routes->get('vendor/hr/payroll/runs/(:num)', 'API\Vendor\HRController::payrollRun/$1');
        $routes->post('vendor/hr/payroll/runs/(:num)/approve', 'API\Vendor\HRController::approvePayrollRun/$1');
        $routes->post('vendor/hr/payroll/runs/(:num)/pay', 'API\Vendor\HRController::payPayrollRun/$1');
        $routes->post('vendor/hr/payroll/runs/(:num)/cancel', 'API\Vendor\HRController::cancelPayrollRun/$1');
        $routes->put('vendor/hr/payroll/(:num)', 'API\Vendor\HRController::updatePayroll/$1');
        $routes->post('vendor/hr/payroll/(:num)/mark-paid', 'API\Vendor\HRController::markPaid/$1');
        $routes->delete('vendor/hr/payroll/(:num)', 'API\Vendor\HRController::deletePayroll/$1');
        $routes->get('vendor/hr/leaves', 'API\Vendor\HRController::leaves');
        $routes->post('vendor/hr/leaves', 'API\Vendor\HRController::createLeave');
        $routes->put('vendor/hr/leaves/(:num)', 'API\Vendor\HRController::updateLeave/$1');
        $routes->put('vendor/hr/leaves/(:num)/status', 'API\Vendor\HRController::leaveStatus/$1');
        $routes->delete('vendor/hr/leaves/(:num)', 'API\Vendor\HRController::deleteLeave/$1');
        $routes->get('vendor/hr/attendance', 'API\Vendor\HRController::attendance');
        $routes->post('vendor/hr/attendance', 'API\Vendor\HRController::saveAttendance');
        $routes->put('vendor/hr/attendance/(:num)', 'API\Vendor\HRController::updateAttendance/$1');
        $routes->delete('vendor/hr/attendance/(:num)', 'API\Vendor\HRController::deleteAttendance/$1');

        // Security
        $routes->get('vendor/security/login-history', 'API\Vendor\SecurityController::loginHistory');
        $routes->get('vendor/security/sessions', 'API\Vendor\SecurityController::sessions');
        $routes->post('vendor/security/sessions/revoke', 'API\Vendor\SecurityController::revokeSession');
        $routes->post('vendor/security/logout-all', 'API\Vendor\SecurityController::logoutAll');
        $routes->get('vendor/security/audit-log', 'API\Vendor\SecurityController::auditLog');

        // Analytics
        $routes->get('vendor/analytics', 'API\Vendor\AnalyticsController::index');

        // Promotions
        $routes->get('vendor/promotions', 'API\Vendor\PromoController::index');
        $routes->post('vendor/promotions', 'API\Vendor\PromoController::create');
        $routes->put('vendor/promotions/(:num)', 'API\Vendor\PromoController::update/$1');
        $routes->delete('vendor/promotions/(:num)', 'API\Vendor\PromoController::delete/$1');
        $routes->post('vendor/promotions/generate-code', 'API\Vendor\PromoController::generateCode');
    });

    // ------------------------------------------------------------------
    // Admin endpoints
    // ------------------------------------------------------------------
    $routes->group('', ['filter' => ['auth', 'role:super_admin']], function ($routes) {
        $routes->get('admin/dashboard', 'API\AdminController::dashboard');
        $routes->get('admin/vendors', 'API\AdminController::vendors');
        $routes->post('admin/vendors', 'API\AdminController::createVendor');
        $routes->put('admin/vendors/(:num)/approve', 'API\AdminController::approveVendor/$1');
        $routes->put('admin/vendors/(:num)', 'API\AdminController::updateVendor/$1');
        $routes->put('admin/vendors/(:num)/toggle', 'API\AdminController::toggleVendor/$1');
        $routes->delete('admin/vendors/(:num)', 'API\AdminController::deleteVendor/$1');
        $routes->post('admin/vendors/(:num)/impersonate', 'API\AdminController::impersonateVendor/$1');

        $routes->get('admin/terminals', 'API\AdminController::terminals');
        $routes->post('admin/terminals', 'API\AdminController::createTerminal');
        $routes->put('admin/terminals/(:num)', 'API\AdminController::updateTerminal/$1');
        $routes->delete('admin/terminals/(:num)', 'API\AdminController::deleteTerminal/$1');

        $routes->get('admin/bookings', 'API\AdminController::bookings');
        $routes->get('admin/customers', 'API\AdminController::customers');
        $routes->get('admin/roles', 'API\AdminController::roles');
        $routes->get('admin/users', 'API\AdminController::users');
        $routes->get('admin/users/(:num)', 'API\AdminController::userDetail/$1');
        $routes->post('admin/users', 'API\AdminController::createUser');
        $routes->put('admin/users/(:num)', 'API\AdminController::updateUser/$1');
        $routes->put('admin/users/(:num)/toggle', 'API\AdminController::toggleUser/$1');
        $routes->put('admin/users/(:num)/details', 'API\AdminController::updateUserDetails/$1');
        $routes->post('admin/users/(:num)/wallet/adjust', 'API\AdminController::adjustUserWallet/$1');
        $routes->delete('admin/users/(:num)', 'API\AdminController::deleteUser/$1');
        $routes->get('admin/routes', 'API\AdminController::routes');

        $routes->get('admin/trips', 'API\AdminController::trips');
        $routes->get('admin/trips/(:num)', 'API\AdminController::tripDetail/$1');
        $routes->put('admin/trips/(:num)/drivers', 'API\AdminController::updateTripDrivers/$1');
        $routes->get('admin/drivers', 'API\AdminController::drivers');

        $routes->get('admin/cities', 'API\AdminController::cities');
        $routes->post('admin/cities', 'API\AdminController::createCity');
        $routes->put('admin/cities/(:num)', 'API\AdminController::updateCity/$1');
        $routes->delete('admin/cities/(:num)', 'API\AdminController::deleteCity/$1');

        $routes->get('admin/bus-categories', 'API\AdminController::busCategories');
        $routes->post('admin/bus-categories', 'API\AdminController::createBusCategory');
        $routes->put('admin/bus-categories/(:num)', 'API\AdminController::updateBusCategory/$1');
        $routes->delete('admin/bus-categories/(:num)', 'API\AdminController::deleteBusCategory/$1');

        $routes->get('admin/offers', 'API\AdminController::offers');
        $routes->post('admin/offers', 'API\AdminController::createOffer');
        $routes->put('admin/offers/(:num)', 'API\AdminController::updateOffer/$1');
        $routes->delete('admin/offers/(:num)', 'API\AdminController::deleteOffer/$1');

        $routes->get('admin/seat-layout-templates', 'API\AdminController::seatLayoutTemplates');
        $routes->post('admin/seat-layout-templates', 'API\AdminController::createSeatLayoutTemplate');
        $routes->put('admin/seat-layout-templates/(:num)', 'API\AdminController::updateSeatLayoutTemplate/$1');
        $routes->delete('admin/seat-layout-templates/(:num)', 'API\AdminController::deleteSeatLayoutTemplate/$1');

        $routes->get('admin/transactions', 'API\AdminController::transactions');
        $routes->get('admin/reports', 'API\AdminController::reports');
        $routes->get('admin/settings', 'API\AdminController::settings');
        $routes->put('admin/settings', 'API\AdminController::updateSettings');

        $routes->get('admin/withdrawals', 'API\AdminController::withdrawals');
        $routes->put('admin/withdrawals/(:num)/approve', 'API\AdminController::approveWithdrawal/$1');
        $routes->put('admin/withdrawals/(:num)/reject', 'API\AdminController::rejectWithdrawal/$1');

        // Push notifications (admin broadcast)
        $routes->post('admin/notifications/send', 'API\AdminController::sendNotification');
        $routes->get('admin/notifications/stats', 'API\AdminController::notificationStats');

        // Admin activity feed (real-time website activity for the admin bell)
        $routes->get('admin/activities/recent', 'API\AdminController::activities');
        $routes->get('admin/activities/unread', 'API\AdminController::activityUnread');
        $routes->post('admin/activities/read-all', 'API\AdminController::activityReadAll');

        // Support tickets (admin)
        $routes->get('admin/tickets', 'API\AdminSupportController::index');
        $routes->get('admin/tickets/(:num)', 'API\AdminSupportController::show/$1');
        $routes->post('admin/tickets/(:num)/reply', 'API\AdminSupportController::reply/$1');
        $routes->post('admin/tickets/(:num)/messages/(:num)/react', 'API\AdminSupportController::react/$1/$2');
        $routes->put('admin/tickets/(:num)', 'API\AdminSupportController::update/$1');
    });

    // 404 fallback for unknown API routes.
    $routes->get('(:any)', function () {
        return api_error('API route not found.', 404);
    });
});
