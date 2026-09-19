<template>
  <div>
    <div class="row g-3 g-lg-4 mb-4">
      <div class="col-6 col-xl-3">
        <div class="stat-widget fade-up">
          <div class="stat-ico" style="background: var(--warning-50); color: var(--warning-700)"><i class="bi bi-hourglass-split"></i></div>
          <div class="fs-3 fw-bold lh-1 font-display mt-2"><CountUp :end="countByStatus.pending" /></div>
          <div class="text-muted small mt-1">Pending</div>
        </div>
      </div>
      <div class="col-6 col-xl-3">
        <div class="stat-widget fade-up delay-1">
          <div class="stat-ico" style="background: var(--success-50); color: var(--success-700)"><i class="bi bi-check-circle"></i></div>
          <div class="fs-3 fw-bold lh-1 font-display mt-2"><CountUp :end="countByStatus.approved" /></div>
          <div class="text-muted small mt-1">Approved</div>
        </div>
      </div>
      <div class="col-6 col-xl-3">
        <div class="stat-widget fade-up delay-2">
          <div class="stat-ico" style="background: var(--danger-50); color: var(--danger-600)"><i class="bi bi-x-circle"></i></div>
          <div class="fs-3 fw-bold lh-1 font-display mt-2"><CountUp :end="countByStatus.rejected" /></div>
          <div class="text-muted small mt-1">Rejected</div>
        </div>
      </div>
      <div class="col-6 col-xl-3">
        <div class="stat-widget fade-up delay-3">
          <div class="stat-ico" style="background: var(--brand-50); color: var(--brand-700)"><i class="bi bi-calendar2-week"></i></div>
          <div class="fs-3 fw-bold lh-1 font-display mt-2"><CountUp :end="totalDays" /></div>
          <div class="text-muted small mt-1">Days approved</div>
        </div>
      </div>
    </div>

    <div class="soft-card fade-up">
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 p-3 pb-0">
        <div class="d-flex flex-wrap align-items-center gap-2">
          <select v-model="filters.status" class="form-select form-select-sm" style="width: auto" aria-label="Filter by status">
            <option value="">Any status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select v-model="filters.staff_id" class="form-select form-select-sm" style="width: auto" aria-label="Filter by staff">
            <option value="">All staff</option>
            <option v-for="s in staffList" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
          <button v-if="filters.status || filters.staff_id" class="btn btn-sm btn-ghost" @click="filters.status = ''; filters.staff_id = ''">
            <i class="bi bi-x-lg me-1"></i>Clear
          </button>
        </div>
        <button class="btn btn-primary" @click="openModal()">
          <i class="bi bi-plus-lg me-1"></i>New leave
        </button>
      </div>

      <LoadingSpinner :show="loading" />
      <div v-if="!loading && leaves.length === 0" class="p-4">
        <EmptyState
          icon="bi-calendar2-week"
          title="No leave requests"
          message="Create a leave request for a staff member."
        />
      </div>
      <div v-else-if="!loading && filtered.length === 0" class="p-4">
        <EmptyState icon="bi-search" title="No requests match" message="Try a different filter." />
      </div>
      <div v-else class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead>
            <tr>
              <th>Staff</th>
              <th>Type</th>
              <th>Dates</th>
              <th>Days</th>
              <th>Reason</th>
              <th>Status</th>
              <th class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="l in filtered" :key="l.id">
              <td class="small">
                <div class="fw-semibold">{{ l.staff_name }}</div>
                <span class="text-muted">{{ roleLabel(l.staff_role) }}</span>
              </td>
              <td><span class="chip" :style="typeChipStyle(l.leave_type)">{{ typeLabel(l.leave_type) }}</span></td>
              <td class="small text-nowrap">
                <div>{{ shortDate(l.start_date) }} → {{ shortDate(l.end_date) }}</div>
                <span v-if="l.status === 'approved' && l.approved_by_name" class="text-muted">By {{ l.approved_by_name }}</span>
              </td>
              <td class="small fw-semibold">{{ l.days }} day{{ l.days === 1 ? '' : 's' }}</td>
              <td class="small text-muted" style="max-width: 220px">
                <span class="text-truncate d-inline-block" style="max-width: 100%">{{ l.reason || '—' }}</span>
              </td>
              <td><StatusBadge :status="l.status" /></td>
              <td class="text-end">
                <div class="d-flex gap-1 justify-content-end flex-wrap">
                  <template v-if="l.status === 'pending'">
                    <button class="btn btn-sm btn-success" @click="setStatus(l, 'approved')">
                      <i class="bi bi-check-lg me-1"></i>Approve
                    </button>
                    <button class="btn btn-sm btn-outline-danger" @click="setStatus(l, 'rejected')">
                      <i class="bi bi-x-lg me-1"></i>Reject
                    </button>
                    <button class="btn btn-sm btn-outline-primary" @click="openModal(l)">
                      <i class="bi bi-pencil me-1"></i>Edit
                    </button>
                  </template>
                  <template v-else-if="l.status === 'approved'">
                    <button class="btn btn-sm btn-outline-secondary" @click="setStatus(l, 'cancelled')">
                      <i class="bi bi-slash-circle me-1"></i>Cancel
                    </button>
                  </template>
                  <button class="btn btn-sm btn-outline-danger" @click="remove(l)">
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add / Edit leave modal -->
    <div v-if="showModal" class="modal fade show d-block" tabindex="-1" style="background: rgba(0, 0, 0, 0.5)">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h6 class="modal-title fw-bold"><i class="bi bi-calendar2-week me-1"></i>{{ editing ? 'Edit leave request' : 'New leave request' }}</h6>
            <button class="btn-close" @click="showModal = false"></button>
          </div>
          <div class="modal-body">
            <div v-if="formError" class="alert alert-danger py-2 small">{{ formError }}</div>

            <div class="mb-3">
              <label class="form-label fw-semibold">Staff member</label>
              <select v-model="form.staff_id" class="form-select" :disabled="editing">
                <option value="">Select staff…</option>
                <option v-for="s in staffList" :key="s.id" :value="s.id">{{ s.name }} — {{ roleLabel(s.role) }}</option>
              </select>
            </div>
            <div class="row g-2">
              <div class="col-sm-6 mb-3">
                <label class="form-label fw-semibold">Leave type</label>
                <select v-model="form.leave_type" class="form-select">
                  <option v-for="t in leaveTypes" :key="t" :value="t">{{ typeLabel(t) }}</option>
                </select>
              </div>
              <div class="col-sm-6 mb-3">
                <label class="form-label fw-semibold">Duration</label>
                <div class="d-flex align-items-center gap-2">
                  <input v-model="form.start_date" type="date" class="form-control" required />
                  <span class="text-muted small">→</span>
                  <input v-model="form.end_date" type="date" class="form-control" required />
                </div>
              </div>
            </div>
            <div class="mb-3">
              <label class="form-label fw-semibold">Reason</label>
              <textarea v-model.trim="form.reason" class="form-control" rows="2" placeholder="Reason for leave" maxlength="500"></textarea>
            </div>
            <div class="d-flex justify-content-between align-items-center bg-light rounded p-3 small">
              <span class="text-muted">Days</span>
              <span class="fw-bold fs-6 font-display">{{ daysComputed }}</span>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-sm btn-light" @click="showModal = false">Cancel</button>
            <button class="btn btn-sm btn-primary" :disabled="saving || !canSave" @click="save">
              <span v-if="saving" class="spinner-border spinner-border-sm"></span>
              <span v-else><i class="bi bi-check-lg me-1"></i>{{ editing ? 'Save changes' : 'Create request' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import api, { extractError } from '../../services/api'
import StatusBadge from '../StatusBadge.vue'
import LoadingSpinner from '../LoadingSpinner.vue'
import EmptyState from '../EmptyState.vue'
import CountUp from '../CountUp.vue'

const loading = ref(true)
const leaves = ref([])
const staffList = ref([])
const filters = reactive({ status: '', staff_id: '' })
const leaveTypes = ['annual', 'sick', 'personal', 'maternity', 'paternity', 'unpaid', 'other']

const showModal = ref(false)
const editing = ref(null)
const saving = ref(false)
const formError = ref('')
const form = reactive({ staff_id: '', leave_type: 'annual', start_date: '', end_date: '', reason: '' })

function roleLabel(role) {
  return { manager: 'Manager', operator: 'Operator', accountant: 'Accountant', support: 'Support', driver: 'Driver', viewer: 'Viewer' }[role] || role
}

function typeLabel(t) {
  return { annual: 'Annual', sick: 'Sick', personal: 'Personal', maternity: 'Maternity', paternity: 'Paternity', unpaid: 'Unpaid', other: 'Other' }[t] || t
}

function shortDate(v) {
  if (!v) return '—'
  const d = new Date(String(v).replace(' ', 'T'))
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

const countByStatus = computed(() => ({
  pending: leaves.value.filter((l) => l.status === 'pending').length,
  approved: leaves.value.filter((l) => l.status === 'approved').length,
  rejected: leaves.value.filter((l) => l.status === 'rejected').length,
}))

const totalDays = computed(() => leaves.value.filter((l) => l.status === 'approved').reduce((sum, l) => sum + Number(l.days || 0), 0))

const filtered = computed(() =>
  leaves.value.filter((l) => {
    if (filters.status && l.status !== filters.status) return false
    if (filters.staff_id && l.staff_id !== filters.staff_id) return false
    return true
  })
)

const daysComputed = computed(() => {
  if (!form.start_date || !form.end_date) return '—'
  const start = new Date(form.start_date + 'T00:00:00')
  const end = new Date(form.end_date + 'T00:00:00')
  if (end < start) return 'Invalid range'
  return Math.round((end - start) / 86400000) + 1 + (end >= start ? ' day(s)' : '')
})

const canSave = computed(() => form.staff_id && form.start_date && form.end_date && new Date(form.end_date + 'T00:00:00') >= new Date(form.start_date + 'T00:00:00'))

function typeChipStyle(type) {
  const colors = {
    annual: { bg: 'var(--brand-50)', color: 'var(--brand-700)' },
    sick: { bg: 'var(--danger-50)', color: 'var(--danger-600)' },
    personal: { bg: 'var(--success-50)', color: 'var(--success-700)' },
    maternity: { bg: 'var(--warning-50)', color: 'var(--warning-700)' },
    paternity: { bg: 'var(--secondary-50)', color: 'var(--secondary-700)' },
    unpaid: { bg: 'var(--secondary-50)', color: 'var(--secondary-700)' },
    other: { bg: 'var(--secondary-50)', color: 'var(--secondary-700)' },
  }
  const c = colors[type] || colors.other
  return { background: c.bg, color: c.color }
}

async function load() {
  loading.value = true
  try {
    const [list, staff] = await Promise.all([
      api.get('/vendor/hr/leaves'),
      api.get('/vendor/hr/staff'),
    ])
    leaves.value = list.data.data || []
    staffList.value = staff.data.data || []
  } catch (e) {
    leaves.value = []
    staffList.value = []
  } finally {
    loading.value = false
  }
}

function openModal(leave = null) {
  editing.value = leave
  formError.value = ''
  form.staff_id = leave?.staff_id || ''
  form.leave_type = leave?.leave_type || 'annual'
  form.start_date = leave?.start_date || ''
  form.end_date = leave?.end_date || ''
  form.reason = leave?.reason || ''
  showModal.value = true
}

async function save() {
  formError.value = ''
  saving.value = true
  try {
    const payload = {
      staff_id: form.staff_id,
      leave_type: form.leave_type,
      start_date: form.start_date,
      end_date: form.end_date,
      reason: form.reason,
    }
    if (editing.value) {
      await api.put(`/vendor/hr/leaves/${editing.value.id}`, payload)
    } else {
      await api.post('/vendor/hr/leaves', payload)
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

async function setStatus(leave, status) {
  const action = { approved: 'approve', rejected: 'reject', cancelled: 'cancel' }[status]
  if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${leave.staff_name}'s leave?`)) return
  try {
    await api.put(`/vendor/hr/leaves/${leave.id}/status`, { status })
    await load()
  } catch (e) {
    alert(extractError(e).message)
  }
}

async function remove(leave) {
  if (!confirm(`Delete this leave request for ${leave.staff_name}?`)) return
  try {
    await api.delete(`/vendor/hr/leaves/${leave.id}`)
    await load()
  } catch (e) {
    alert(extractError(e).message)
  }
}

onMounted(load)
</script>
