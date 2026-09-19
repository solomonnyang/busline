<template>
  <div>
    <!-- Headline stats -->
    <div class="row g-3 g-lg-4 mb-4">
      <div class="col-6 col-xl-3">
        <div class="stat-widget fade-up">
          <div class="d-flex justify-content-between align-items-start mb-3">
            <div class="stat-ico" style="background: var(--brand-50); color: var(--brand-700)">
              <i class="bi bi-people"></i>
            </div>
            <span class="trend trend-up"><i class="bi bi-check2"></i>Team</span>
          </div>
          <div class="fs-3 fw-bold lh-1 font-display"><CountUp :end="overview.headcount" /></div>
          <div class="text-muted small mt-1">Active staff</div>
        </div>
      </div>
      <div class="col-6 col-xl-3">
        <div class="stat-widget fade-up delay-1">
          <div class="d-flex justify-content-between align-items-start mb-3">
            <div class="stat-ico" style="background: var(--success-50); color: var(--success-700)">
              <i class="bi bi-person-check"></i>
            </div>
            <span class="trend trend-up"><i class="bi bi-check2"></i>Today</span>
          </div>
          <div class="fs-3 fw-bold lh-1 font-display"><CountUp :end="overview.present_today" /></div>
          <div class="text-muted small mt-1">Present today</div>
        </div>
      </div>
      <div class="col-6 col-xl-3">
        <div class="stat-widget fade-up delay-2">
          <div class="d-flex justify-content-between align-items-start mb-3">
            <div class="stat-ico" style="background: var(--secondary-50); color: var(--secondary-700)">
              <i class="bi bi-pause-circle"></i>
            </div>
            <span class="trend trend-down"><i class="bi bi-calendar-x"></i>Leave</span>
          </div>
          <div class="fs-3 fw-bold lh-1 font-display"><CountUp :end="overview.on_leave_today" /></div>
          <div class="text-muted small mt-1">On leave today</div>
        </div>
      </div>
      <div class="col-6 col-xl-3">
        <div class="stat-widget fade-up delay-3">
          <div class="d-flex justify-content-between align-items-start mb-3">
            <div class="stat-ico" style="background: var(--warning-50); color: var(--warning-700)">
              <i class="bi bi-hourglass-split"></i>
            </div>
            <span class="trend" style="color: var(--warning-700); background: var(--warning-50)">
              <i class="bi bi-exclamation-triangle"></i>Pending
            </span>
          </div>
          <div class="fs-3 fw-bold lh-1 font-display"><CountUp :end="overview.pending_leaves" /></div>
          <div class="text-muted small mt-1">Leave requests pending</div>
        </div>
      </div>
    </div>

    <div class="row g-3 g-lg-4 mb-4">
      <div class="col-lg-7">
        <div class="soft-card h-100 fade-up">
          <div class="d-flex justify-content-between align-items-center gap-2 p-3 pb-0">
            <h6 class="fw-bold mb-0"><i class="bi bi-graph-up me-2 text-brand"></i>Payroll cost — last 6 months</h6>
            <span class="small text-muted">Net pay</span>
          </div>
          <div class="p-3">
            <LoadingSpinner :show="loading" />
            <div v-if="!loading && chartBars.length === 0" class="text-muted small py-4 text-center">No payroll records yet.</div>
            <div v-else-if="!loading" class="d-flex align-items-end gap-2" style="height: 200px">
              <div v-for="b in chartBars" :key="b.month" class="flex-grow-1 d-flex flex-column justify-content-end text-center">
                <span class="small fw-semibold mb-1 text-nowrap">{{ currency }}{{ b.compact }}</span>
                <div class="chart-bar chart-bar-rev" :style="{ height: b.pct + '%' }" :title="`${b.month}: ${currency}${b.total}`"></div>
                <span class="chart-label mt-1">{{ shortMonth(b.month) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-lg-5">
        <div class="soft-card h-100 fade-up">
          <div class="d-flex justify-content-between align-items-center gap-2 p-3 pb-0">
            <h6 class="fw-bold mb-0"><i class="bi bi-pie-chart me-2 text-brand"></i>Departments</h6>
          </div>
          <div class="p-3">
            <LoadingSpinner :show="loading" />
            <div v-if="!loading && overview.department_breakdown.length === 0" class="text-muted small py-4 text-center">Add staff to see a breakdown.</div>
            <div v-else-if="!loading" class="route-list">
              <div v-for="(d, i) in overview.department_breakdown" :key="d.department" class="route-item">
                <div class="d-flex justify-content-between align-items-center gap-2 mb-1">
                  <span class="fw-semibold small text-truncate">{{ d.department }}</span>
                  <span class="small fw-semibold text-nowrap">{{ d.count }}</span>
                </div>
                <div class="progress" style="height: 6px">
                  <div class="progress-bar" :style="{ width: deptPct(d) + '%', background: deptColor(i) }"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-3 g-lg-4">
      <div class="col-lg-4">
        <div class="soft-card h-100 fade-up">
          <div class="p-3 pb-2">
            <h6 class="fw-bold mb-1"><i class="bi bi-check2-circle me-2 text-brand"></i>Attendance rate</h6>
            <div class="text-muted small mb-3">Last 30 days</div>
          </div>
          <div class="p-3 pt-0 text-center">
            <div class="fs-2 fw-bold font-display">{{ overview.attendance_rate_30d ?? '—' }}<span class="fs-6 text-muted">%</span></div>
            <div class="progress mt-2" style="height: 8px">
              <div class="progress-bar" :class="rateTone(overview.attendance_rate_30d)" :style="{ width: (overview.attendance_rate_30d ?? 0) + '%' }"></div>
            </div>
            <div class="text-muted small mt-2">Present / late / half-day out of recorded days</div>
          </div>
        </div>
      </div>
      <div class="col-lg-4">
        <div class="soft-card h-100 fade-up delay-1">
          <div class="p-3 pb-2">
            <h6 class="fw-bold mb-1"><i class="bi bi-wallet2 me-2 text-brand"></i>Payroll this month</h6>
            <div class="text-muted small mb-3">{{ monthLabel }}</div>
          </div>
          <div class="p-3 pt-0 text-center">
            <div class="fs-5 fw-bold font-display">{{ currency }}{{ formatPrice(overview.payroll_month_total) }}</div>
            <div class="text-muted small">Total net pay</div>
            <hr class="my-2" />
            <div class="fs-6 fw-semibold font-display" style="color: var(--success-700)">{{ currency }}{{ formatPrice(overview.payroll_month_paid) }}</div>
            <div class="text-muted small">Paid</div>
          </div>
        </div>
      </div>
      <div class="col-lg-4">
        <div class="soft-card h-100 fade-up delay-2">
          <div class="p-3 pb-2">
            <h6 class="fw-bold mb-1"><i class="bi bi-calendar-check me-2 text-brand"></i>Today's headcount</h6>
            <div class="text-muted small mb-3">Active staff vs attendance</div>
          </div>
          <div class="p-3 pt-0">
            <div class="d-flex justify-content-between small mb-1">
              <span class="text-muted">Present</span>
              <span class="fw-semibold">{{ overview.present_today }}</span>
            </div>
            <div class="d-flex justify-content-between small mb-1">
              <span class="text-muted">Absent</span>
              <span class="fw-semibold">{{ overview.absent_today }}</span>
            </div>
            <div class="d-flex justify-content-between small mb-1">
              <span class="text-muted">On leave</span>
              <span class="fw-semibold">{{ overview.on_leave_today }}</span>
            </div>
            <div class="d-flex justify-content-between small">
              <span class="text-muted">Not recorded</span>
              <span class="fw-semibold">{{ unrecorded }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '../../services/api'
import LoadingSpinner from '../LoadingSpinner.vue'
import CountUp from '../CountUp.vue'

const loading = ref(true)
const overview = ref({
  headcount: 0, total_staff: 0, present_today: 0, absent_today: 0,
  on_leave_today: 0, pending_leaves: 0, attendance_rate_30d: null,
  payroll_month_total: 0, payroll_month_paid: 0,
  monthly_payroll: [], department_breakdown: [],
})
const currency = '₦'

const monthLabel = new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

const chartBars = computed(() => {
  const rows = overview.value.monthly_payroll || []
  const max = Math.max(1, ...rows.map((r) => Number(r.total)))
  return rows.map((r) => ({
    month: r.month,
    total: Number(r.total),
    compact: compactPrice(Number(r.total)),
    pct: Math.max(2, Math.round((Number(r.total) / max) * 100)),
  }))
})

const unrecorded = computed(() =>
  Math.max(0, overview.value.headcount - overview.value.present_today - overview.value.absent_today - overview.value.on_leave_today)
)

function compactPrice(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'm'
  if (n >= 1000) return (n / 1000).toFixed(0) + 'k'
  return String(n)
}

function shortMonth(m) {
  return new Date(m + '-01').toLocaleDateString(undefined, { month: 'short' })
}

function formatPrice(v) {
  const n = Number(v || 0)
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function deptPct(d) {
  const max = Math.max(1, ...(overview.value.department_breakdown || []).map((x) => Number(x.count)))
  return Math.round((Number(d.count) / max) * 100)
}

function deptColor(i) {
  const palette = ['var(--brand)', 'var(--success-600)', 'var(--warning-500)', 'var(--info)', 'var(--danger-400)']
  return palette[i % palette.length]
}

function rateTone(v) {
  if (v == null) return 'bg-secondary'
  if (v >= 90) return 'bg-success'
  if (v >= 75) return 'bg-warning'
  return 'bg-danger'
}

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/vendor/hr/overview')
    overview.value = data.data || overview.value
  } catch (e) {
    overview.value = { ...overview.value, monthly_payroll: [], department_breakdown: [] }
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
