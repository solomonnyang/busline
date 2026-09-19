<template>
  <div class="py-2">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h5 class="fw-bold mb-0">My Bookings</h5>
      <router-link to="/customer/dashboard" class="btn btn-sm btn-primary">
        <i class="bi bi-plus-lg me-1"></i>New booking
      </router-link>
    </div>

    <div class="card stat-card p-3">
      <LoadingSpinner :show="loading" />

      <div v-if="bookings.length" class="mb-3">
        <div class="search-control">
          <i class="bi bi-search text-muted"></i>
          <input v-model="search" type="search" placeholder="Search bookings" aria-label="Search bookings" />
          <button v-if="search" type="button" class="btn btn-link p-0 text-muted border-0" aria-label="Clear search" @click="search = ''">
            <i class="bi bi-x-circle"></i>
          </button>
        </div>

        <div class="bk-chips">
          <button
            v-for="f in FILTERS"
            :key="f.key"
            type="button"
            class="bk-chip"
            :class="{ active: status === f.key }"
            @click="status = f.key"
          >
            {{ f.label }}
            <span class="bk-chip-count" :class="{ active: status === f.key }">{{ counts[f.key] }}</span>
          </button>
        </div>
      </div>

      <div v-if="!loading && bookings.length === 0" class="text-muted text-center py-4">
        You have no bookings yet.
      </div>

      <div v-else-if="!loading && filteredBookings.length === 0" class="text-center py-4">
        <div class="bk-empty-ico"><i class="bi bi-search"></i></div>
        <p class="fw-semibold mb-1">No matching bookings</p>
        <p class="text-muted small mb-3">
          {{
            search.trim()
              ? `Nothing matches "${search.trim()}" for ${status === 'all' ? 'all statuses' : status}.`
              : `No ${status} bookings found.`
          }}
        </p>
        <button class="btn btn-sm btn-outline-primary" @click="resetFilters">
          <i class="bi bi-arrow-counterclockwise me-1"></i>Reset filters
        </button>
      </div>

      <div v-else class="table-responsive">
        <table class="table table-hover align-middle">
          <thead>
            <tr>
              <th>Booking #</th>
              <th>Route</th>
              <th>Departure</th>
              <th>Seats</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Payment</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="b in filteredBookings" :key="b.id">
              <td class="small">{{ b.booking_number }}</td>
              <td>{{ b.origin_city }} → {{ b.destination_city }}</td>
              <td class="small">
                {{ b.departure_date }}<br />
                {{ b.departure_time }}
              </td>
              <td>{{ b.seat_count }}</td>
              <td>{{ currency }}{{ formatPrice(b.total_amount) }}</td>
              <td><StatusBadge :status="b.status" /></td>
              <td><StatusBadge :status="b.payment_status" /></td>
              <td class="text-end">
                <router-link :to="`/customer/bookings/${b.id}`" class="btn btn-sm btn-outline-primary">
                  <i class="bi bi-ticket-perforated"></i>
                </router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '../../services/api'
import LoadingSpinner from '../../components/LoadingSpinner.vue'
import StatusBadge from '../../components/StatusBadge.vue'

const bookings = ref([])
const loading = ref(true)
const search = ref('')
const status = ref('all')
const currency = ref('₦')

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
]

const counts = computed(() => {
  const out = { all: bookings.value.length }
  for (const f of FILTERS) {
    if (f.key !== 'all') out[f.key] = bookings.value.filter((b) => b.status === f.key).length
  }
  return out
})

const filteredBookings = computed(() => {
  const q = search.value.trim().toLowerCase()
  return bookings.value.filter((b) => {
    if (status.value !== 'all' && b.status !== status.value) return false
    if (!q) return true
    const haystack = [
      b.booking_number,
      b.origin_city,
      b.destination_city,
      b.vendor_name,
      b.bus_name,
      b.bus_type,
      b.registration_number,
      b.booking_date,
      b.departure_date,
      b.departure_time,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(q)
  })
})

function resetFilters() {
  search.value = ''
  status.value = 'all'
}

function formatPrice(v) {
  return Number(v).toLocaleString()
}

onMounted(async () => {
  try {
    const { data } = await api.get('/bookings')
    bookings.value = data.data
  } catch (e) {
    bookings.value = []
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.bk-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
}
.bk-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: 999px;
  padding: 0.4rem 0.85rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.15s ease;
}
.bk-chip:hover { border-color: var(--brand-100); }
.bk-chip.active {
  background: var(--brand);
  border-color: var(--brand);
  color: #0f172a;
}
.bk-chip-count {
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  background: var(--brand-100);
  color: var(--brand-700);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.68rem;
  font-weight: 800;
  padding: 0 5px;
}
.bk-chip-count.active {
  background: rgba(10, 107, 96, 0.35);
  color: #0f172a;
}
.bk-empty-ico {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--brand-50);
  color: var(--brand);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  margin-bottom: 0.75rem;
}
</style>
