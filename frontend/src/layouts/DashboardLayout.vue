<template>
  <div class="dash-shell">
    <!-- Sidebar -->
    <aside class="sidebar" :class="{ collapsed: sidebarCollapsed, 'mobile-open': mobileOpen }">
      <div class="sb-brand">
        <span class="logo-mark"><i class="bi bi-bus-front-fill"></i></span>
        <span class="sb-label">BusLine</span>
      </div>

      <div class="sb-profile">
        <Avatar :name="auth.user?.name" :size="40" :gradient="nameHash" />
        <div class="sb-label">
          <div class="fw-bold small lh-1">{{ auth.user?.name }}</div>
          <div class="text-muted" style="font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.05em">
            {{ roleLabel }}
          </div>
        </div>
      </div>

      <nav class="sb-nav">
        <div class="sb-group sb-label">Menu</div>
        <router-link
          v-for="item in menuItems"
          :key="item.to"
          class="nav-link"
          :to="item.to"
          exact-active-class="active"
        >
          <i :class="`bi ${item.icon}`"></i>
          <span class="sb-label">{{ item.label }}</span>
        </router-link>

        <template v-if="auth.isCustomer && accountItems.length">
          <div class="sb-group sb-label">Account</div>
          <router-link
            v-for="item in accountItems"
            :key="item.to"
            class="nav-link"
            :to="item.to"
            exact-active-class="active"
          >
            <i :class="`bi ${item.icon}`"></i>
            <span class="sb-label">{{ item.label }}</span>
          </router-link>
        </template>
      </nav>

      <div class="sb-foot">
        <button class="btn btn-ghost w-100 btn-sm" @click="handleLogout">
          <i class="bi bi-box-arrow-left me-1"></i><span class="sb-label">Logout</span>
        </button>
      </div>
    </aside>

    <!-- Mobile backdrop -->
    <div v-if="mobileOpen" class="backdrop" @click="mobileOpen = false"></div>

    <!-- Main -->
    <div class="dash-main">
      <div v-if="auth.isImpersonating" class="impersonate-bar">
        <i class="bi bi-eye-fill me-2"></i>
        <span class="me-2">You are viewing as <strong>{{ auth.user?.name }}</strong> <span class="impersonate-company">{{ auth.profile?.company_name || '' }}</span></span>
        <button class="btn btn-sm btn-light" type="button" @click="exitImpersonation">
          <i class="bi bi-arrow-left me-1"></i>Exit impersonation
        </button>
      </div>
      <header class="topbar">
        <button class="icon-btn" @click="toggleSidebar" :aria-label="isMobile ? 'Open menu' : 'Toggle sidebar'">
          <i class="bi bi-list"></i>
        </button>

        <div class="search-control flex-grow-1 d-none d-md-flex" style="max-width: 420px">
          <i class="bi bi-search text-muted"></i>
          <input
            v-model="quickSearch"
            type="text"
            placeholder="Search trips, bookings…"
            aria-label="Quick search"
            @keyup.enter="goSearch"
          />
        </div>

        <div class="ms-auto d-flex align-items-center gap-2">
          <!-- Notifications -->
          <div class="dropdown notif-dropdown">
            <button class="icon-btn" data-bs-toggle="dropdown" aria-label="Notifications">
              <i class="bi bi-bell"></i>
              <span class="dot" v-if="hasUnread"></span>
            </button>
            <div class="dropdown-menu dropdown-menu-end" style="width: 340px">
              <div class="d-flex justify-content-between align-items-center px-2 pb-1">
                <div class="dropdown-header">Notifications</div>
                <button class="btn btn-sm btn-link p-0 text-brand" @click="markAllRead">Mark all read</button>
              </div>
              <div
                v-if="notifications.length"
                v-for="n in notifications"
                :key="n.title"
                class="notif-item"
                :class="{ unread: !n.read }"
                role="button"
                tabindex="0"
                @click="goToActivity(n)"
                @keyup.enter="goToActivity(n)"
              >
                <span class="notif-ico" :class="`c-${n.color}`"><i :class="n.icon"></i></span>
                <div class="min-width-0">
                  <div class="small fw-semibold">{{ n.title }}</div>
                  <div class="text-muted" style="font-size: 0.78rem">{{ n.text }}</div>
                  <div class="text-muted" style="font-size: 0.7rem">{{ n.timeAgo }}</div>
                </div>
                <i class="bi bi-chevron-right notif-go"></i>
              </div>
              <div v-else class="text-center text-muted py-4" style="font-size: 0.85rem">
                No activity yet.
              </div>
            </div>
          </div>

          <!-- Profile -->
          <div class="dropdown">
            <button class="btn p-0 border-0 bg-transparent" data-bs-toggle="dropdown" aria-label="Profile menu">
              <Avatar :name="auth.user?.name" :size="40" :gradient="nameHash" />
            </button>
            <div class="dropdown-menu dropdown-menu-end" style="width: 250px">
              <div class="px-3 py-2">
                <div class="fw-bold small">{{ auth.user?.name }}</div>
                <div class="text-muted small text-truncate">{{ auth.user?.email }}</div>
              </div>
              <hr class="dropdown-divider" />
              <router-link class="dropdown-item" :to="profileLink">
                <i class="bi bi-person me-2"></i>My profile
              </router-link>
              <button class="dropdown-item text-danger" @click="handleLogout">
                <i class="bi bi-box-arrow-right me-2"></i>Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main class="dash-body">
        <div class="dash-content">
          <router-view />
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import Avatar from '../components/Avatar.vue'
import api from '../services/api'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const sidebarCollapsed = ref(false)
const mobileOpen = ref(false)
const isMobile = ref(false)
const quickSearch = ref('')
let activityTimer = null

const menus = {
  customer: [
    { label: 'Dashboard', to: '/customer/dashboard', icon: 'bi-speedometer2' },
    { label: 'My Bookings', to: '/customer/bookings', icon: 'bi-ticket-perforated' },
    { label: 'Offers & Rewards', to: '/customer/offers', icon: 'bi-stars' },
  ],
  vendor: [
    { label: 'Dashboard', to: '/vendor/dashboard', icon: 'bi-speedometer2' },
    { label: 'Buses', to: '/vendor/buses', icon: 'bi-bus-front' },
    { label: 'Terminals', to: '/vendor/terminals', icon: 'bi-bus-front-fill' },
    { label: 'Drivers', to: '/vendor/drivers', icon: 'bi-person-badge' },
    { label: 'Staff', to: '/vendor/staff', icon: 'bi-people' },
    { label: 'HR', to: '/vendor/hr', icon: 'bi-person-gear' },
    { label: 'Routes', to: '/vendor/routes', icon: 'bi-signpost-split' },
    { label: 'Trips', to: '/vendor/trips', icon: 'bi-calendar-check' },
    { label: 'Bookings', to: '/vendor/bookings', icon: 'bi-ticket-perforated' },
    { label: 'Revenue', to: '/vendor/revenue', icon: 'bi-graph-up' },
    { label: 'Wallet', to: '/vendor/wallet', icon: 'bi-wallet2' },
    { label: 'Expenses', to: '/vendor/expenses', icon: 'bi-receipt-cutoff' },
    { label: 'Reviews', to: '/vendor/reviews', icon: 'bi-stars' },
    { label: 'Scan Ticket', to: '/vendor/scan', icon: 'bi-qr-code-scan' },
    { label: 'My Payments', to: '/vendor/my-payments', icon: 'bi-receipt-cutoff' },
    { label: 'Profile', to: '/vendor/profile', icon: 'bi-person' },
  ],
  super_admin: [
    { label: 'Dashboard', to: '/admin/dashboard', icon: 'bi-speedometer2' },
    { label: 'Vendors', to: '/admin/vendors', icon: 'bi-buildings' },
    { label: 'Users', to: '/admin/users', icon: 'bi-people' },
    { label: 'Terminals', to: '/admin/terminals', icon: 'bi-bus-front-fill' },
    { label: 'Cities', to: '/admin/cities', icon: 'bi-geo-alt' },
    { label: 'Bus Categories', to: '/admin/bus-categories', icon: 'bi-bus-front' },
    { label: 'Seat Templates', to: '/admin/seat-layout-templates', icon: 'bi-grid-3x3-gap' },
    { label: 'Offers', to: '/admin/offers', icon: 'bi-tags' },
    { label: 'Routes', to: '/admin/routes', icon: 'bi-signpost-split' },
    { label: 'Trips', to: '/admin/trips', icon: 'bi-calendar-check' },
    { label: 'Bookings', to: '/admin/bookings', icon: 'bi-ticket-perforated' },
    { label: 'Transactions', to: '/admin/transactions', icon: 'bi-arrow-left-right' },
    { label: 'Tickets', to: '/admin/tickets', icon: 'bi-life-preserver' },
    { label: 'Withdrawals', to: '/admin/withdrawals', icon: 'bi-cash-stack' },
    { label: 'Notifications', to: '/admin/notifications', icon: 'bi-bell' },
    { label: 'Reports', to: '/admin/reports', icon: 'bi-bar-chart' },
    { label: 'Settings', to: '/admin/settings', icon: 'bi-gear' },
  ],
}

// Account pages available to customers (mirrors the mobile Account tab).
const accountItems = [
  { label: 'Profile', to: '/customer/profile', icon: 'bi-person' },
  { label: 'Payment', to: '/customer/payment', icon: 'bi-wallet2' },
  { label: 'Support', to: '/customer/support', icon: 'bi-headset' },
  { label: 'Settings', to: '/customer/settings', icon: 'bi-gear' },
]

const roleLabels = {
  customer: 'Customer',
  vendor: 'Vendor',
  vendor_staff: 'Staff',
  super_admin: 'Administrator',
}

// Which vendor menu sections are visible, derived from the route meta so the
// sidebar and the router guard share one source of truth:
//   ownerOnly → owners only, staff only → staff members only,
//   permissions → required for staff, everything else is open to all.
function canSeeItem(item) {
  const route = router.getRoutes().find((r) => r.path === item.to)
  if (route?.meta?.ownerOnly) return auth.isStaff ? false : true
  if (route?.meta?.staffOnly) return auth.isStaff
  if (!auth.isStaff) return true
  return auth.canAccess(route?.meta?.permissions)
}

const menuItems = computed(() => {
  const base = auth.role === 'vendor' || auth.isStaff ? menus.vendor : menus[auth.role] || []
  return base.filter(canSeeItem)
})
const roleLabel = computed(() => {
  if (auth.isStaff) {
    const labels = { manager: 'Manager', operator: 'Operator', accountant: 'Accountant', support: 'Support', driver: 'Driver', viewer: 'Viewer' }
    return labels[auth.staffRole] || 'Staff'
  }
  if (auth.role === 'vendor') return 'Vendor'
  return roleLabels[auth.role] || (auth.role || 'Guest').replace(/_/g, ' ')
})
const nameHash = computed(() => String(auth.user?.name || '?').length)

const profileLink = computed(() => {
  if (auth.isCustomer) return '/customer/profile'
  if (auth.isVendor || auth.isStaff) return '/vendor/profile'
  return '/admin/settings'
})

// Realtime website activity for the notification bell (admin only).
const activities = ref([])
const unreadCount = ref(0)

const activityMeta = {
  registration: { icon: 'bi-person-plus', color: 'amber' },
  booking: { icon: 'bi-ticket-perforated', color: 'green' },
  payment: { icon: 'bi-credit-card', color: 'brand' },
  cancellation: { icon: 'bi-x-circle', color: 'danger' },
}

// Where each activity type should take the admin when clicked.
function activityTarget(a) {
  if (a.type === 'registration') {
    return a.data?.type === 'vendor' ? '/admin/vendors' : '/admin/users'
  }
  if (a.type === 'payment') {
    return '/admin/transactions'
  }
  if (a.type === 'booking' || a.type === 'cancellation') {
    return '/admin/bookings'
  }
  return '/admin/dashboard'
}

// Normalize backend activity rows into the shape the dropdown renders.
const notifications = computed(() =>
  activities.value.map((a) => {
    const meta = activityMeta[a.type] || { icon: 'bi-bell', color: 'brand' }
    return {
      title: a.title,
      text: a.message,
      timeAgo: a.time_ago,
      icon: meta.icon,
      color: meta.color,
      read: !!a.is_read,
      to: activityTarget(a),
      activity: a,
    }
  })
)

function goToActivity(n) {
  const toggle = document.querySelector('.notif-dropdown .icon-btn[data-bs-toggle="dropdown"]')
  const inst = toggle && window.bootstrap?.Dropdown
    ? window.bootstrap.Dropdown.getOrCreateInstance(toggle)
    : null
  inst?.hide()
  router.push(n.to)
}

const hasUnread = computed(() => unreadCount.value > 0)

async function loadActivities() {
  try {
    const { data } = await api.get('/admin/activities/recent')
    activities.value = data?.data?.items || []
    unreadCount.value = data?.data?.unread || 0
  } catch (e) {
    // silently ignore; bell just stays empty
  }
}

async function markAllRead() {
  try {
    await api.post('/admin/activities/read-all')
    await loadActivities()
  } catch (e) {
    // ignore
  }
}

function toggleSidebar() {
  if (isMobile.value) {
    mobileOpen.value = !mobileOpen.value
  } else {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }
}

function goSearch() {
  const q = quickSearch.value.trim()
  if (!q) return
  if (auth.isCustomer) {
    router.push('/customer/dashboard')
  } else if (auth.isVendor || auth.isStaff) {
    router.push('/vendor/bookings')
  } else {
    router.push('/admin/bookings')
  }
  quickSearch.value = ''
}

function handleLogout() {
  auth.logout()
  router.push('/')
}

function exitImpersonation() {
  auth.exitImpersonation()
  router.push('/admin/vendors')
}

function checkMobile() {
  isMobile.value = window.innerWidth < 992
  if (!isMobile.value) mobileOpen.value = false
}

watch(() => route.fullPath, () => {
  mobileOpen.value = false
})

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  if (auth.role === 'super_admin') {
    loadActivities()
    activityTimer = window.setInterval(() => {
      if (!document.hidden) loadActivities()
    }, 25000)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', checkMobile)
  if (activityTimer) window.clearInterval(activityTimer)
})
</script>
