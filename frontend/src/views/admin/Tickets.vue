<template>
  <div class="py-2">
    <div class="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4 fade-up">
      <div>
        <div class="section-eyebrow"><i class="bi bi-life-preserver"></i>Support</div>
        <h4 class="fw-bold mb-1">Tickets</h4>
        <p class="text-muted small mb-0">View, reply to and resolve customer support tickets.</p>
      </div>
      <button class="btn btn-ghost" @click="load">
        <i class="bi bi-arrow-clockwise me-1"></i>Refresh
      </button>
    </div>

    <div class="row g-3 g-lg-4 mb-4">
      <div v-for="s in statusWidgets" :key="s.key" class="col-6 col-xl-3">
        <div class="stat-widget fade-up" :class="'delay-' + s.delay">
          <div class="d-flex justify-content-between align-items-start mb-3">
            <div class="stat-ico" :style="{ background: s.bg, color: s.color }"><i :class="s.icon"></i></div>
            <span class="trend"><i :class="s.trendIcon"></i>{{ s.label }}</span>
          </div>
          <div class="fs-3 fw-bold lh-1 font-display"><CountUp :end="s.count" /></div>
          <div class="text-muted small mt-1">{{ s.sub }}</div>
        </div>
      </div>
    </div>

    <div class="soft-card fade-up">
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 p-3 pb-0">
        <div class="d-flex flex-wrap align-items-center gap-2">
          <div class="search-control" style="width: 260px; max-width: 100%">
            <i class="bi bi-search text-muted"></i>
            <input v-model="search" type="text" placeholder="Search number, subject or customer…" aria-label="Search tickets" />
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
          <select v-model="priority" class="form-select form-select-sm" style="width: 140px" aria-label="Priority">
            <option value="">All priorities</option>
            <option v-for="p in priorities" :key="p.value" :value="p.value">{{ p.label }}</option>
          </select>
          <select v-model="category" class="form-select form-select-sm" style="width: 150px" aria-label="Category">
            <option value="">All categories</option>
            <option v-for="c in categories" :key="c.value" :value="c.value">{{ c.label }}</option>
          </select>
        </div>
        <span class="small text-muted">{{ filtered.length }} ticket{{ filtered.length === 1 ? '' : 's' }}</span>
      </div>

      <LoadingSpinner :show="loading" />
      <div v-if="!loading && tickets.length === 0" class="p-4">
        <EmptyState icon="bi-life-preserver" title="No tickets yet" message="Customer support tickets will appear here." />
      </div>
      <div v-else-if="!loading && filtered.length === 0" class="p-4">
        <EmptyState icon="bi-search" title="No tickets match" message="Try a different search or filter." />
      </div>
      <div v-else class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Subject</th>
              <th>Customer</th>
              <th>Category</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Msgs</th>
              <th>Opened</th>
              <th class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in filtered" :key="t.id">
              <td class="small fw-semibold text-brand" style="white-space: nowrap">{{ t.ticket_number }}</td>
              <td class="small fw-semibold" style="max-width: 260px">{{ t.subject }}</td>
              <td class="small">
                <div class="fw-semibold">{{ t.customer_name || '—' }}</div>
                <span class="text-muted">{{ t.customer_email }}</span>
              </td>
              <td class="small text-capitalize">{{ catLabel(t.category) }}</td>
              <td><span class="chip" :class="prioClass(t.priority)">{{ prioLabel(t.priority) }}</span></td>
              <td><StatusBadge :status="t.status" /></td>
              <td class="small text-muted">{{ t.message_count }}</td>
              <td class="small" style="white-space: nowrap">{{ formatDate(t.created_at) }}</td>
              <td class="text-end">
                <button class="btn btn-sm btn-ghost" @click="openDetail(t.id)">
                  <i class="bi bi-eye me-1"></i>View
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Ticket detail modal -->
    <div v-if="showDetail" class="modal fade show d-block" tabindex="-1" style="background: rgba(0, 0, 0, 0.5)">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <div>
              <h6 class="modal-title fw-bold"><i class="bi bi-life-preserver me-1 text-brand"></i>{{ active.subject }}</h6>
              <div class="small text-muted d-flex align-items-center gap-2">
                {{ active.ticket_number }} · <StatusBadge :status="active.status" />
                <span v-if="active.status !== 'closed'" class="sup-live"><span class="sup-live-dot"></span>Live</span>
              </div>
            </div>
            <button class="btn-close" @click="closeDetail"></button>
          </div>
          <div class="modal-body">
            <div class="row g-2 mb-3">
              <div class="col-6 col-md-4">
                <label class="form-label">Status</label>
                <select v-model="edit.status" class="form-select form-select-sm">
                  <option v-for="s in editStatuses" :key="s.value" :value="s.value">{{ s.label }}</option>
                </select>
              </div>
              <div class="col-6 col-md-4">
                <label class="form-label">Priority</label>
                <select v-model="edit.priority" class="form-select form-select-sm">
                  <option v-for="p in priorities" :key="p.value" :value="p.value">{{ p.label }}</option>
                </select>
              </div>
              <div class="col-6 col-md-4">
                <label class="form-label">Assigned to</label>
                <select v-model="edit.assigned_to" class="form-select form-select-sm">
                  <option :value="null">Unassigned</option>
                  <option v-for="a in admins" :key="a.id" :value="a.id">{{ a.name }}</option>
                </select>
              </div>
            </div>
            <div class="d-flex justify-content-end mb-3">
              <button class="btn btn-sm btn-primary" :disabled="saving" @click="saveTicket">
                <span v-if="saving" class="spinner-border spinner-border-sm"></span>
                <span v-else><i class="bi bi-check2 me-1"></i>Save changes</span>
              </button>
            </div>

            <div class="d-flex flex-wrap gap-2 small text-muted mb-3 pb-2 border-bottom">
              <span><i class="bi bi-person me-1"></i>{{ active.customer_name || '—' }}</span>
              <span><i class="bi bi-envelope me-1"></i>{{ active.customer_email }}</span>
              <span v-if="active.assignee_name"><i class="bi bi-person-badge me-1"></i>{{ active.assignee_name }}</span>
              <span v-if="active.category"><i class="bi bi-tag me-1"></i>{{ catLabel(active.category) }}</span>
            </div>

            <div
              ref="threadEl"
              class="ticket-thread"
              @click="onThreadClick"
              @pointerdown="onThreadPointerDown"
            >
              <template v-for="(m, i) in active.messages" :key="m.id">
                <div v-if="i === 0 || !sameDay(m.created_at, active.messages[i - 1].created_at)" class="ticket-date">
                  {{ formatDay(m.created_at) }}
                </div>
                <div
                  class="ticket-msg-wrap"
                  :class="isAdminMsg(m) ? 'ticket-msg-wrap-admin' : 'ticket-msg-wrap-customer'"
                  style="touch-action: pan-y"
                  @pointerdown="startMsgGesture($event, m)"
                  @pointermove="moveMsgGesture($event)"
                  @pointerup="endMsgGesture($event, m)"
                  @pointercancel="endMsgGesture($event, m)"
                  @contextmenu.prevent
                >
                  <div
                    class="ticket-msg"
                    :class="isAdminMsg(m) ? 'ticket-msg-admin' : 'ticket-msg-customer'"
                    :style="dragStyle(m.id)"
                  >
                    <div v-if="m.reply_to_id && m.reply_to_body != null" class="ticket-quote">
                      <div class="ticket-quote-label">{{ isAdminMsg(m) ? 'Support replied to a message' : 'Customer replied to a message' }}</div>
                      <div class="ticket-quote-body">{{ m.reply_to_body }}</div>
                    </div>
                    <div class="ticket-msg-body">{{ m.body }}</div>
                    <div class="ticket-msg-meta">
                      <span class="ticket-msg-time">{{ formatTime(m.created_at) }}</span>
                      <i v-if="isAdminMsg(m)" class="bi bi-check2-all ticket-msg-tick"></i>
                    </div>
                    <div v-if="reactionGroups(m).length" class="ticket-reactions">
                      <button
                        v-for="g in reactionGroups(m)"
                        :key="g.emoji"
                        type="button"
                        class="ticket-reaction"
                        :class="{ mine: g.mine }"
                        :disabled="active.status === 'closed'"
                        @click.stop="sendReaction(m, g.emoji)"
                      >
                        {{ g.emoji }} <span>{{ g.count }}</span>
                      </button>
                    </div>
                  </div>
                </div>
                <div v-if="reactionTarget && reactionTarget.id === m.id" class="ticket-reaction-picker">
                  <button
                    v-for="e in REACTION_EMOJIS"
                    :key="e"
                    type="button"
                    class="ticket-reaction-opt"
                    :disabled="active.status === 'closed'"
                    @click.stop="sendReaction(m, e)"
                  >
                    {{ e }}
                  </button>
                </div>
              </template>
            </div>

            <div v-if="active.status !== 'closed' && quote" class="ticket-quote-bar">
              <i class="bi bi-arrow-return-left"></i>
              <div class="ticket-quote-bar-text">
                <div class="ticket-quote-bar-label">Replying to {{ isAdminMsg(quote) ? 'support' : 'customer' }}</div>
                <div class="ticket-quote-bar-body">{{ quote.body }}</div>
              </div>
              <button type="button" class="btn-close" @click="quote = null"></button>
            </div>

            <div class="mt-2 d-flex justify-content-between align-items-center gap-2">
              <span class="sup-typing" :class="{ 'sup-typing-off': !online }">
                <span class="sup-live-dot"></span>{{ online ? 'Customer is online' : 'Reconnecting…' }}
              </span>
            </div>

            <form class="mt-2" @submit.prevent="submitReply">
              <label class="form-label">Reply as support</label>
              <textarea
                v-model.trim="replyMessage"
                class="form-control"
                rows="3"
                required
                maxlength="5000"
                placeholder="Type a reply for the customer…"
                @keydown.enter.exact.prevent="submitReply"
              ></textarea>
              <div class="mt-2 d-flex justify-content-between align-items-center">
                <small class="text-muted">Press Enter to send · Shift+Enter for a new line</small>
                <button type="submit" class="btn btn-sm btn-primary" :disabled="saving">
                  <span v-if="saving" class="spinner-border spinner-border-sm"></span>
                  <span v-else><i class="bi bi-send me-1"></i>Send reply</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import api, { extractError } from '../../services/api'
import LoadingSpinner from '../../components/LoadingSpinner.vue'
import EmptyState from '../../components/EmptyState.vue'
import CountUp from '../../components/CountUp.vue'
import StatusBadge from '../../components/StatusBadge.vue'
import { useAuthStore } from '../../stores/auth'

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏']
const auth = useAuthStore()

const loading = ref(true)
const saving = ref(false)
const tickets = ref([])
const admins = ref([])
const search = ref('')
const status = ref('')
const priority = ref('')
const category = ref('')

const statuses = [
  { value: '', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]
const editStatuses = statuses.filter((s) => s.value)
const priorities = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]
const categories = [
  { value: 'general', label: 'General' },
  { value: 'booking', label: 'Booking' },
  { value: 'payment', label: 'Payment' },
  { value: 'refund', label: 'Refund' },
  { value: 'technical', label: 'Technical' },
  { value: 'other', label: 'Other' },
]

const showDetail = ref(false)
const active = ref(null)
const edit = ref({ status: '', priority: '', assigned_to: null })
const replyMessage = ref('')
const online = ref(true)
const threadEl = ref(null)
const quote = ref(null)
const reactionTarget = ref(null)
const dragOffsets = ref({})

let pollTimer = null
let gesture = null

function scrollThread() {
  nextTick(() => {
    if (threadEl.value) threadEl.value.scrollTop = threadEl.value.scrollHeight
  })
}

function startPolling() {
  stopPolling()
  if (!active.value || active.value.status === 'closed') return
  pollTimer = setInterval(async () => {
    if (document.hidden) return
    try {
      const { data } = await api.get(`/admin/tickets/${active.value.id}`)
      online.value = true
      active.value = data.data
      scrollThread()
    } catch (e) {
      online.value = false
    }
  }, 5000)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

watch(active, (val) => {
  if (val) {
    online.value = true
    startPolling()
    scrollThread()
  } else {
    stopPolling()
  }
})

onBeforeUnmount(stopPolling)

const catLabel = (v) => categories.find((c) => c.value === v)?.label || v || '—'
const prioLabel = (v) => ({ low: 'Low', medium: 'Medium', high: 'High' })[v] || v || '—'
const prioClass = (v) => ({ low: 'chip-success', medium: 'chip-warning', high: 'chip-danger' })[v] || 'chip-neutral'

function formatDate(v) {
  if (!v) return '—'
  const d = new Date(String(v).replace(' ', 'T') + 'Z')
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTime(v) {
  if (!v) return ''
  const d = new Date(String(v).replace(' ', 'T') + 'Z')
  if (isNaN(d.getTime())) return v
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function isAdminMsg(m) {
  return Number(m.is_admin) === 1
}

function sameDay(a, b) {
  if (!a || !b) return false
  const da = new Date(String(a).replace(' ', 'T') + 'Z')
  const db = new Date(String(b).replace(' ', 'T') + 'Z')
  return !isNaN(da.getTime()) && !isNaN(db.getTime()) && da.toDateString() === db.toDateString()
}

function formatDay(v) {
  if (!v) return ''
  const d = new Date(String(v).replace(' ', 'T') + 'Z')
  if (isNaN(d.getTime())) return v
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function reactionGroups(m) {
  const reactions = Array.isArray(m.reactions) ? m.reactions : []
  const map = new Map()
  for (const r of reactions) {
    const entry = map.get(r.emoji) || { count: 0, mine: false }
    entry.count += 1
    if (Number(r.user_id) === auth.user?.id) entry.mine = true
    map.set(r.emoji, entry)
  }
  return Array.from(map.entries()).map(([emoji, v]) => ({ emoji, ...v }))
}

async function sendReaction(m, emoji) {
  if (!active.value || active.value.status === 'closed') return
  try {
    const { data } = await api.post(`/admin/tickets/${active.value.id}/messages/${m.id}/react`, { emoji })
    active.value = data.data
  } catch (e) {
    alert(extractError(e).message)
  } finally {
    reactionTarget.value = null
  }
}

function dragStyle(id) {
  const dx = dragOffsets.value[id] || 0
  return dx ? { transform: `translateX(${dx}px)` } : null
}

function startMsgGesture(e, m) {
  if (!active.value || active.value.status === 'closed') return
  if (e.target.closest('.ticket-reaction, .ticket-reaction-picker')) return
  reactionTarget.value = null
  if (e.pointerType === 'mouse' && e.button !== 0) return
  gesture = {
    id: m.id,
    message: m,
    startX: e.clientX,
    startY: e.clientY,
    dragging: false,
  }
  try {
    e.currentTarget.setPointerCapture(e.pointerId)
  } catch (err) {
    // ignore capture failures
  }
  gesture.longPressTimer = setTimeout(() => {
    if (gesture && !gesture.dragging) {
      reactionTarget.value = gesture.message
      dragOffsets.value[gesture.id] = 0
    }
  }, 500)
}

function moveMsgGesture(e) {
  if (!gesture) return
  const dx = e.clientX - gesture.startX
  const dy = e.clientY - gesture.startY
  if (!gesture.dragging && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.5) {
    gesture.dragging = true
    clearTimeout(gesture.longPressTimer)
  }
  if (gesture.dragging && dx > 0) {
    dragOffsets.value[gesture.id] = Math.min(dx, 90)
  }
}

function endMsgGesture(e, m) {
  if (!gesture) return
  clearTimeout(gesture.longPressTimer)
  const offset = dragOffsets.value[gesture.id] || 0
  if (gesture.dragging && offset > 60) {
    quote.value = gesture.message
  }
  if (gesture.dragging) {
    dragOffsets.value[gesture.id] = 0
  }
  gesture = null
}

function onThreadPointerDown(e) {
  if (reactionTarget.value && !e.target.closest('.ticket-reaction-picker')) {
    reactionTarget.value = null
  }
}

function onThreadClick(e) {
  if (reactionTarget.value && !e.target.closest('.ticket-reaction-picker')) {
    reactionTarget.value = null
  }
}

const statusWidgets = computed(() => {
  const count = (s) => tickets.value.filter((t) => t.status === s).length
  return [
    { key: 'open', label: 'Open', count: count('open'), icon: 'bi-inbox', bg: 'var(--brand-50)', color: 'var(--brand-700)', trendIcon: 'bi-inbox', sub: 'Awaiting response', delay: 1 },
    { key: 'in_progress', label: 'In progress', count: count('in_progress'), icon: 'bi-hourglass-split', bg: 'var(--warning-50)', color: 'var(--warning-700)', trendIcon: 'bi-hourglass-split', sub: 'Being worked on', delay: 2 },
    { key: 'resolved', label: 'Resolved', count: count('resolved'), icon: 'bi-check2-circle', bg: 'var(--success-50)', color: 'var(--success-700)', trendIcon: 'bi-check2', sub: 'Handled', delay: 3 },
    { key: 'closed', label: 'Closed', count: count('closed'), icon: 'bi-archive', bg: 'var(--surface-2)', color: 'var(--text)', trendIcon: 'bi-archive', sub: 'Closed tickets', delay: 4 },
  ]
})

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return tickets.value.filter((t) => {
    if (status.value && t.status !== status.value) return false
    if (priority.value && t.priority !== priority.value) return false
    if (category.value && t.category !== category.value) return false
    if (!q) return true
    return (
      (t.ticket_number || '').toLowerCase().includes(q) ||
      (t.subject || '').toLowerCase().includes(q) ||
      (t.customer_name || '').toLowerCase().includes(q) ||
      (t.customer_email || '').toLowerCase().includes(q)
    )
  })
})

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/admin/tickets')
    tickets.value = data.data
  } catch (e) {
    tickets.value = []
  } finally {
    loading.value = false
  }
}

async function loadAdmins() {
  try {
    const { data } = await api.get('/admin/users')
    admins.value = data.data.filter((u) => u.role_slug === 'super_admin')
  } catch (e) {
    admins.value = []
  }
}

async function openDetail(id) {
  closeDetail()
  try {
    const { data } = await api.get(`/admin/tickets/${id}`)
    active.value = data.data
    edit.value = {
      status: active.value.status,
      priority: active.value.priority,
      assigned_to: active.value.assigned_to ? Number(active.value.assigned_to) : null,
    }
    replyMessage.value = ''
    quote.value = null
    reactionTarget.value = null
    dragOffsets.value = {}
    gesture = null
    showDetail.value = true
  } catch (e) {
    alert(extractError(e).message)
  }
}

function closeDetail() {
  showDetail.value = false
  stopPolling()
  quote.value = null
  reactionTarget.value = null
  dragOffsets.value = {}
  gesture = null
}

async function saveTicket() {
  saving.value = true
  try {
    const { data } = await api.put(`/admin/tickets/${active.value.id}`, edit.value)
    active.value = data.data
    const idx = tickets.value.findIndex((t) => t.id === active.value.id)
    if (idx !== -1) tickets.value[idx] = { ...tickets.value[idx], ...data.data }
  } catch (e) {
    alert(extractError(e).message)
  } finally {
    saving.value = false
  }
}

async function submitReply() {
  if (!replyMessage.value.trim() || saving.value) return
  saving.value = true
  try {
    const { data } = await api.post(`/admin/tickets/${active.value.id}/reply`, {
      message: replyMessage.value,
      reply_to: quote.value ? quote.value.id : undefined,
    })
    active.value = data.data
    replyMessage.value = ''
    quote.value = null
    const idx = tickets.value.findIndex((t) => t.id === active.value.id)
    if (idx !== -1) tickets.value[idx] = { ...tickets.value[idx], ...data.data }
    scrollThread()
  } catch (e) {
    alert(extractError(e).message)
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  load()
  loadAdmins()
})
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
.ticket-thread {
  max-height: 360px;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.8rem 0.8rem 1.1rem;
  background: #efeae2;
  border-radius: 14px;
}
.ticket-msg-wrap {
  position: relative;
  display: flex;
}
.ticket-msg-wrap-customer {
  justify-content: flex-start;
}
.ticket-msg-wrap-admin {
  justify-content: flex-end;
}
.ticket-msg {
  position: relative;
  max-width: 80%;
  padding: 0.45rem 0.7rem 0.4rem;
  font-size: 0.84rem;
  border-radius: 16px;
  word-wrap: break-word;
  box-shadow: 0 1px 0.5px rgba(0, 0, 0, 0.08);
  will-change: transform;
}
.ticket-msg-customer {
  background: #fff;
  border-bottom-left-radius: 3px;
}
.ticket-msg-customer::before {
  content: '';
  position: absolute;
  left: -3px;
  bottom: 0;
  width: 10px;
  height: 10px;
  background: #fff;
  transform: rotate(45deg);
}
.ticket-msg-admin {
  background: #d9fdd3;
  border-bottom-right-radius: 3px;
}
.ticket-msg-admin::before {
  content: '';
  position: absolute;
  right: -3px;
  bottom: 0;
  width: 10px;
  height: 10px;
  background: #d9fdd3;
  transform: rotate(45deg);
}
.ticket-msg-body {
  color: #111b21;
  line-height: 1.45;
  white-space: pre-wrap;
}
.ticket-quote {
  border-left: 3px solid var(--brand);
  background: rgba(255, 255, 255, 0.35);
  border-radius: 6px;
  padding: 4px 8px;
  margin-bottom: 5px;
}
.ticket-quote-label {
  font-size: 0.66rem;
  font-weight: 700;
  color: var(--brand-700, #B45309);
  line-height: 1.2;
}
.ticket-quote-body {
  font-size: 0.78rem;
  color: rgba(17, 27, 33, 0.72);
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.ticket-reactions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 3px;
}
.ticket-reaction {
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.85);
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 1px 8px;
  color: #111b21;
  cursor: pointer;
}
.ticket-reaction.mine {
  border-color: var(--brand);
  background: var(--brand-100, #FDF1DE);
  color: var(--brand-700, #B45309);
}
.ticket-reaction:disabled {
  cursor: default;
  opacity: 0.65;
}
.ticket-reaction-picker {
  align-self: center;
  display: flex;
  gap: 2px;
  background: #fff;
  border-radius: 999px;
  padding: 4px 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
  margin: 3px 0;
  position: relative;
  z-index: 2;
}
.ticket-reaction-opt {
  border: 0;
  background: transparent;
  font-size: 1.2rem;
  line-height: 1;
  padding: 4px 7px;
  border-radius: 50%;
  transition: transform 0.12s ease;
  cursor: pointer;
}
.ticket-reaction-opt:hover {
  transform: scale(1.25);
}
.ticket-reaction-opt:disabled {
  opacity: 0.5;
}
.ticket-quote-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--brand-50, #eefaf7);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 8px 12px;
  margin-top: 12px;
  color: var(--brand);
}
.ticket-quote-bar-text {
  flex: 1;
  min-width: 0;
}
.ticket-quote-bar-label {
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--brand-700, #B45309);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.ticket-quote-bar-body {
  font-size: 0.78rem;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ticket-quote-bar .btn-close {
  font-size: 0.6rem;
}
.ticket-msg-meta {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  margin-top: 2px;
}
.ticket-msg-time {
  font-size: 0.66rem;
  color: rgba(17, 27, 33, 0.5);
  line-height: 1;
}
.ticket-msg-tick {
  font-size: 0.72rem;
  color: #53bdeb;
  line-height: 1;
}
.ticket-date {
  align-self: center;
  background: rgba(255, 255, 255, 0.85);
  color: #667781;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 3px 11px;
  border-radius: 8px;
  margin: 0.15rem 0 0.3rem;
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.06);
  white-space: nowrap;
}
.sup-live {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--success, #16a34a);
}
.sup-live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--success, #16a34a);
  display: inline-block;
  flex-shrink: 0;
  animation: supPulse 1.6s ease-in-out infinite;
}
@keyframes supPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}
.sup-typing {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.74rem;
  color: var(--muted);
}
.sup-typing-off .sup-live-dot {
  background: var(--muted);
  animation: none;
}
</style>
