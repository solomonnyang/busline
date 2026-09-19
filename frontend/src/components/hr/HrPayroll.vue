<template>
  <div>
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 fade-up">
      <div>
        <p class="text-muted small mb-0">
          Payroll run for <strong>{{ monthLabel }}</strong>
          <template v-if="run"> — <strong>{{ currency }}{{ formatPrice(run.net_total) }}</strong> net</template>
        </p>
      </div>
      <div class="d-flex gap-2">
        <input v-model="month" type="month" class="form-control" style="width: auto" aria-label="Payroll month" />
        <button class="btn btn-ghost" @click="load()">
          <i class="bi bi-arrow-clockwise me-1"></i>Refresh
        </button>
        <button v-if="!run" class="btn btn-primary" :disabled="generating" @click="generateRun()">
          <span v-if="generating" class="spinner-border spinner-border-sm"></span>
          <span v-else><i class="bi bi-file-earmark-plus me-1"></i>Generate run</span>
        </button>
      </div>
    </div>

    <!-- Run status banner -->
    <div v-if="run" class="alert fade-up d-flex flex-wrap justify-content-between align-items-center gap-2"
      :class="runStatusClass">
      <div class="d-flex align-items-center gap-2">
        <i :class="runStatusIcon"></i>
        <div>
          <div class="fw-semibold">{{ runStatusText }}</div>
          <div class="small opacity-75">
            {{ run.staff_count }} staff · {{ currency }}{{ formatPrice(run.net_total) }} net
            <template v-if="run.payment_ref"> · Ref {{ run.payment_ref }}</template>
          </div>
        </div>
      </div>
      <div class="d-flex gap-2 flex-wrap">
        <template v-if="run.status === 'draft'">
          <button class="btn btn-sm btn-success" :disabled="acting" @click="approveRun()">
            <i class="bi bi-check2-circle me-1"></i>Approve run
          </button>
          <button class="btn btn-sm btn-outline-danger" :disabled="acting" @click="cancelRun()">
            <i class="bi bi-x-lg me-1"></i>Cancel
          </button>
        </template>
        <template v-else-if="run.status === 'approved'">
          <button class="btn btn-sm btn-primary" :disabled="acting" @click="payRun()">
            <i class="bi bi-cash-coin me-1"></i>Pay run
          </button>
          <button class="btn btn-sm btn-outline-danger" :disabled="acting" @click="cancelRun()">
            <i class="bi bi-x-lg me-1"></i>Cancel
          </button>
        </template>
      </div>
    </div>

    <!-- Summary -->
    <div class="row g-3 g-lg-4 mb-4">
      <div class="col-6 col-xl-3">
        <div class="stat-widget fade-up delay-1">
          <div class="d-flex justify-content-between align-items-start mb-3">
            <div class="stat-ico" style="background: var(--brand-50); color: var(--brand-700)">
              <i class="bi bi-people"></i>
            </div>
            <span class="trend trend-up"><i class="bi bi-check2"></i>Team</span>
          </div>
          <div class="fs-3 fw-bold lh-1 font-display"><CountUp :end="staffCount" /></div>
          <div class="text-muted small mt-1">On this run</div>
        </div>
      </div>
      <div class="col-6 col-xl-3">
        <div class="stat-widget fade-up delay-2">
          <div class="d-flex justify-content-between align-items-start mb-3">
            <div class="stat-ico" style="background: var(--secondary-50); color: var(--secondary-700)">
              <i class="bi bi-cash-coin"></i>
            </div>
            <span class="trend trend-up"><i class="bi bi-check2"></i>Total</span>
          </div>
          <div class="fs-5 fw-bold lh-1 font-display">{{ currency }}{{ formatPrice(monthTotal) }}</div>
          <div class="text-muted small mt-1">Salaries for {{ monthLabel }}</div>
        </div>
      </div>
      <div class="col-6 col-xl-3">
        <div class="stat-widget fade-up delay-3">
          <div class="d-flex justify-content-between align-items-start mb-3">
            <div class="stat-ico" style="background: var(--success-50); color: var(--success-700)">
              <i class="bi bi-check-circle"></i>
            </div>
            <span class="trend trend-up"><i class="bi bi-activity"></i>Paid</span>
          </div>
          <div class="fs-5 fw-bold lh-1 font-display">{{ currency }}{{ formatPrice(paidTotal) }}</div>
          <div class="text-muted small mt-1">{{ paidCount }} of {{ staffCount }} paid</div>
        </div>
      </div>
      <div class="col-6 col-xl-3">
        <div class="stat-widget fade-up delay-4">
          <div class="d-flex justify-content-between align-items-start mb-3">
            <div class="stat-ico" style="background: var(--warning-50); color: var(--warning-700)">
              <i class="bi bi-clock-history"></i>
            </div>
            <span class="trend" style="color: var(--warning-700); background: var(--warning-50)">
              <i class="bi bi-exclamation-triangle"></i>Due
            </span>
          </div>
          <div class="fs-5 fw-bold lh-1 font-display">{{ currency }}{{ formatPrice(dueTotal) }}</div>
          <div class="text-muted small mt-1">{{ dueCount }} staff not yet paid</div>
        </div>
      </div>
    </div>

    <div class="soft-card fade-up">
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 p-3 pb-0">
        <div class="d-flex flex-wrap align-items-center gap-2">
          <div class="search-control" style="width: 240px; max-width: 100%">
            <i class="bi bi-search text-muted"></i>
            <input v-model="search" type="text" placeholder="Search staff…" aria-label="Search staff" />
          </div>
          <select v-model="filters.status" class="form-select form-select-sm" style="width: auto" aria-label="Filter by status">
            <option value="">Any status</option>
            <option value="paid">Paid</option>
            <option value="draft">Draft</option>
            <option value="none">Not paid</option>
          </select>
          <button v-if="filters.status || search" class="btn btn-sm btn-ghost" @click="filters.status = ''; search = ''">
            <i class="bi bi-x-lg me-1"></i>Clear
          </button>
        </div>
        <div class="d-flex align-items-center gap-2">
          <span class="small text-muted">{{ filtered.length }} staff member{{ filtered.length === 1 ? '' : 's' }}</span>
          <button v-if="run && run.status === 'draft'" class="btn btn-sm btn-outline-primary" @click="openModal()">
            <i class="bi bi-plus-lg me-1"></i>Add staff
          </button>
        </div>
      </div>

      <LoadingSpinner :show="loading" />
      <div v-if="!loading && !run" class="p-4">
        <EmptyState
          icon="bi-file-earmark-plus"
          title="No payroll run for {{ monthLabel }}"
          message="Generate a run to snapshot every active staff member's salary for this month, then review, approve and pay."
        >
          <template #actions>
            <button class="btn btn-primary" :disabled="generating" @click="generateRun()">
              <span v-if="generating" class="spinner-border spinner-border-sm"></span>
              <span v-else><i class="bi bi-file-earmark-plus me-1"></i>Generate run for {{ monthLabel }}</span>
            </button>
          </template>
        </EmptyState>
      </div>
      <div v-else-if="!loading && filtered.length === 0" class="p-4">
        <EmptyState icon="bi-search" title="No staff match" message="Try a different filter." />
      </div>
      <div v-else-if="!loading && rows.length === 0" class="p-4">
        <EmptyState icon="bi-people" title="No staff on this run" message="Add staff to this payroll run." />
      </div>
      <div v-else class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead>
            <tr>
              <th>Staff</th>
              <th>Salary</th>
              <th>Allow.</th>
              <th>Deduc.</th>
              <th>Net pay</th>
              <th>Status</th>
              <th class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in filtered" :key="row.staff_id">
              <td class="small">
                <div class="fw-semibold">{{ row.name }}</div>
                <span class="text-muted">{{ roleLabel(row.role) }} · {{ frequencyLabel(row.salary_frequency) }}</span>
              </td>
              <td class="small text-nowrap">{{ currency }}{{ formatPrice(row.base_salary) }}</td>
              <td class="small text-nowrap text-success">{{ currency }}{{ formatPrice(row.allowances) }}</td>
              <td class="small text-nowrap text-danger">{{ currency }}{{ formatPrice(row.deductions) }}</td>
              <td class="small fw-semibold text-nowrap">{{ currency }}{{ formatPrice(row.net_pay) }}</td>
              <td>
                <span v-if="row.status === 'paid'" class="chip chip-success"><i class="bi bi-check-circle me-1"></i>Paid</span>
                <span v-else-if="row.status === 'draft'" class="chip chip-neutral">Draft</span>
                <span v-else class="chip chip-warning"><i class="bi bi-clock me-1"></i>Not paid</span>
              </td>
              <td class="text-end">
                <div class="d-flex gap-1 justify-content-end flex-wrap">
                  <template v-if="run && run.status === 'draft' && row.record">
                    <button class="btn btn-sm btn-outline-primary" @click="openModal(row.record)">
                      <i class="bi bi-pencil me-1"></i>Edit
                    </button>
                    <button class="btn btn-sm btn-outline-danger" @click="removeLine(row.record)">
                      <i class="bi bi-trash"></i>
                    </button>
                  </template>
                  <button class="btn btn-sm btn-ghost" @click="openHistory(row)">
                    <i class="bi bi-clock-history me-1"></i>History
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Run history -->
    <div v-if="runs.length > 0" class="mt-4 fade-up">
      <h6 class="fw-bold mb-2"><i class="bi bi-clock-history me-2 text-brand"></i>Run history</h6>
      <div class="soft-card">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Period</th>
                <th>Staff</th>
                <th>Paid</th>
                <th>Net total</th>
                <th>Status</th>
                <th class="text-end">Paid at</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in runs" :key="r.id" style="cursor: pointer" @click="jumpToRun(r)">
                <td class="small fw-semibold">{{ r.period_label }}</td>
                <td class="small">{{ r.staff_count }}</td>
                <td class="small">{{ r.paid_count }}</td>
                <td class="small text-nowrap fw-semibold">{{ currency }}{{ formatPrice(r.net_total) }}</td>
                <td>
                  <span v-if="r.status === 'draft'" class="chip chip-neutral">Draft</span>
                  <span v-else-if="r.status === 'approved'" class="chip chip-info">Approved</span>
                  <span v-else-if="r.status === 'paid'" class="chip chip-success"><i class="bi bi-check-circle me-1"></i>Paid</span>
                  <span v-else class="chip chip-danger"><i class="bi bi-x-circle me-1"></i>Cancelled</span>
                </td>
                <td class="small text-muted text-end">{{ r.paid_at ? formatDate(r.paid_at) : '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Add / edit run line modal -->
    <div v-if="showModal" class="modal fade show d-block" tabindex="-1" style="background: rgba(0, 0, 0, 0.5)">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h6 class="modal-title fw-bold"><i class="bi bi-cash-coin me-1"></i>{{ editing ? 'Edit run line' : 'Add staff to run' }}</h6>
            <button class="btn-close" @click="showModal = false"></button>
          </div>
          <div class="modal-body">
            <div v-if="formError" class="alert alert-danger py-2 small">{{ formError }}</div>

            <div class="mb-3">
              <label class="form-label fw-semibold">Staff member</label>
              <select v-model="form.staff_id" class="form-select" :disabled="editing" @change="onStaffChange">
                <option value="">Select staff…</option>
                <option v-for="s in addableStaff" :key="s.id" :value="s.id">{{ s.name }} — {{ roleLabel(s.role) }}</option>
              </select>
            </div>
            <div class="row g-2">
              <div class="col-sm-6 mb-3">
                <label class="form-label fw-semibold">Period start</label>
                <input v-model="form.period_start" type="date" class="form-control" required />
              </div>
              <div class="col-sm-6 mb-3">
                <label class="form-label fw-semibold">Period end</label>
                <input v-model="form.period_end" type="date" class="form-control" required />
              </div>
            </div>
            <div class="row g-2">
              <div class="col-sm-4 mb-3">
                <label class="form-label fw-semibold">Basic salary</label>
                <input v-model.number="form.basic_salary" type="number" min="0" step="0.01" class="form-control" placeholder="0.00" required />
              </div>
              <div class="col-sm-4 mb-3">
                <label class="form-label fw-semibold">Allowances</label>
                <input v-model.number="form.allowances" type="number" min="0" step="0.01" class="form-control" placeholder="0.00" />
              </div>
              <div class="col-sm-4 mb-3">
                <label class="form-label fw-semibold">Deductions</label>
                <input v-model.number="form.deductions" type="number" min="0" step="0.01" class="form-control" placeholder="0.00" />
              </div>
            </div>
            <div class="mb-3">
              <label class="form-label fw-semibold">Note</label>
              <input v-model.trim="form.note" type="text" class="form-control" placeholder="e.g. Salary for August 2026" />
            </div>
            <div class="d-flex justify-content-between align-items-center bg-light rounded p-3 small">
              <span class="text-muted">Net pay</span>
              <span class="fw-bold fs-6 font-display">{{ currency }}{{ formatPrice(netPreview) }}</span>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-sm btn-light" @click="showModal = false">Cancel</button>
            <button class="btn btn-sm btn-primary" :disabled="saving || !canSave" @click="save">
              <span v-if="saving" class="spinner-border spinner-border-sm"></span>
              <span v-else><i class="bi bi-check-lg me-1"></i>{{ editing ? 'Save changes' : 'Add to run' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Payment history modal -->
    <div v-if="showHistory" class="modal fade show d-block" tabindex="-1" style="background: rgba(0, 0, 0, 0.5)">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h6 class="modal-title fw-bold"><i class="bi bi-clock-history me-2 text-brand"></i>Payment history — {{ historyStaff?.name }}</h6>
            <button class="btn-close" @click="showHistory = false"></button>
          </div>
          <div class="modal-body">
            <div v-if="historyLoading" class="text-center py-4">
              <span class="spinner-border spinner-border-sm text-brand"></span>
            </div>
            <div v-else-if="historyRecords.length === 0" class="text-muted small py-3">
              No payments recorded for this staff member yet.
            </div>
            <div v-else class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Basic</th>
                    <th>Allow.</th>
                    <th>Deduc.</th>
                    <th>Net pay</th>
                    <th>Status</th>
                    <th>Paid at</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="h in historyRecords" :key="h.id">
                    <td class="small text-nowrap">
                      <template v-if="h.period_start">
                        <div class="fw-semibold">{{ shortDate(h.period_start) }} → {{ shortDate(h.period_end) }}</div>
                        <span class="text-muted">{{ h.note || '' }}</span>
                      </template>
                      <span v-else class="text-muted">—</span>
                    </td>
                    <td class="small text-nowrap">{{ currency }}{{ formatPrice(h.basic_salary) }}</td>
                    <td class="small text-nowrap text-success">{{ currency }}{{ formatPrice(h.allowances) }}</td>
                    <td class="small text-nowrap text-danger">{{ currency }}{{ formatPrice(h.deductions) }}</td>
                    <td class="small fw-semibold text-nowrap">{{ currency }}{{ formatPrice(h.net_pay) }}</td>
                    <td><StatusBadge :status="h.status" /></td>
                    <td class="small text-muted">{{ h.paid_at ? formatDate(h.paid_at) : '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-sm btn-light" @click="showHistory = false">Close</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import api, { extractError } from '../../services/api'
import StatusBadge from '../StatusBadge.vue'
import LoadingSpinner from '../LoadingSpinner.vue'
import EmptyState from '../EmptyState.vue'
import CountUp from '../CountUp.vue'

const loading = ref(true)
const generating = ref(false)
const acting = ref(false)
const staffList = ref([])
const runs = ref([])
const run = ref(null)
const lines = ref([])
const search = ref('')
const filters = reactive({ status: '' })
const currency = '₦'

const month = ref(new Date().toISOString().slice(0, 7))

const showModal = ref(false)
const editing = ref(null)
const saving = ref(false)
const formError = ref('')
const form = reactive({ staff_id: '', period_start: '', period_end: '', basic_salary: null, allowances: 0, deductions: 0, note: '' })

const showHistory = ref(false)
const historyLoading = ref(false)
const historyStaff = ref(null)
const historyRecords = ref([])

const monthStart = computed(() => `${month.value}-01`)
const monthEnd = computed(() => {
  const d = new Date(`${month.value}-01T00:00:00`)
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10)
})
const monthLabel = computed(() => {
  const d = new Date(`${month.value}-01T00:00:00`)
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
})

function roleLabel(role) {
  return { manager: 'Manager', operator: 'Operator', accountant: 'Accountant', support: 'Support', driver: 'Driver', viewer: 'Viewer' }[role] || role
}

function frequencyLabel(f) {
  return { monthly: 'Monthly', weekly: 'Weekly', daily: 'Daily' }[f] || 'Monthly'
}

function formatPrice(v) {
  const n = Number(v || 0)
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function formatDate(v) {
  if (!v) return '—'
  const d = new Date(String(v).replace(' ', 'T'))
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function shortDate(v) {
  if (!v) return '—'
  const d = new Date(String(v).replace(' ', 'T'))
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const runStatusText = computed(() => ({
  draft: 'Draft — review the lines below, then approve to lock and pay',
  approved: 'Approved — locked. Mark the run as paid to complete it',
  paid: 'Paid — this payroll run is complete',
  cancelled: 'Cancelled',
}[run.value?.status] || ''))
const runStatusClass = computed(() => ({
  draft: 'alert-warning',
  approved: 'alert-info',
  paid: 'alert-success',
  cancelled: 'alert-secondary',
}[run.value?.status] || 'alert-secondary'))
const runStatusIcon = computed(() => ({
  draft: 'bi bi-pencil-square',
  approved: 'bi bi-check2-circle',
  paid: 'bi bi-check-circle',
  cancelled: 'bi bi-x-circle',
}[run.value?.status] || 'bi bi-clock'))

const inRun = (staffId) => lines.value.some((l) => !l.deleted_at && Number(l.staff_id) === Number(staffId) && l.status !== 'cancelled')

const rows = computed(() => {
  if (run.value) {
    return lines.value
      .filter((l) => l.status !== 'cancelled')
      .map((l) => ({
        staff_id: Number(l.staff_id),
        name: l.staff_name,
        role: l.staff_role,
        salary_frequency: l.salary_frequency || 'monthly',
        base_salary: Number(l.basic_salary || 0),
        allowances: Number(l.allowances || 0),
        deductions: Number(l.deductions || 0),
        net_pay: Number(l.net_pay || 0),
        status: l.status,
        record: l,
      }))
  }
  return staffList.value
    .filter((s) => Number(s.is_active) === 1)
    .map((s) => ({
      staff_id: Number(s.id),
      name: s.name,
      role: s.role,
      salary_frequency: s.salary_frequency,
      base_salary: Number(s.base_salary || 0),
      allowances: 0,
      deductions: 0,
      net_pay: Number(s.base_salary || 0),
      status: 'none',
      record: null,
    }))
})

const addableStaff = computed(() =>
  staffList.value.filter((s) => Number(s.is_active) === 1 && !inRun(s.id))
)

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return rows.value.filter((r) => {
    if (filters.status && r.status !== filters.status) return false
    if (q && !`${r.name} ${r.role || ''}`.toLowerCase().includes(q)) return false
    return true
  })
})

const staffCount = computed(() => rows.value.length)
const monthTotal = computed(() => rows.value.reduce((sum, r) => sum + r.base_salary, 0))
const paidRows = computed(() => rows.value.filter((r) => r.status === 'paid'))
const paidTotal = computed(() => paidRows.value.reduce((sum, r) => sum + r.net_pay, 0))
const paidCount = computed(() => paidRows.value.length)
const dueRows = computed(() => rows.value.filter((r) => r.status !== 'paid'))
const dueTotal = computed(() => dueRows.value.reduce((sum, r) => sum + r.net_pay, 0))
const dueCount = computed(() => dueRows.value.length)

const netPreview = computed(() => {
  const basic = Number(form.basic_salary || 0)
  const allow = Number(form.allowances || 0)
  const deduc = Number(form.deductions || 0)
  return Math.max(0, basic + allow - deduc)
})

const canSave = computed(() => form.staff_id && form.period_start && form.period_end && Number(form.basic_salary) >= 0)

async function load() {
  loading.value = true
  try {
    const [staff, runList] = await Promise.all([
      api.get('/vendor/hr/staff'),
      api.get('/vendor/hr/payroll/runs'),
    ])
    staffList.value = staff.data.data || []
    runs.value = runList.data.data || []
    await selectRun()
  } catch (e) {
    staffList.value = []
    runs.value = []
    run.value = null
    lines.value = []
  } finally {
    loading.value = false
  }
}

async function selectRun() {
  const active = runs.value.find((r) => r.status !== 'cancelled' && r.period_start.slice(0, 7) === month.value)
  if (active) {
    run.value = active
    try {
      const { data } = await api.get(`/vendor/hr/payroll/runs/${active.id}`)
      run.value = data.data.run
      lines.value = data.data.lines || []
    } catch (e) {
      lines.value = []
    }
  } else {
    run.value = null
    lines.value = []
  }
}

function jumpToRun(r) {
  month.value = r.period_start.slice(0, 7)
}

function onStaffChange() {
  const s = staffList.value.find((m) => Number(m.id) === Number(form.staff_id))
  if (s && !editing.value) form.basic_salary = Number(s.base_salary || 0)
}

function openModal(record = null) {
  editing.value = record
  formError.value = ''
  form.staff_id = record?.staff_id || ''
  form.period_start = record?.period_start || monthStart.value
  form.period_end = record?.period_end || monthEnd.value
  form.basic_salary = record?.basic_salary != null ? Number(record.basic_salary) : null
  form.allowances = record?.allowances != null ? Number(record.allowances) : 0
  form.deductions = record?.deductions != null ? Number(record.deductions) : 0
  form.note = record?.note || `Salary for ${monthLabel.value}`
  if (!record && form.staff_id) onStaffChange()
  showModal.value = true
}

async function save() {
  formError.value = ''
  saving.value = true
  try {
    const payload = {
      staff_id: form.staff_id,
      period_start: form.period_start,
      period_end: form.period_end,
      basic_salary: form.basic_salary,
      allowances: form.allowances,
      deductions: form.deductions,
      note: form.note,
    }
    if (editing.value) {
      await api.put(`/vendor/hr/payroll/${editing.value.id}`, payload)
    } else {
      payload.run_id = run.value?.id
      await api.post('/vendor/hr/payroll', payload)
    }
    showModal.value = false
    await load()
  } catch (e) {
    const err = extractError(e)
    formError.value = err.errors ? Object.values(err.errors).join('. ') : err.message
  } finally {
    saving.value = false
  }
}

async function generateRun() {
  if (!confirm(`Generate a payroll run for ${monthLabel.value}? Every active staff member will be added with their base salary.`)) return
  generating.value = true
  try {
    await api.post('/vendor/hr/payroll/runs/generate', { month: month.value })
    await load()
  } catch (e) {
    alert(extractError(e).message)
  } finally {
    generating.value = false
  }
}

async function approveRun() {
  if (!confirm(`Approve the payroll run for ${monthLabel.value} (${currency}${formatPrice(run.value.net_total)})? Lines will be locked.`)) return
  acting.value = true
  try {
    await api.post(`/vendor/hr/payroll/runs/${run.value.id}/approve`)
    await load()
  } catch (e) {
    alert(extractError(e).message)
  } finally {
    acting.value = false
  }
}

async function payRun() {
  if (!confirm(`Mark the ${monthLabel.value} run (${currency}${formatPrice(run.value.net_total)}) as paid?`)) return
  acting.value = true
  try {
    await api.post(`/vendor/hr/payroll/runs/${run.value.id}/pay`, {})
    await load()
  } catch (e) {
    alert(extractError(e).message)
  } finally {
    acting.value = false
  }
}

async function cancelRun() {
  if (!confirm(`Cancel the payroll run for ${monthLabel.value}? Its draft lines will be discarded.`)) return
  acting.value = true
  try {
    await api.post(`/vendor/hr/payroll/runs/${run.value.id}/cancel`)
    await load()
  } catch (e) {
    alert(extractError(e).message)
  } finally {
    acting.value = false
  }
}

async function removeLine(record) {
  if (!confirm(`Remove ${record.staff_name}'s line (${currency}${formatPrice(record.net_pay)}) from this run?`)) return
  try {
    await api.delete(`/vendor/hr/payroll/${record.id}`)
    await load()
  } catch (e) {
    alert(extractError(e).message)
  }
}

async function openHistory(row) {
  historyStaff.value = row
  historyRecords.value = []
  showHistory.value = true
  historyLoading.value = true
  try {
    const { data } = await api.get('/vendor/hr/payroll', { params: { staff_id: row.staff_id } })
    historyRecords.value = (data.data || []).filter((r) => !r.from_staff)
  } catch (e) {
    historyRecords.value = []
  } finally {
    historyLoading.value = false
  }
}

watch(month, () => load())

onMounted(load)
</script>
