<template>
  <div class="py-2">
    <div class="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4 fade-up">
      <div>
        <div class="section-eyebrow"><i class="bi bi-cash-stack"></i>Finance</div>
        <h4 class="fw-bold mb-1">Withdrawals</h4>
        <p class="text-muted small mb-0">Approve or reject vendor payout requests.</p>
      </div>
      <button class="btn btn-ghost" @click="load">
        <i class="bi bi-arrow-clockwise me-1"></i>Refresh
      </button>
    </div>

    <div class="row g-3 g-lg-4 mb-4">
      <div class="col-md-4">
        <div class="stat-widget fade-up delay-1">
          <div class="d-flex justify-content-between align-items-start mb-3">
            <div class="stat-ico" style="background: var(--warning-50); color: var(--warning-700)">
              <i class="bi bi-hourglass-split"></i>
            </div>
            <span class="trend trend-up"><i class="bi bi-clock"></i>Pending</span>
          </div>
          <div class="fs-3 fw-bold lh-1 font-display"><CountUp :end="summary.pending.count" /></div>
          <div class="text-muted small mt-1">{{ currency }}{{ formatPrice(summary.pending.amount) }} awaiting approval</div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="stat-widget fade-up delay-2">
          <div class="d-flex justify-content-between align-items-start mb-3">
            <div class="stat-ico" style="background: var(--success-50); color: var(--success-700)">
              <i class="bi bi-check2-circle"></i>
            </div>
            <span class="trend trend-up"><i class="bi bi-check2"></i>Approved</span>
          </div>
          <div class="fs-3 fw-bold lh-1 font-display"><CountUp :end="summary.approved.count" /></div>
          <div class="text-muted small mt-1">{{ currency }}{{ formatPrice(summary.approved.amount) }} paid out</div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="stat-widget fade-up delay-3">
          <div class="d-flex justify-content-between align-items-start mb-3">
            <div class="stat-ico" style="background: var(--danger-50); color: var(--danger-700)">
              <i class="bi bi-x-circle"></i>
            </div>
            <span class="trend trend-down"><i class="bi bi-x"></i>Rejected</span>
          </div>
          <div class="fs-3 fw-bold lh-1 font-display"><CountUp :end="summary.rejected.count" /></div>
          <div class="text-muted small mt-1">{{ currency }}{{ formatPrice(summary.rejected.amount) }} declined</div>
        </div>
      </div>
    </div>

    <div class="soft-card fade-up">
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 p-3 pb-0">
        <div class="d-flex flex-wrap align-items-center gap-2">
          <div class="search-control" style="width: 260px; max-width: 100%">
            <i class="bi bi-search text-muted"></i>
            <input v-model="search" type="text" placeholder="Search reference or vendor…" aria-label="Search withdrawals" />
          </div>
          <div class="status-pills">
            <button
              v-for="s in statuses"
              :key="s.value"
              class="status-pill"
              :class="{ active: status === s.value }"
              @click="setStatus(s.value)"
            >
              {{ s.label }}
            </button>
          </div>
        </div>
        <span class="small text-muted">{{ filtered.length }} withdrawal{{ filtered.length === 1 ? '' : 's' }}</span>
      </div>

      <LoadingSpinner :show="loading" />
      <div v-if="!loading && withdrawals.length === 0" class="p-4">
        <EmptyState icon="bi-cash-stack" title="No withdrawals yet" message="Vendor payout requests will appear here." />
      </div>
      <div v-else-if="!loading && filtered.length === 0" class="p-4">
        <EmptyState icon="bi-search" title="No withdrawals match" message="Try a different search or status." />
      </div>
      <div v-else class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Vendor</th>
              <th>Amount</th>
              <th>Bank account</th>
              <th>Requested</th>
              <th>Status</th>
              <th class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="w in filtered" :key="w.id">
              <td class="small fw-semibold">
                <button class="btn btn-link btn-sm p-0 text-brand text-decoration-none fw-semibold" @click="openDetail(w)">
                  <i class="bi bi-receipt me-1"></i>{{ w.reference }}
                </button>
              </td>
              <td class="small">
                <div class="fw-semibold">{{ w.company_name || '—' }}</div>
                <span class="text-muted">{{ w.vendor_user_email }}</span>
              </td>
              <td class="small fw-bold">{{ currency }}{{ formatPrice(w.amount) }}</td>
              <td class="small">
                <div>{{ w.account_name }}</div>
                <span class="text-muted">{{ w.bank_name }} • {{ w.account_number }}</span>
              </td>
              <td class="small">{{ formatDate(w.created_at) }}</td>
              <td class="small">
                <StatusBadge :status="w.status" />
                <div v-if="w.admin_note" class="text-muted mt-1" style="font-size: 0.72rem" :title="w.admin_note">note: {{ w.admin_note }}</div>
              </td>
              <td class="text-end">
                <template v-if="w.status === 'pending'">
                  <button class="btn btn-sm btn-outline-success me-1" @click="approve(w)">
                    <i class="bi bi-check2 me-1"></i>Approve
                  </button>
                  <button class="btn btn-sm btn-outline-danger" @click="openReject(w)">
                    <i class="bi bi-x me-1"></i>Reject
                  </button>
                </template>
                <span v-else class="text-muted small">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Withdrawal details modal -->
    <div v-if="showDetail" class="modal fade show d-block" tabindex="-1" style="background: rgba(0, 0, 0, 0.5)">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h6 class="modal-title fw-bold"><i class="bi bi-receipt me-1 text-brand"></i>Withdrawal details</h6>
            <button class="btn-close" @click="showDetail = false"></button>
          </div>
          <div class="modal-body">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <span class="small text-muted">Reference</span>
              <span class="small fw-semibold">{{ active.reference }}</span>
            </div>
            <div class="d-flex justify-content-between align-items-center mb-3">
              <span class="small text-muted">Amount</span>
              <span class="fw-bold fs-5 text-brand">{{ currency }}{{ formatPrice(active.amount) }}</span>
            </div>
            <div class="d-flex justify-content-between align-items-center mb-3">
              <span class="small text-muted">Status</span>
              <StatusBadge :status="active.status" />
            </div>
            <hr class="my-3" />
            <div class="d-flex justify-content-between align-items-center mb-3">
              <span class="small text-muted">Vendor</span>
              <span class="small fw-semibold text-end">{{ active.company_name || '—' }}</span>
            </div>
            <div class="d-flex justify-content-between align-items-center mb-3">
              <span class="small text-muted">Contact</span>
              <span class="small fw-semibold text-end">{{ active.vendor_user_email || '—' }}</span>
            </div>
            <hr class="my-3" />
            <div class="d-flex justify-content-between align-items-center mb-3">
              <span class="small text-muted">Bank name</span>
              <span class="small fw-semibold">{{ active.bank_name || '—' }}</span>
            </div>
            <div class="d-flex justify-content-between align-items-center mb-3">
              <span class="small text-muted">Account name</span>
              <span class="small fw-semibold">{{ active.account_name || '—' }}</span>
            </div>
            <div class="d-flex justify-content-between align-items-center mb-3">
              <span class="small text-muted">Account number</span>
              <span class="small fw-semibold">{{ active.account_number || '—' }}</span>
            </div>
            <hr class="my-3" />
            <div class="d-flex justify-content-between align-items-center mb-3">
              <span class="small text-muted">Requested</span>
              <span class="small fw-semibold">{{ formatDateTime(active.created_at) }}</span>
            </div>
            <div v-if="active.processed_at" class="d-flex justify-content-between align-items-center mb-3">
              <span class="small text-muted">Processed</span>
              <span class="small fw-semibold">{{ formatDateTime(active.processed_at) }}</span>
            </div>
            <div v-if="active.admin_note" class="rounded bg-light p-3 small">
              <div class="text-muted mb-1">Admin note</div>
              <div>{{ active.admin_note }}</div>
            </div>
          </div>
          <div class="modal-footer">
            <template v-if="active.status === 'pending'">
              <button class="btn btn-sm btn-outline-danger me-auto" @click="openReject(active)">
                <i class="bi bi-x me-1"></i>Reject
              </button>
              <button class="btn btn-sm btn-success" @click="approve(active)">
                <i class="bi bi-check2 me-1"></i>Approve
              </button>
            </template>
            <button v-else class="btn btn-sm btn-light" @click="showDetail = false">Close</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Reject modal -->
    <div v-if="showReject" class="modal fade show d-block" tabindex="-1" style="background: rgba(0, 0, 0, 0.5)">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h6 class="modal-title fw-bold"><i class="bi bi-x-circle me-1 text-danger"></i>Reject withdrawal</h6>
            <button class="btn-close" @click="showReject = false"></button>
          </div>
          <div class="modal-body">
            <div class="small text-muted mb-3">
              Rejecting <strong>{{ currency }}{{ formatPrice(rejectTarget?.amount) }}</strong> for
              <strong>{{ rejectTarget?.company_name }}</strong> ({{ rejectTarget?.reference }}). The amount returns to the vendor's available balance.
            </div>
            <label class="form-label">Reason <span class="text-muted fw-normal">(optional)</span></label>
            <textarea v-model.trim="rejectNote" class="form-control" rows="3" placeholder="e.g. Invalid account details"></textarea>
          </div>
          <div class="modal-footer">
            <button class="btn btn-sm btn-light" @click="showReject = false">Cancel</button>
            <button class="btn btn-sm btn-danger" :disabled="saving" @click="submitReject">
              <span v-if="saving" class="spinner-border spinner-border-sm"></span>
              <span v-else>Reject withdrawal</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import api, { extractError } from '../../services/api'
import LoadingSpinner from '../../components/LoadingSpinner.vue'
import EmptyState from '../../components/EmptyState.vue'
import CountUp from '../../components/CountUp.vue'
import StatusBadge from '../../components/StatusBadge.vue'

const loading = ref(true)
const currency = ref('₦')
const withdrawals = ref([])
const search = ref('')
const status = ref('')
const statuses = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

const showReject = ref(false)
const rejectTarget = ref(null)
const rejectNote = ref('')
const saving = ref(false)

const showDetail = ref(false)
const active = ref({})

function formatPrice(v) {
  return Number(v || 0).toLocaleString()
}

function formatDate(v) {
  if (!v) return '—'
  const d = new Date(String(v).replace(' ', 'T') + 'Z')
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateTime(v) {
  if (!v) return '—'
  const d = new Date(String(v).replace(' ', 'T') + 'Z')
  return d.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function openDetail(w) {
  active.value = w
  showDetail.value = true
}

const summary = computed(() => {
  const acc = {
    pending: { count: 0, amount: 0 },
    approved: { count: 0, amount: 0 },
    rejected: { count: 0, amount: 0 },
  }
  withdrawals.value.forEach((w) => {
    if (acc[w.status]) {
      acc[w.status].count += 1
      acc[w.status].amount += Number(w.amount || 0)
    }
  })
  return acc
})

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return withdrawals.value.filter((w) => {
    if (status.value && w.status !== status.value) return false
    if (!q) return true
    return (
      (w.reference || '').toLowerCase().includes(q) ||
      (w.company_name || '').toLowerCase().includes(q) ||
      (w.vendor_user_email || '').toLowerCase().includes(q) ||
      (w.account_name || '').toLowerCase().includes(q)
    )
  })
})

function setStatus(s) {
  status.value = s
}

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/admin/withdrawals')
    withdrawals.value = data.data
  } catch (e) {
    withdrawals.value = []
  } finally {
    loading.value = false
  }
}

async function approve(w) {
  if (!confirm(`Approve ${currency.value}${formatPrice(w.amount)} withdrawal for ${w.company_name}?`)) return
  try {
    await api.put(`/admin/withdrawals/${w.id}/approve`)
    showDetail.value = false
    await load()
  } catch (e) {
    alert(extractError(e).message)
  }
}

function openReject(w) {
  rejectTarget.value = w
  rejectNote.value = ''
  showDetail.value = false
  showReject.value = true
}

async function submitReject() {
  saving.value = true
  try {
    await api.put(`/admin/withdrawals/${rejectTarget.value.id}/reject`, { note: rejectNote.value })
    showReject.value = false
    await load()
  } catch (e) {
    alert(extractError(e).message)
  } finally {
    saving.value = false
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
