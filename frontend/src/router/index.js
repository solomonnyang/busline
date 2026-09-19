import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

/**
 * Router configuration with role-based route guards.
 * Public pages nest under DefaultLayout; dashboard areas nest
 * under DashboardLayout.
 */
const routes = [
  // Public
  {
    path: '/',
    component: () => import('../layouts/DefaultLayout.vue'),
    children: [
      { path: '', name: 'home', component: () => import('../views/public/Home.vue'), meta: { public: true } },
      { path: 'about', name: 'about', component: () => import('../views/public/About.vue'), meta: { public: true } },
      { path: 'download', name: 'download', component: () => import('../views/public/Download.vue'), meta: { public: true } },
      { path: 'privacy-policy', name: 'privacy-policy', component: () => import('../views/public/LegalPage.vue'), props: { type: 'privacy' }, meta: { public: true } },
      { path: 'terms-and-conditions', name: 'terms', component: () => import('../views/public/LegalPage.vue'), props: { type: 'terms' }, meta: { public: true } },
      { path: 'cookie-policy', name: 'cookie-policy', component: () => import('../views/public/LegalPage.vue'), props: { type: 'cookie' }, meta: { public: true } },
      { path: 'vendor-login', name: 'vendor-login', component: () => import('../views/public/VendorLogin.vue'), meta: { guest: true } },
      { path: 'admin-login', name: 'admin-login', component: () => import('../views/public/AdminLogin.vue'), meta: { guest: true } },
      { path: 'vendor-register', name: 'vendor-register', component: () => import('../views/public/VendorRegister.vue'), meta: { guest: true } },
      { path: 'login', redirect: '/vendor-login' },
      { path: 'register', redirect: '/vendor-register' },
      { path: 'forgot-password', name: 'forgot-password', component: () => import('../views/public/ForgotPassword.vue'), meta: { guest: true } },
      { path: 'reset-password', name: 'reset-password', component: () => import('../views/public/ResetPassword.vue'), meta: { guest: true } },
      { path: 'verify-email', name: 'verify-email', component: () => import('../views/public/VerifyEmail.vue'), meta: { guest: true } },
      { path: 'payment/callback', name: 'payment-callback', component: () => import('../views/public/PaymentCallback.vue'), meta: { public: true } },
      { path: ':pathMatch(.*)*', name: 'not-found', component: () => import('../views/public/NotFound.vue'), meta: { public: true } },
    ],
  },

  // Customer
  {
    path: '/customer',
    component: () => import('../layouts/DashboardLayout.vue'),
    meta: { requiresAuth: true, roles: ['customer'] },
    children: [
      { path: '', redirect: '/customer/dashboard' },
      { path: 'dashboard', name: 'customer.dashboard', component: () => import('../views/customer/Dashboard.vue') },
      { path: 'trips/:id/book', name: 'customer.book', component: () => import('../views/customer/Booking.vue') },
      { path: 'bookings', name: 'customer.bookings', component: () => import('../views/customer/MyBookings.vue') },
      { path: 'bookings/:id', name: 'customer.ticket', component: () => import('../views/customer/TicketDetails.vue') },
      { path: 'offers', name: 'customer.offers', component: () => import('../views/customer/Offers.vue') },
      { path: 'profile', name: 'customer.profile', component: () => import('../views/customer/Profile.vue') },
      { path: 'payment', name: 'customer.payment', component: () => import('../views/customer/Payment.vue') },
      { path: 'support', name: 'customer.support', component: () => import('../views/customer/Support.vue') },
      { path: 'settings', name: 'customer.settings', component: () => import('../views/customer/Settings.vue') },
    ],
  },

  // Vendor (bus booking)
  {
    path: '/vendor',
    component: () => import('../layouts/DashboardLayout.vue'),
    meta: { requiresAuth: true, roles: ['vendor', 'vendor_staff'] },
    children: [
      { path: '', redirect: '/vendor/dashboard' },
      { path: 'dashboard', name: 'vendor.dashboard', component: () => import('../views/vendor/Dashboard.vue') },
      { path: 'buses', name: 'vendor.buses', component: () => import('../views/vendor/Buses.vue'), meta: { permissions: ['buses.manage'] } },
      { path: 'terminals', name: 'vendor.terminals', component: () => import('../views/vendor/Terminals.vue'), meta: { permissions: ['buses.manage'] } },
      { path: 'drivers', name: 'vendor.drivers', component: () => import('../views/vendor/Drivers.vue'), meta: { permissions: ['drivers.manage'] } },
      { path: 'staff', name: 'vendor.staff', component: () => import('../views/vendor/Staff.vue'), meta: { ownerOnly: true } },
      { path: 'hr', name: 'vendor.hr', component: () => import('../views/vendor/Hr.vue'), meta: { permissions: ['hr.manage'] } },
      { path: 'routes', name: 'vendor.routes', component: () => import('../views/vendor/Routes.vue'), meta: { permissions: ['routes.manage'] } },
      { path: 'trips', name: 'vendor.trips', component: () => import('../views/vendor/Trips.vue'), meta: { permissions: ['trips.manage'] } },
      { path: 'bookings', name: 'vendor.bookings', component: () => import('../views/vendor/Bookings.vue'), meta: { permissions: ['bookings.manage'] } },
      { path: 'revenue', name: 'vendor.revenue', component: () => import('../views/vendor/Revenue.vue'), meta: { permissions: ['analytics.view', 'finance.manage'] } },
      { path: 'wallet', name: 'vendor.wallet', component: () => import('../views/vendor/Wallet.vue'), meta: { permissions: ['finance.manage'] } },
      { path: 'expenses', name: 'vendor.expenses', component: () => import('../views/vendor/Expenses.vue'), meta: { permissions: ['finance.manage'] } },
      { path: 'reviews', name: 'vendor.reviews', component: () => import('../views/vendor/Reviews.vue'), meta: { permissions: ['reviews.reply'] } },
      { path: 'scan', name: 'vendor.scan', component: () => import('../views/vendor/ScanTicket.vue'), meta: { permissions: ['bookings.manage'] } },
      { path: 'my-payments', name: 'vendor.my-payments', component: () => import('../views/vendor/MyPayments.vue'), meta: { staffOnly: true } },
      { path: 'profile', name: 'vendor.profile', component: () => import('../views/vendor/Profile.vue') },
    ],
  },

  // Admin
  {
    path: '/admin',
    component: () => import('../layouts/DashboardLayout.vue'),
    meta: { requiresAuth: true, roles: ['super_admin'] },
    children: [
      { path: '', redirect: '/admin/dashboard' },
      { path: 'dashboard', name: 'admin.dashboard', component: () => import('../views/admin/Dashboard.vue') },
      { path: 'vendors', name: 'admin.vendors', component: () => import('../views/admin/Vendors.vue') },
      { path: 'users', name: 'admin.users', component: () => import('../views/admin/Users.vue') },
      { path: 'terminals', name: 'admin.terminals', component: () => import('../views/admin/Terminals.vue') },
      { path: 'cities', name: 'admin.cities', component: () => import('../views/admin/Cities.vue') },
      { path: 'bus-categories', name: 'admin.bus-categories', component: () => import('../views/admin/BusCategories.vue') },
      { path: 'offers', name: 'admin.offers', component: () => import('../views/admin/Offers.vue') },
      { path: 'seat-layout-templates', name: 'admin.seat-layout-templates', component: () => import('../views/admin/SeatLayoutTemplates.vue') },
      { path: 'routes', name: 'admin.routes', component: () => import('../views/admin/Routes.vue') },
      { path: 'trips', name: 'admin.trips', component: () => import('../views/admin/Trips.vue') },
      { path: 'bookings', name: 'admin.bookings', component: () => import('../views/admin/Bookings.vue') },
      { path: 'transactions', name: 'admin.transactions', component: () => import('../views/admin/Transactions.vue') },
      { path: 'tickets', name: 'admin.tickets', component: () => import('../views/admin/Tickets.vue') },
      { path: 'withdrawals', name: 'admin.withdrawals', component: () => import('../views/admin/Withdrawals.vue') },
      { path: 'notifications', name: 'admin.notifications', component: () => import('../views/admin/Notifications.vue') },
      { path: 'reports', name: 'admin.reports', component: () => import('../views/admin/Reports.vue') },
      { path: 'settings', name: 'admin.settings', component: () => import('../views/admin/Settings.vue') },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.meta.guest && auth.isAuthenticated) {
    return { name: 'home' }
  }

  if (to.meta.requiresAuth) {
    if (!auth.isAuthenticated) {
      return { name: 'vendor-login', query: { redirect: to.fullPath } }
    }
    if (to.meta.roles && !to.meta.roles.includes(auth.role)) {
      const home = auth.isAdmin
        ? '/admin/dashboard'
        : auth.isVendor || auth.isStaff
          ? '/vendor/dashboard'
          : '/customer/dashboard'
      return home
    }
    if (auth.isStaff && (to.meta.ownerOnly || (to.meta.permissions && !auth.canAccess(to.meta.permissions)))) {
      return '/vendor/dashboard'
    }
    if (to.meta.staffOnly && !auth.isStaff) {
      return '/vendor/dashboard'
    }
  }
})

export default router
