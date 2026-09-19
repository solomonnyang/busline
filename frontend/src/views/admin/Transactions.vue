<template>
  <div class="py-2">
    <div class="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4 fade-up">
      <div>
        <div class="section-eyebrow"><i class="bi bi-arrow-left-right"></i>Finance</div>
        <h4 class="fw-bold mb-1">Transactions</h4>
        <p class="text-muted small mb-0">Every wallet movement and booking payment across the platform.</p>
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
        <button class="btn btn-sm btn-primary" :disabled="loading" @click="load">
          <i class="bi bi-filter me-1"></i>Apply
        </button>
      </div>
    </div>

    <div class="row g-3 g-lg-4 mb-4">
      <div class="col-md-6 col-xl-3">
        <div class="stat-widget fade-up delay-1">
          <div class="d-flex justify-content-between align-items-start mb-3">
            <div class="stat-ico" style="background: var(--success-50); color: var(--success-700)">
              <i class="bi bi-arrow-down-left-circle"></i>
            </div>
            <span class="trend trend-up"><i class="bi bi-arrow-down-left"></i>Money in</span>
          </div>
          <div class="fs-3 fw-bold lh-1 font-display">{{ currency }}{{ formatPrice(summary.total_in) }}</div>
          <div class="text-muted small mt-1">Top-ups, loyalty &amp; booking payments</div>
        </div>
      </div>
      <div class="col-md-6 col-xl-3">
        <div class="stat-widget fade-up delay-2">
          <div class="d-flex justify-content-between align-items-start mb-3">
            <div class="stat-ico" style="background: var(--danger-50); color: var(--danger-700)">
              <i class="bi bi-arrow-up-right-circle"></i>
            </div>
            <span class="trend trend-down"><i class="bi bi-arrow-up-right"></i>Money out</span>
          </div>
          <div class="fs-3 fw-bold lh-1 font-display">{{ currency }}{{ formatPrice(summary.total_out) }}</div>
          <div class="text-muted small mt-1">Wallet spend on bookings</div>
        </div>
      </div>
      <div class="col-md-6 col-xl-3">
        <div class="stat-widget fade-up delay-3">
          <div class="d-flex justify-content-between align-items-start mb-3">
            <div class="stat-ico" style="background: var(--secondary-50); color: var(--secondary-700)">
              <i class="bi bi-graph-up-arrow"></i>
            </div>
            <span class="trend trend-up"><i class="bi bi-arrow-right"></i>Net</span>
          </div>
          <div class="fs-3 fw-bold lh-1 font-display">{{ currency }}{{ formatPrice(summary.net) }}</div>
          <div class="text-muted small mt-1">Incoming minus outgoing</div>
        </div>
      </div>
      <div class="col-md-6 col-xl-3">
        <div class="stat-widget fade-up delay-4">
          <div class="d-flex justify-content-between align-items-start mb-3">
            <div class="stat-ico" style="background: var(--brand-50); color: var(--brand-700)">
              <i class="bi bi-receipt"></i>
            </div>
            <span class="trend"><i class="bi bi-list-ol"></i>{{ summary.total }} rows</span>
          </div>
          <div class="fs-3 fw-bold lh-1 font-display"><CountUp :end="summary.total" /></div>
          <div class="text-muted small mt-1">Transactions shown</div>
        </div>
      </div>
    </div>

    <div class="soft-card fade-up">
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 p-3 pb-0">
        <div class="d-flex flex-wrap align-items-center gap-2">
          <div class="search-control" style="width: 260px; max-width: 100%">
            <i class="bi bi-search text-muted"></i>
            <input v-model="search" type="text" placeholder="Search reference, customer or description…" aria-label="Search transactions" />
          </div>
          <div class="status-pills">
            <button
              v-for="s in statuses"
              :key="s.value"
              class="status-pill"
              :class="{ active: status === s.value }"
              @click="status = s.value"
            >
              {{ s.label }}
            </button>
          </div>
          <div class="status-pills">
            <button
              v-for="s in sources"
              :key="s.value"
              class="status-pill"
              :class="{ active: source === s.value }"
              @click="source = s.value"
            >
              {{ s.label }}
            </button>
          </div>
          <select v-model="method" class="form-select form-select-sm" style="width: 150px" aria-label="Payment method">
            <option value="">All methods</option>
            <option v-for="m in methods" :key="m" :value="m">{{ mLabel(m) }}</option>
          </select>
        </div>
        <span class="small text-muted">{{ filtered.length }} transaction{{ filtered.length === 1 ? '' : 's' }}</span>
      </div>

      <LoadingSpinner :show="loading" />
      <div v-if="!loading && transactions.length === 0" class="p-4">
        <EmptyState icon="bi-receipt" title="No transactions" message="Wallet movements and booking payments will appear here." />
      </div>
      <div v-else-if="!loading && filtered.length === 0" class="p-4">
        <EmptyState icon="bi-search" title="No transactions match" message="Try a different search, filter or date range." />
      </div>
      <div v-else class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead>
            <tr>
              <th>Source</th>
              <th>Reference</th>
              <th>Details</th>
              <th>Customer</th>
              <th class="text-end">Amount</th>
              <th>Method</th>
              <th>Status</th>
              <th>Date</th>
              <th class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in filtered" :key="t.key">
              <td>
                <span class="chip" :class="t.source === 'wallet' ? 'chip-info' : 'chip-neutral'">
                  {{ t.source === 'wallet' ? 'Wallet' : 'Payment' }}
                </span>
              </td>
              <td class="small fw-semibold text-brand" style="white-space: nowrap">{{ t.reference }}</td>
              <td class="small">
                <div>{{ t.description || '—' }}</div>
                <span v-if="t.route" class="text-muted">{{ t.route }}</span>
                <span v-else-if="t.vendor_name" class="text-muted">{{ t.vendor_name }}</span>
              </td>
              <td class="small">
                <div class="fw-semibold">{{ t.customer_name || '—' }}</div>
                <span class="text-muted">{{ t.customer_email }}</span>
              </td>
              <td class="text-end small fw-bold" :class="t.type === 'debit' ? 'text-danger' : 'text-success'">
                {{ t.type === 'debit' ? '−' : '+' }}{{ currency }}{{ formatPrice(t.amount) }}
              </td>
              <td class="small text-capitalize">{{ mLabel(t.payment_method) }}</td>
              <td class="small"><StatusBadge :status="t.status" /></td>
              <td class="small" style="white-space: nowrap">{{ formatDateTime(t.occurred_at) }}</td>
              <td class="text-end">
                <button class="btn btn-sm btn-ghost" @click="openDetail(t)">
                  <i class="bi bi-eye me-1"></i>View
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Transaction details modal -->
    <div v-if="showDetail" class="modal fade show d-block" tabindex="-1" style="background: rgba(0, 0, 0, 0.5)">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h6 class="modal-title fw-bold"><i class="bi bi-receipt me-1 text-brand"></i>Transaction details</h6>
            <button class="btn-close" @click="showDetail = false"></button>
          </div>
          <div class="modal-body">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <span class="small text-muted">Reference</span>
              <span class="small fw-semibold">{{ active.reference }}</span>
            </div>
            <div class="d-flex justify-content-between align-items-center mb-3">
              <span class="small text-muted">Amount</span>
              <span class="fw-bold fs-5" :class="active.type === 'debit' ? 'text-danger' : 'text-brand'">
                {{ active.type === 'debit' ? '−' : '+' }}{{ currency }}{{ formatPrice(active.amount) }}
              </span>
            </div>
            <div class="d-flex justify-content-between align-items-center mb-3">
              <span class="small text-muted">Status</span>
              <StatusBadge :status="active.status" />
            </div>
            <hr class="my-3" />
            <div class="d-flex justify-content-between align-items-center mb-3">
              <span class="small text-muted">Source</span>
              <span class="small fw-semibold text-capitalize">{{ active.source }}</span>
            </div>
            <div class="d-flex justify-content-between align-items-center mb-3">
              <span class="small text-muted">Description</span>
              <span class="small fw-semibold text-end">{{ active.description || '—' }}</span>
            </div>
            <div class="d-flex justify-content-between align-items-center mb-3">
              <span class="small text-muted">Payment method</span>
              <span class="small fw-semibold text-capitalize">{{ mLabel(active.payment_method) }}</span>
            </div>
            <hr class="my-3" />
            <div class="d-flex justify-content-between align-items-center mb-3">
              <span class="small text-muted">Customer</span>
              <span class="small fw-semibold text-end">{{ active.customer_name || '—' }}</span>
            </div>
            <div class="d-flex justify-content-between align-items-center mb-3">
              <span class="small text-muted">Email</span>
              <span class="small fw-semibold text-end">{{ active.customer_email || '—' }}</span>
            </div>
            <div v-if="active.vendor_name" class="d-flex justify-content-between align-items-center mb-3">
              <span class="small text-muted">Vendor</span>
              <span class="small fw-semibold text-end">{{ active.vendor_name }}</span>
            </div>
            <div v-if="active.route" class="d-flex justify-content-between align-items-center mb-3">
              <span class="small text-muted">Route</span>
              <span class="small fw-semibold text-end">{{ active.route }}</span>
            </div>
            <div v-if="active.booking_number" class="d-flex justify-content-between align-items-center mb-3">
              <span class="small text-muted">Booking</span>
              <span class="small fw-semibold text-end">{{ active.booking_number }}</span>
            </div>
            <div v-if="active.wallet_id" class="d-flex justify-content-between align-items-center mb-3">
              <span class="small text-muted">Wallet ID</span>
              <span class="small fw-semibold">{{ active.wallet_id }}</span>
            </div>
            <hr class="my-3" />
            <div class="d-flex justify-content-between align-items-center mb-3">
              <span class="small text-muted">Date</span>
              <span class="small fw-semibold">{{ formatDateTime(active.occurred_at) }}</span>
            </div>
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
import { computed, onMounted, ref } from 'vue'
import api from '../../services/api'
import LoadingSpinner from '../../components/LoadingSpinner.vue'
import EmptyState from '../../components/EmptyState.vue'
import CountUp from '../../components/CountUp.vue'
import StatusBadge from '../../components/StatusBadge.vue'

const loading = ref(true)
const currency = ref('₦')
const transactions = ref([])
const search = ref('')
const status = ref('')
const source = ref('')
const method = ref('')
const from = ref('')
const to = ref('')

const statuses = [
  { value: '', label: 'All' },
  { value: 'success', label: 'Success' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
]
const sources = [
  { value: '', label: 'All sources' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'payment', label: 'Payment' },
]
const methods = ['paystack', 'cash', 'card', 'transfer', 'wallet', 'admin', 'loyalty', 'referral']

const showDetail = ref(false)
const active = ref({})

function mLabel(m) {
  if (!m) return '—'
  return m.replace(/_/g, ' ')
}

function formatPrice(v) {
  return Number(v || 0).toLocaleString()
}

function formatDateTime(v) {
  if (!v) return '—'
  const d = new Date(String(v).replace(' ', 'T') + 'Z')
  return d.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function openDetail(t) {
  active.value = t
  showDetail.value = true
}

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return transactions.value.filter((t) => {
    if (status.value && t.status !== status.value) return false
    if (source.value && t.source !== source.value) return false
    if (method.value && t.payment_method !== method.value) return false
    if (!q) return true
    return (
      (t.reference || '').toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q) ||
      (t.customer_name || '').toLowerCase().includes(q) ||
      (t.customer_email || '').toLowerCase().includes(q) ||
      (t.booking_number || '').toLowerCase().includes(q)
    )
  })
})

const summary = computed(() => {
  let totalIn = 0
  let totalOut = 0
  filtered.value.forEach((t) => {
    if (t.type === 'debit') {
      totalOut += Number(t.amount || 0)
    } else {
      totalIn += Number(t.amount || 0)
    }
  })
  return { total: filtered.value.length, total_in: totalIn, total_out: totalOut, net: totalIn - totalOut }
})

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/admin/transactions', { params: { from: from.value, to: to.value } })
    transactions.value = data.data.items
  } catch (e) {
    transactions.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.status-pills {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  background: var(--surface-2, #f1f5f9);
  border-radius: 999px;
}
.status-pill {
  border: 0;
  background: transparent;
  color: var(--muted, #64748b);
  font-size: 0.78rem;
  font-weight: 600;
  padding: 5px 12px;
  border-radius: 999px;
  cursor: pointer;
}
.status-pill.active {
  background: var(--brand);
  color: #fff;
  box-shadow: var(--shadow-brand, 0 4px 14px rgba(14, 147, 132, 0.3));
}
</style>
