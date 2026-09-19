<template>
  <div>
    <!-- ================= HEADER ================= -->
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4 fade-up">
      <div>
        <div class="section-eyebrow"><i class="bi bi-bar-chart-line"></i>Analytics</div>
        <h4 class="fw-bold mb-0">Reports</h4>
      </div>
      <div class="d-flex gap-2 align-items-center flex-wrap">
        <div class="search-control" style="width: 160px">
          <i class="bi bi-calendar3"></i>
          <input v-model="from" type="date" aria-label="From date" />
        </div>
        <span class="text-muted small">to</span>
        <div class="search-control" style="width: 160px">
          <i class="bi bi-calendar3"></i>
          <input v-model="to" type="date" aria-label="To date" />
        </div>
        <button class="btn btn-sm btn-primary" @click="load">
          <i class="bi bi-filter me-1"></i>Apply
        </button>
      </div>
    </div>

    <!-- ================= STATS ================= -->
    <div class="row g-3 g-lg-4 mb-4">
      <div v-for="(m, i) in metrics" :key="m.key" class="col-6 col-xl-3">
        <div class="stat-widget fade-up" :class="'delay-' + (i + 1)">
          <div class="d-flex justify-content-between align-items-start mb-3">
            <div class="stat-ico" :style="{ background: m.bg, color: m.color }"><i :class="m.icon"></i></div>
            <span class="trend" :class="m.trendCls"><i :class="`bi ${m.trendIcon}`"></i>{{ m.trend }}</span>
          </div>
          <div class="fs-3 fw-bold lh-1 font-display">
            <CountUp :end="m.end" :prefix="m.prefix" />
          </div>
          <div class="text-muted small mt-1">{{ m.label }}</div>
        </div>
      </div>
    </div>

    <!-- ================= REPORT TABLES ================= -->
    <div class="row g-4">
      <div class="col-lg-6">
        <div class="soft-card fade-up delay-1">
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 p-3 pb-0">
            <h6 class="fw-bold mb-0"><i class="bi bi-calendar2-week me-2 text-brand"></i>Bookings by day</h6>
            <span class="text-muted small">{{ bookingsByDay.length }} days</span>
          </div>
          <LoadingSpinner :show="loading" />
          <div v-if="!loading && bookingsByDay.length === 0" class="p-3">
            <EmptyState icon="bi-calendar-x" title="No data in this period" message="Try widening the date range to see bookings." />
          </div>
          <div v-else class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Bookings</th>
                  <th class="text-end">Revenue</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="d in bookingsByDay" :key="d.day">
                  <td class="small">{{ d.day }}</td>
                  <td>{{ d.total }}</td>
                  <td class="text-end small fw-semibold">{{ currency }}{{ formatPrice(d.revenue) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="col-lg-6">
        <div class="soft-card fade-up delay-2">
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 p-3 pb-0">
            <h6 class="fw-bold mb-0"><i class="bi bi-buildings me-2 text-brand"></i>Revenue by vendor</h6>
            <span class="text-muted small">{{ bookingsByVendor.length }} vendors</span>
          </div>
          <LoadingSpinner :show="loading" />
          <div v-if="!loading && bookingsByVendor.length === 0" class="p-3">
            <EmptyState icon="bi-building" title="No data yet" message="Vendor revenue will appear here once bookings are made." />
          </div>
          <div v-else class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Bookings</th>
                  <th class="text-end">Revenue</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="v in bookingsByVendor" :key="v.vendor_name">
                  <td class="fw-bold small">{{ v.vendor_name || '—' }}</td>
                  <td>{{ v.total }}</td>
                  <td class="text-end small fw-semibold">{{ currency }}{{ formatPrice(v.revenue) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="col-lg-6">
        <div class="soft-card fade-up delay-3">
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 p-3 pb-0">
            <h6 class="fw-bold mb-0"><i class="bi bi-signpost-split me-2 text-brand"></i>Top routes</h6>
            <span class="text-muted small">{{ topRoutes.length }} routes</span>
          </div>
          <LoadingSpinner :show="loading" />
          <div v-if="!loading && topRoutes.length === 0" class="p-3">
            <EmptyState icon="bi-signpost-2" title="No data yet" message="Top routes will appear here once trips are completed." />
          </div>
          <div v-else class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Route</th>
                  <th class="text-end">Bookings</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in topRoutes" :key="r.origin_city + r.destination_city">
                  <td class="fw-bold small">{{ r.origin_city }} <i class="bi bi-arrow-right text-muted small"></i> {{ r.destination_city }}</td>
                  <td class="text-end">{{ r.total }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '../../services/api'
import LoadingSpinner from '../../components/LoadingSpinner.vue'
import EmptyState from '../../components/EmptyState.vue'
import CountUp from '../../components/CountUp.vue'

const loading = ref(true)
const currency = ref('₦')
const from = ref(new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0])
const to = ref(new Date().toISOString().split('T')[0])
const bookingsByDay = ref([])
const bookingsByVendor = ref([])
const topRoutes = ref([])

function formatPrice(v) {
  return Number(v || 0).toLocaleString()
}

const totalBookings = computed(() => bookingsByDay.value.reduce((s, d) => s + Number(d.total || 0), 0))
const totalRevenue = computed(() => bookingsByDay.value.reduce((s, d) => s + Number(d.revenue || 0), 0))
const topVendor = computed(() => bookingsByVendor.value[0] || null)
const topRoute = computed(() => topRoutes.value[0] || null)

const metrics = computed(() => [
  {
    key: 'bookings',
    label: 'Total bookings',
    end: totalBookings.value,
    icon: 'bi-ticket-perforated',
    color: 'var(--brand-700)',
    bg: 'var(--brand-50)',
    trend: `${bookingsByDay.value.length} days`,
    trendCls: 'trend-up',
    trendIcon: 'bi-calendar2-week',
  },
  {
    key: 'revenue',
    label: 'Total revenue',
    end: totalRevenue.value,
    prefix: currency.value,
    icon: 'bi-wallet2',
    color: 'var(--secondary-700)',
    bg: 'var(--secondary-50)',
    trend: 'Gross revenue',
    trendCls: 'trend-up',
    trendIcon: 'bi-graph-up-arrow',
  },
  {
    key: 'toproute',
    label: topRoute.value ? `Top route · ${topRoute.value.origin_city} → ${topRoute.value.destination_city}` : 'Top route',
    end: Number(topRoute.value?.total) || 0,
    icon: 'bi-signpost-2',
    color: 'var(--accent-700)',
    bg: 'var(--accent-50)',
    trend: 'Bookings',
    trendCls: 'trend-up',
    trendIcon: 'bi-arrow-up-right',
  },
  {
    key: 'topvendor',
    label: topVendor.value ? `Top vendor · ${topVendor.value.vendor_name || '—'}` : 'Top vendor',
    end: Number(topVendor.value?.total) || 0,
    icon: 'bi-buildings',
    color: 'var(--text)',
    bg: 'var(--surface-2)',
    trend: 'Bookings',
    trendCls: 'trend-up',
    trendIcon: 'bi-arrow-up-right',
  },
])

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/admin/reports', { params: { from: from.value, to: to.value } })
    bookingsByDay.value = data.data.bookings_by_day
    bookingsByVendor.value = data.data.bookings_by_vendor
    topRoutes.value = data.data.top_routes
  } catch (e) {
    bookingsByDay.value = []
    bookingsByVendor.value = []
    topRoutes.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
