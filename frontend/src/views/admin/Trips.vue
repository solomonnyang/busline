<template>
  <div class="py-2">
    <PageSkeleton v-if="loading" :stat-cards="0" />
    <template v-else>
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4 fade-up">
        <div>
          <div class="section-eyebrow"><i class="bi bi-calendar-check"></i>Operations</div>
          <h4 class="fw-bold mb-0">Trips</h4>
          <p class="text-muted small mb-0">Monitor every trip across vendors and assign drivers.</p>
        </div>
      </div>

      <div class="soft-card fade-up">
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 p-3 pb-0">
          <div class="d-flex flex-wrap align-items-center gap-2">
            <div class="search-control" style="width: 260px; max-width: 100%">
              <i class="bi bi-search text-muted"></i>
              <input v-model="search" type="text" placeholder="Search trips…" aria-label="Search trips" />
            </div>
            <select v-model="filters.status" class="form-select form-select-sm" style="width: auto" aria-label="Filter by status">
              <option value="">All statuses</option>
              <option v-for="s in tripStatuses" :key="s" :value="s">{{ s }}</option>
            </select>
            <select v-model="filters.vendorId" class="form-select form-select-sm" style="width: auto" aria-label="Filter by vendor">
              <option :value="null">All vendors</option>
              <option v-for="v in vendors" :key="v.id" :value="v.id">{{ v.company_name }}</option>
            </select>
            <button v-if="hasFilters" class="btn btn-sm btn-ghost" @click="clearFilters">
              <i class="bi bi-x-lg me-1"></i>Clear
            </button>
          </div>
          <span class="small text-muted">{{ filtered.length }} trip{{ filtered.length === 1 ? '' : 's' }}</span>
        </div>

        <LoadingSpinner :show="loading" />
        <div v-if="!loading && trips.length === 0" class="p-4">
          <EmptyState icon="bi-calendar-check" title="No trips yet" message="Trips will appear here once vendors schedule them." />
        </div>
        <div v-else-if="!loading && filtered.length === 0" class="p-4">
          <EmptyState icon="bi-search" title="No trips match" message="Try a different search term." />
        </div>
        <div v-else class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Route</th>
                <th>Vendor</th>
                <th>Bus</th>
                <th class="sortable" @click="sortBy('departure')">Departure <i class="bi" :class="sortIcon('departure')"></i></th>
                <th class="sortable" @click="sortBy('price')">Price <i class="bi" :class="sortIcon('price')"></i></th>
                <th>Drivers</th>
                <th>Status</th>
                <th class="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in sorted" :key="t.id">
                <td class="fw-bold">{{ t.origin_city }} → {{ t.destination_city }}</td>
                <td class="small">{{ t.vendor_name }}</td>
                <td class="small">{{ t.bus_name }}<span v-if="t.registration_number" class="text-muted"> · {{ t.registration_number }}</span></td>
                <td class="small">{{ t.departure_date }} {{ t.departure_time }}</td>
                <td class="small fw-semibold">₦{{ formatPrice(t.price) }}</td>
                <td>
                  <span v-if="t.drivers && t.drivers.length" class="d-flex flex-wrap gap-1">
                    <span v-for="d in t.drivers" :key="d.id" class="badge rounded-pill text-bg-light border">
                      <i :class="d.role === 'driver' ? 'bi bi-person-badge' : 'bi bi-person-badge text-muted'"></i>
                      {{ d.name }} <span class="text-muted">{{ d.role }}</span>
                    </span>
                  </span>
                  <span v-else class="text-muted small">—</span>
                </td>
                <td><StatusBadge :status="t.status" /></td>
                <td class="text-end">
                  <button class="btn btn-sm btn-outline-primary me-1" @click="openAssign(t)">
                    <i class="bi bi-person-badge me-1"></i>Assign drivers
                  </button>
                  <button class="btn btn-sm btn-ghost" :title="'View trip details'" @click="openDetail(t)">
                    <i class="bi bi-eye"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Assign drivers modal -->
    <div v-if="showAssign" class="modal fade show d-block" tabindex="-1" style="background: rgba(0, 0, 0, 0.5)">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h6 class="modal-title fw-bold"><i class="bi bi-person-badge me-1"></i>Assign drivers — {{ assignTrip?.origin_city }} → {{ assignTrip?.destination_city }}</h6>
            <button class="btn-close" @click="showAssign = false"></button>
          </div>
          <div class="modal-body">
            <div class="alert alert-info py-2 small">
              <i class="bi bi-calendar3 me-1"></i>
              {{ assignTrip?.departure_date }} {{ assignTrip?.departure_time }} · {{ assignTrip?.vendor_name }}
            </div>
            <div v-if="assignError" class="alert alert-danger py-2 small">{{ assignError }}</div>

            <div class="d-flex justify-content-between align-items-center mb-2">
              <label class="form-label mb-0">Assigned crew</label>
              <button class="btn btn-sm btn-light" @click="addRow"><i class="bi bi-plus-lg me-1"></i>Add</button>
            </div>

            <div v-if="assignRows.length === 0" class="text-muted small py-2">
              No drivers assigned yet. Add a driver below.
            </div>
            <div v-for="(row, i) in assignRows" :key="row.key" class="row g-2 align-items-center mb-2">
              <div class="col-6">
                <select v-model="row.driver_id" class="form-select form-select-sm" aria-label="Driver">
                  <option :value="null" disabled>Select driver</option>
                  <option v-for="d in drivers" :key="d.id" :value="d.id">
                    {{ d.name }}{{ d.vendor_name ? ` (${d.vendor_name})` : '' }}
                  </option>
                </select>
              </div>
              <div class="col-4">
                <select v-model="row.role" class="form-select form-select-sm" aria-label="Role">
                  <option value="driver">Driver</option>
                  <option value="assistant">Assistant</option>
                </select>
              </div>
              <div class="col-2 text-end">
                <button class="btn btn-sm btn-ghost text-danger-c" @click="assignRows.splice(i, 1)">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-sm btn-light" @click="showAssign = false">Cancel</button>
            <button class="btn btn-sm btn-primary" :disabled="saving" @click="saveAssignments">
              <span v-if="saving" class="spinner-border spinner-border-sm"></span>
              <span v-else>Save assignments</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Trip detail modal -->
    <div v-if="showDetail" class="modal fade show d-block" tabindex="-1" style="background: rgba(0, 0, 0, 0.5)">
      <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h6 class="modal-title fw-bold"><i class="bi bi-calendar-check me-1"></i>{{ detail?.trip?.origin_city }} → {{ detail?.trip?.destination_city }}</h6>
            <button class="btn-close" @click="showDetail = false"></button>
          </div>
          <div class="modal-body">
            <LoadingSpinner :show="detailLoading" />
            <template v-if="detail && !detailLoading">
              <div class="d-flex flex-wrap gap-2 mb-3 small">
                <span class="badge text-bg-light border"><i class="bi bi-buildings me-1"></i>{{ detail.trip.vendor_name }}</span>
                <span class="badge text-bg-light border"><i class="bi bi-bus-front me-1"></i>{{ detail.trip.bus_name }} ({{ detail.trip.registration_number }})</span>
                <span class="badge text-bg-light border"><i class="bi bi-calendar3 me-1"></i>{{ detail.trip.departure_date }} {{ detail.trip.departure_time }}</span>
                <span class="badge text-bg-light border"><i class="bi bi-people me-1"></i>{{ detail.bookings?.length || 0 }} booking(s)</span>
                <span><StatusBadge :status="detail.trip.status" /></span>
              </div>

              <h6 class="fw-bold small text-uppercase text-muted mb-2">Assigned crew</h6>
              <div v-if="detail.drivers.length === 0" class="text-muted small py-1 mb-3">No drivers assigned.</div>
              <div v-else class="d-flex flex-wrap gap-2 mb-3">
                <span v-for="d in detail.drivers" :key="d.id" class="badge rounded-pill text-bg-light border">
                  <i class="bi bi-person-badge me-1"></i>{{ d.name }} <span class="text-muted">({{ d.role }})</span>
                </span>
              </div>

              <h6 class="fw-bold small text-uppercase text-muted mb-2">Bookings on this trip</h6>
              <div v-if="detail.bookings.length === 0" class="text-muted small py-1">No bookings yet.</div>
              <div v-else class="table-responsive">
                <table class="table table-sm align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Booking</th>
                      <th>Customer</th>
                      <th>Seats</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="bk in detail.bookings" :key="bk.id">
                      <td class="small fw-semibold">{{ bk.booking_number }}</td>
                      <td class="small">{{ bk.customer_name || '—' }}</td>
                      <td class="small">{{ bk.seat_count }}</td>
                      <td class="small"><StatusBadge :status="bk.status" /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </template>
          </div>
          <div class="modal-footer">
            <button class="btn btn-sm btn-light" @click="showDetail = false">Close</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import api, { extractError } from '../../services/api'
import StatusBadge from '../../components/StatusBadge.vue'
import LoadingSpinner from '../../components/LoadingSpinner.vue'
import PageSkeleton from '../../components/PageSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'

const trips = ref([])
const drivers = ref([])
const vendors = ref([])
const loading = ref(true)

const search = ref('')
const tripStatuses = ['scheduled', 'in_progress', 'completed', 'cancelled']
const filters = reactive({ status: '', vendorId: null })

const hasFilters = computed(() => Boolean(filters.status || filters.vendorId))

function clearFilters() {
  filters.status = ''
  filters.vendorId = null
}

function formatPrice(v) {
  return Number(v || 0).toLocaleString()
}

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return trips.value.filter((t) => {
    if (q) {
      const hay = `${t.origin_city || ''} ${t.destination_city || ''} ${t.bus_name || ''} ${t.vendor_name || ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    if (filters.status && t.status !== filters.status) return false
    if (filters.vendorId && Number(t.vendor_id) !== filters.vendorId) return false
    return true
  })
})

const sortKey = ref('departure')
const sortDir = ref('desc')

const sortValue = {
  departure: (t) => `${t.departure_date} ${t.departure_time}`,
  price: (t) => Number(t.price) || 0,
}

function sortBy(key) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}

function sortIcon(key) {
  if (sortKey.value !== key) return 'bi-arrow-down-up text-muted'
  return sortDir.value === 'asc' ? 'bi-arrow-up text-brand' : 'bi-arrow-down text-brand'
}

const sorted = computed(() => {
  const fn = sortValue[sortKey.value]
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...filtered.value].sort((a, b) => {
    const va = fn(a)
    const vb = fn(b)
    if (va === vb) return 0
    return (va < vb ? -1 : 1) * dir
  })
})

let rowKey = 0

function addRow(driverId = null, role = 'driver') {
  assignRows.value.push({ key: ++rowKey, driver_id: driverId, role })
}

const showAssign = ref(false)
const assignTrip = ref(null)
const assignRows = ref([])
const assignError = ref('')
const saving = ref(false)

function openAssign(trip) {
  assignTrip.value = trip
  assignRows.value = []
  assignError.value = ''
  ;(trip.drivers || []).forEach((d) => addRow(Number(d.driver_id), d.role))
  if (assignRows.value.length === 0) addRow()
  showAssign.value = true
}

async function saveAssignments() {
  assignError.value = ''
  const payload = assignRows.value
    .filter((r) => r.driver_id)
    .map((r) => ({ driver_id: Number(r.driver_id), role: r.role }))
  if (payload.length === 0 && assignRows.value.length > 0) {
    assignError.value = 'Pick a driver for each row (or remove empty rows).'
    return
  }
  saving.value = true
  try {
    const { data } = await api.put(`/admin/trips/${assignTrip.value.id}/drivers`, { drivers: payload })
    const trip = trips.value.find((t) => Number(t.id) === Number(assignTrip.value.id))
    if (trip) trip.drivers = data.data
    showAssign.value = false
  } catch (e) {
    assignError.value = extractError(e).message
  } finally {
    saving.value = false
  }
}

const showDetail = ref(false)
const detailLoading = ref(false)
const detail = ref(null)

async function openDetail(trip) {
  showDetail.value = true
  detailLoading.value = true
  detail.value = null
  try {
    const { data } = await api.get(`/admin/trips/${trip.id}`)
    detail.value = data.data
  } catch (e) {
    detail.value = null
    alert(extractError(e).message)
  } finally {
    detailLoading.value = false
  }
}

onMounted(async () => {
  try {
    const [t, d, v] = await Promise.all([
      api.get('/admin/trips'),
      api.get('/admin/drivers'),
      api.get('/admin/vendors'),
    ])
    trips.value = t.data.data || []
    drivers.value = d.data.data || []
    vendors.value = v.data.data || []
  } catch (e) {
    trips.value = []
    drivers.value = []
    vendors.value = []
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.sortable {
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}
.sortable:hover {
  color: var(--brand, #0d6efd);
}
</style>
