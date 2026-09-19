<template>
  <div>
    <!-- ================= HEADER ================= -->
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4 fade-up">
      <div>
        <div class="section-eyebrow"><i class="bi bi-ticket-perforated"></i>Operations</div>
        <h4 class="fw-bold mb-0">All Bookings</h4>
      </div>
      <button class="btn btn-ghost" @click="load()">
        <i class="bi bi-arrow-clockwise me-1"></i>Refresh
      </button>
    </div>

    <div class="soft-card fade-up">
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 p-3 pb-0">
        <h6 class="fw-bold mb-0"><i class="bi bi-receipt me-2 text-brand"></i>Booking ledger</h6>
        <span class="text-muted small">{{ bookings.length }} booking{{ bookings.length === 1 ? '' : 's' }}</span>
      </div>

      <LoadingSpinner :show="loading" />

      <div v-if="!loading && bookings.length === 0" class="p-3">
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
              <th>Departure</th>
              <th class="text-end">Amount</th>
              <th>Payment</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="b in bookings" :key="b.id">
              <td class="small fw-semibold">{{ b.booking_number }}</td>
              <td class="small">{{ b.origin_city }} <i class="bi bi-arrow-right text-muted small"></i> {{ b.destination_city }}</td>
              <td class="small">{{ b.vendor_name }}</td>
              <td class="small">
                {{ b.customer_name }}<br />
                <span class="text-muted">{{ b.customer_email }}</span>
              </td>
              <td class="small">
                <div>{{ b.departure_date }}</div>
                <div class="text-muted">{{ b.departure_time }}</div>
              </td>
              <td class="text-end small fw-semibold">{{ currency }}{{ formatPrice(b.total_amount) }}</td>
              <td><StatusBadge :status="b.payment_status" /></td>
              <td><StatusBadge :status="b.status" /></td>
            </tr>
          </tbody>
        </table>
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

const bookings = ref([])
const loading = ref(true)
const currency = ref('₦')

function formatPrice(v) {
  return Number(v || 0).toLocaleString()
}

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/admin/bookings')
    bookings.value = data.data
  } catch (e) {
    bookings.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
