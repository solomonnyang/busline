<template>
  <div>
    <!-- ================= HEADER ================= -->
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4 fade-up">
      <div>
        <div class="section-eyebrow"><i class="bi bi-speedometer2"></i>Overview</div>
        <h4 class="fw-bold mb-0">Admin Dashboard</h4>
      </div>
      <span class="badge text-bg-success rounded-pill px-3 py-2"><i class="bi bi-check-circle me-1"></i>Live</span>
    </div>

    <!-- ================= STATS ================= -->
    <div class="row g-3 g-lg-4 mb-4">
      <div class="col-6 col-xl-3 fade-up delay-1">
        <div class="stat-widget">
          <div class="d-flex justify-content-between align-items-start mb-3">
            <div class="stat-ico" style="background: var(--brand-50); color: var(--brand-700)"><i class="bi bi-buildings"></i></div>
            <span class="trend trend-up"><i class="bi bi-check2-circle"></i>All vendors</span>
          </div>
          <div class="fs-3 fw-bold lh-1 font-display"><CountUp :end="Number(widgets.total_vendors) || 0" /></div>
          <div class="text-muted small mt-1">Total Vendors</div>
        </div>
      </div>
      <div class="col-6 col-xl-3 fade-up delay-2">
        <div class="stat-widget">
          <div class="d-flex justify-content-between align-items-start mb-3">
            <div class="stat-ico" style="background: var(--accent-50); color: var(--accent-700)"><i class="bi bi-clock-history"></i></div>
            <span class="trend" style="color: var(--accent-700); background: var(--accent-50)"><i class="bi bi-hourglass-split"></i>Needs review</span>
          </div>
          <div class="fs-3 fw-bold lh-1 font-display"><CountUp :end="Number(widgets.pending_vendors) || 0" /></div>
          <div class="text-muted small mt-1">Pending Approval</div>
        </div>
      </div>
      <div class="col-6 col-xl-3 fade-up delay-3">
        <div class="stat-widget">
          <div class="d-flex justify-content-between align-items-start mb-3">
            <div class="stat-ico" style="background: var(--secondary-50); color: var(--secondary-700)"><i class="bi bi-people"></i></div>
            <span class="trend trend-up"><i class="bi bi-person-check"></i>Registered</span>
          </div>
          <div class="fs-3 fw-bold lh-1 font-display"><CountUp :end="Number(widgets.total_customers) || 0" /></div>
          <div class="text-muted small mt-1">Customers</div>
        </div>
      </div>
      <div class="col-6 col-xl-3 fade-up delay-4">
        <div class="stat-widget">
          <div class="d-flex justify-content-between align-items-start mb-3">
            <div class="stat-ico" style="background: var(--surface-2); color: var(--text)"><i class="bi bi-wallet2"></i></div>
            <span class="trend trend-up"><i class="bi bi-ticket-perforated"></i>{{ widgets.total_bookings }} bookings</span>
          </div>
          <div class="fs-3 fw-bold lh-1 font-display"><CountUp :end="Number(widgets.revenue) || 0" :prefix="currency" /></div>
          <div class="text-muted small mt-1">Revenue</div>
        </div>
      </div>
    </div>

    <!-- ================= RECENT BOOKINGS ================= -->
    <div class="row g-4">
      <div class="col-lg-7">
        <div class="soft-card fade-up delay-2">
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 p-3 pb-0">
            <h6 class="fw-bold mb-0"><i class="bi bi-clock-history me-2 text-brand"></i>Recent bookings</h6>
            <span class="text-muted small">{{ recentBookings.length }} total</span>
          </div>
          <LoadingSpinner :show="loading" />
          <div v-if="!loading && recentBookings.length === 0" class="p-3">
            <EmptyState icon="bi-ticket-perforated" title="No bookings yet" message="Bookings will appear here as customers reserve seats." />
          </div>
          <div v-else class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Booking</th>
                  <th>Route</th>
                  <th>Vendor</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th class="text-end">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="b in recentBookings" :key="b.id">
                  <td class="small fw-semibold">{{ b.booking_number }}</td>
                  <td class="small">{{ b.origin_city }} <i class="bi bi-arrow-right text-muted small"></i> {{ b.destination_city }}</td>
                  <td class="small">{{ b.vendor_name }}</td>
                  <td class="small">{{ b.customer_name }}</td>
                  <td><StatusBadge :status="b.status" /></td>
                  <td class="text-end small fw-semibold">{{ currency }}{{ formatPrice(b.total_amount) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ================= RECENT VENDORS ================= -->
      <div class="col-lg-5">
        <div class="soft-card fade-up delay-3">
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 p-3 pb-0">
            <h6 class="fw-bold mb-0"><i class="bi bi-building-add me-2 text-brand"></i>Recent vendor registrations</h6>
            <span class="text-muted small">{{ recentVendors.length }} total</span>
          </div>
          <LoadingSpinner :show="loading" />
          <div v-if="!loading && recentVendors.length === 0" class="p-3">
            <EmptyState icon="bi-building" title="No vendors yet" message="Vendor registrations will appear here once operators sign up." />
          </div>
          <div v-else class="p-2">
            <div v-for="(v, i) in recentVendors" :key="v.id" class="d-flex justify-content-between align-items-center gap-2 px-2 py-3 border-bottom border-soft" :class="{ 'border-bottom-0': i === recentVendors.length - 1 }">
              <div class="d-flex align-items-center gap-3 min-width-0">
                <div class="operator-logo" style="width: 42px; height: 42px; margin: 0; font-size: 1rem">{{ (v.company_name || '?').charAt(0) }}</div>
                <div class="min-width-0">
                  <div class="fw-bold small text-truncate">{{ v.company_name }}</div>
                  <div class="text-muted small text-truncate">{{ v.email }}</div>
                </div>
              </div>
              <StatusBadge :status="v.approval_status" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import api from '../../services/api'
import StatusBadge from '../../components/StatusBadge.vue'
import LoadingSpinner from '../../components/LoadingSpinner.vue'
import EmptyState from '../../components/EmptyState.vue'
import CountUp from '../../components/CountUp.vue'

const loading = ref(true)
const currency = ref('₦')
const widgets = ref({ total_vendors: 0, pending_vendors: 0, total_customers: 0, total_bookings: 0, revenue: 0 })
const recentBookings = ref([])
const recentVendors = ref([])

function formatPrice(v) {
  return Number(v || 0).toLocaleString()
}

onMounted(async () => {
  try {
    const { data } = await api.get('/admin/dashboard')
    widgets.value = data.data.widgets
    recentBookings.value = data.data.recent_bookings.filter((b) => b.id)
    recentVendors.value = data.data.recent_vendors
  } catch (e) {
    widgets.value = { total_vendors: 0, pending_vendors: 0, total_customers: 0, total_bookings: 0, revenue: 0 }
  } finally {
    loading.value = false
  }
})
</script>
