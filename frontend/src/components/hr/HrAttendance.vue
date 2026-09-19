<template>
  <div>
    <div class="soft-card fade-up mb-4">
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 p-3 pb-0">
        <div class="d-flex flex-wrap align-items-center gap-2">
          <h6 class="fw-bold mb-0"><i class="bi bi-calendar3 me-2 text-brand"></i>Attendance</h6>
          <input v-model="date" type="date" class="form-control form-control-sm" style="width: auto" aria-label="Attendance date" />
          <button class="btn btn-sm btn-ghost" @click="date = today">Today</button>
        </div>
        <div class="d-flex flex-wrap gap-2 small">
          <span class="chip chip-success"><i class="bi bi-check-circle me-1"></i>{{ dayCounts.present + dayCounts.late + dayCounts.half_day }} present</span>
          <span class="chip chip-danger"><i class="bi bi-x-circle me-1"></i>{{ dayCounts.absent }} absent</span>
          <span class="chip chip-neutral"><i class="bi bi-calendar-x me-1"></i>{{ dayCounts.leave + dayCounts.holiday }} off</span>
        </div>
      </div>

      <LoadingSpinner :show="loading" />

      <!-- Bulk marking -->
      <div v-if="!loading" class="p-3">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span class="small fw-semibold text-muted">Mark attendance for {{ shortDate(date) }}</span>
          <button class="btn btn-sm btn-primary" :disabled="saving || !anyDirty" @click="saveAll">
            <span v-if="saving" class="spinner-border spinner-border-sm"></span>
            <span v-else><i class="bi bi-check2-all me-1"></i>Save attendance</span>
          </button>
        </div>
        <div v-if="rows.length === 0" class="text-muted small py-3 text-center">No active staff to mark.</div>
        <div v-else class="table-responsive">
          <table class="table table-sm align-middle mb-0">
            <thead>
              <tr>
                <th>Staff</th>
                <th style="width: 150px">Status</th>
                <th style="width: 130px">Check in</th>
                <th style="width: 130px">Check out</th>
                <th style="width: 110px">Hours</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in rows" :key="r.staff.id">
                <td class="small">
                  <div class="fw-semibold">{{ r.staff.name }}</div>
                  <span class="text-muted">{{ roleLabel(r.staff.role) }}</span>
                </td>
                <td>
                  <select v-model="r.status" class="form-select form-select-sm">
                    <option value="">Not recorded</option>
                    <option v-for="s in statusOptions" :key="s" :value="s">{{ statusLabel(s) }}</option>
                  </select>
                </td>
                <td>
                  <input v-model="r.check_in" type="time" class="form-control form-control-sm" :disabled="!isWorkday(r.status)" />
                </td>
                <td>
                  <input v-model="r.check_out" type="time" class="form-control form-control-sm" :disabled="!isWorkday(r.status)" />
                </td>
                <td class="small text-muted">{{ hoursFor(r) }}</td>
                <td>
                  <input v-model="r.note" type="text" class="form-control form-control-sm" placeholder="—" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="soft-card fade-up">
      <div class="d-flex justify-content-between align-items-center gap-2 p-3 pb-0">
        <h6 class="fw-bold mb-0"><i class="bi bi-list-check me-2 text-brand"></i>Records — {{ shortDate(date) }}</h6>
        <span class="small text-muted">{{ records.length }} record{{ records.length === 1 ? '' : 's' }}</span>
      </div>
      <div class="p-3">
        <div v-if="!loading && records.length === 0" class="text-muted small py-3 text-center">
          No records for this date yet.
        </div>
        <div v-else class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Staff</th>
                <th>Status</th>
                <th>Check in</th>
                <th>Check out</th>
                <th>Hours</th>
                <th>Note</th>
                <th class="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="rec in records" :key="rec.id">
                <td class="small fw-semibold">{{ rec.staff_name }}</td>
                <td><StatusBadge :status="rec.status" /></td>
                <td class="small">{{ rec.check_in || '—' }}</td>
                <td class="small">{{ rec.check_out || '—' }}</td>
                <td class="small">{{ rec.hours_worked || '0' }}h</td>
                <td class="small text-muted">{{ rec.note || '—' }}</td>
                <td class="text-end">
                  <button class="btn btn-sm btn-outline-danger" @click="remove(rec)">
                    <i class="bi bi-trash"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import api, { extractError } from '../../services/api'
import StatusBadge from '../StatusBadge.vue'
import LoadingSpinner from '../LoadingSpinner.vue'

const today = new Date().toISOString().split('T')[0]
const date = ref(today)
const loading = ref(true)
const saving = ref(false)
const staffList = ref([])
const records = ref([])
const statusOptions = ['present', 'late', 'half_day', 'absent', 'leave', 'holiday']

function roleLabel(role) {
  return { manager: 'Manager', operator: 'Operator', accountant: 'Accountant', support: 'Support', driver: 'Driver', viewer: 'Viewer' }[role] || role
}

function statusLabel(s) {
  return { present: 'Present', late: 'Late', half_day: 'Half day', absent: 'Absent', leave: 'On leave', holiday: 'Holiday' }[s] || s
}

function isWorkday(status) {
  return status === 'present' || status === 'late' || status === 'half_day'
}

function shortDate(v) {
  if (!v) return '—'
  const d = new Date(v + 'T00:00:00')
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function hoursFor(r) {
  if (r.hours_worked) return r.hours_worked + 'h'
  if (r.check_in && r.check_out) {
    const [sh, sm] = r.check_in.split(':').map(Number)
    const [eh, em] = r.check_out.split(':').map(Number)
    let mins = (eh * 60 + em) - (sh * 60 + sm)
    if (mins < 0) mins += 24 * 60
    return (mins / 60).toFixed(2) + 'h'
  }
  return '—'
}

// Bulk editing rows: one per active staff member, prefilled from today's records.
const rows = ref([])

const recordsByStaff = computed(() => {
  const map = {}
  for (const r of records.value) map[String(r.staff_id)] = r
  return map
})

const dayCounts = computed(() => {
  const counts = { present: 0, late: 0, half_day: 0, absent: 0, leave: 0, holiday: 0 }
  for (const r of records.value) counts[r.status] = (counts[r.status] || 0) + 1
  return counts
})

const anyDirty = computed(() => rows.value.some((r) => r.status || r.check_in || r.check_out || r.note))

async function load() {
  loading.value = true
  try {
    const [att, staff] = await Promise.all([
      api.get('/vendor/hr/attendance', { params: { date: date.value } }),
      api.get('/vendor/hr/staff'),
    ])
    records.value = att.data.data || []
    staffList.value = (staff.data.data || []).filter((s) => s.is_active)
    buildRows()
  } catch (e) {
    records.value = []
    staffList.value = []
    rows.value = []
  } finally {
    loading.value = false
  }
}

function buildRows() {
  const map = recordsByStaff.value
  rows.value = staffList.value.map((s) => {
    const rec = map[String(s.id)]
    return {
      staff: s,
      status: rec?.status || '',
      check_in: rec?.check_in || '',
      check_out: rec?.check_out || '',
      note: rec?.note || '',
    }
  })
}

async function saveAll() {
  const payload = rows.value
    .filter((r) => r.status)
    .map((r) => ({
      staff_id: r.staff.id,
      status: r.status,
      check_in: isWorkday(r.status) ? r.check_in || null : null,
      check_out: isWorkday(r.status) ? r.check_out || null : null,
      note: r.note || null,
    }))
  if (payload.length === 0) return

  saving.value = true
  try {
    await api.post('/vendor/hr/attendance', { date: date.value, records: payload })
    await load()
  } catch (e) {
    alert(extractError(e).message)
  } finally {
    saving.value = false
  }
}

async function remove(rec) {
  if (!confirm(`Delete attendance for ${rec.staff_name} on ${rec.date}?`)) return
  try {
    await api.delete(`/vendor/hr/attendance/${rec.id}`)
    await load()
  } catch (e) {
    alert(extractError(e).message)
  }
}

watch(date, () => load())
onMounted(load)
</script>
