<template>
  <div class="py-2">
    <h5 class="fw-bold mb-4">Support</h5>

    <div class="sup-hero">
      <div class="sup-hero-icon"><i class="bi bi-headset"></i></div>
      <div class="sup-hero-title">How can we help?</div>
      <div class="sup-hero-sub">
        Find answers to common questions or reach our support team — we usually reply within a few hours.
      </div>
    </div>

    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3">
      <div class="sup-section-label mb-0">My tickets</div>
      <button class="btn btn-sm btn-primary" @click="openCreate">
        <i class="bi bi-plus-lg me-1"></i>New ticket
      </button>
    </div>
    <div class="card stat-card">
      <LoadingSpinner :show="loading" />
      <div v-if="!loading && tickets.length === 0" class="sup-empty">
        <i class="bi bi-inbox"></i>
        <div class="sup-empty-title">No tickets yet</div>
        <div class="sup-empty-sub">Something on your mind? Open a ticket and our team will get back to you.</div>
      </div>
      <button
        v-for="(t, i) in tickets"
        :key="t.id"
        type="button"
        class="sup-ticket"
        :class="{ 'sup-last': i === tickets.length - 1 }"
        @click="openThread(t.id)"
      >
        <div class="sup-ticket-ico"><i class="bi bi-life-preserver"></i></div>
        <div class="sup-ticket-body">
          <div class="d-flex flex-wrap align-items-center gap-2">
            <span class="sup-ticket-subject">{{ t.subject }}</span>
            <StatusBadge :status="t.status" />
          </div>
          <div class="sup-ticket-meta">
            {{ t.ticket_number }} · {{ catLabel(t.category) }} · {{ prioLabel(t.priority) }} · {{ t.message_count }} message{{ t.message_count === 1 ? '' : 's' }}
          </div>
        </div>
        <i class="bi bi-chevron-right sup-open"></i>
      </button>
    </div>

    <div class="sup-section-label">Contact us</div>
    <div class="card stat-card">
      <a
        v-for="(c, i) in CHANNELS"
        :key="c.label"
        :href="c.href"
        target="_blank"
        rel="noopener"
        class="sup-channel"
        :class="{ 'sup-last': i === CHANNELS.length - 1 }"
      >
        <div class="sup-channel-ico"><i :class="c.icon"></i></div>
        <div class="sup-channel-body">
          <div class="sup-channel-label">{{ c.label }}</div>
          <div class="sup-channel-value">{{ c.value }}</div>
        </div>
        <i class="bi bi-box-arrow-up-right sup-open"></i>
      </a>
    </div>

    <div class="sup-section-label">Frequently asked questions</div>
    <div class="card stat-card">
      <div v-for="(f, i) in FAQS" :key="i" :class="{ 'sup-last': i === FAQS.length - 1 }">
        <button
          type="button"
          class="sup-faq-header"
          :class="{ open: openIndex === i }"
          @click="toggle(i)"
        >
          <span class="sup-faq-q">{{ f.q }}</span>
          <i :class="openIndex === i ? 'bi bi-chevron-up' : 'bi bi-chevron-down'"></i>
        </button>
        <div v-if="openIndex === i" class="sup-faq-body">
          <p class="sup-faq-a">{{ f.a }}</p>
        </div>
      </div>
    </div>

    <p class="sup-footer">
      Support available Monday – Saturday, 7am – 9pm. For emergencies on the road, call our dispatch line first.
    </p>

    <!-- New ticket modal -->
    <div v-if="showCreate" class="modal fade show d-block" tabindex="-1" style="background: rgba(0, 0, 0, 0.5)">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h6 class="modal-title fw-bold"><i class="bi bi-life-preserver me-1 text-brand"></i>New ticket</h6>
            <button class="btn-close" @click="showCreate = false"></button>
          </div>
          <form @submit.prevent="submitCreate">
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label">Subject</label>
                <input v-model.trim="form.subject" type="text" class="form-control" required minlength="3" maxlength="150" placeholder="Brief summary of your issue" />
              </div>
              <div class="row g-2 mb-3">
                <div class="col-6">
                  <label class="form-label">Category</label>
                  <select v-model="form.category" class="form-select">
                    <option v-for="c in categories" :key="c.value" :value="c.value">{{ c.label }}</option>
                  </select>
                </div>
                <div class="col-6">
                  <label class="form-label">Priority</label>
                  <select v-model="form.priority" class="form-select">
                    <option v-for="p in priorities" :key="p.value" :value="p.value">{{ p.label }}</option>
                  </select>
                </div>
              </div>
              <div>
                <label class="form-label">Message</label>
                <textarea v-model.trim="form.message" class="form-control" rows="4" required minlength="5" maxlength="5000" placeholder="Give us the details so we can help faster"></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-sm btn-light" @click="showCreate = false">Cancel</button>
              <button type="submit" class="btn btn-sm btn-primary" :disabled="saving">
                <span v-if="saving" class="spinner-border spinner-border-sm"></span>
                <span v-else><i class="bi bi-send me-1"></i>Submit ticket</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Ticket thread modal -->
    <div v-if="active" class="modal fade show d-block" tabindex="-1" style="background: rgba(0, 0, 0, 0.5)">
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
            <button class="btn-close" @click="closeThread"></button>
          </div>
          <div class="modal-body">
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
                      <div class="ticket-quote-label">{{ isAdminMsg(m) ? 'Support replied to a message' : 'You replied to a message' }}</div>
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
                <div class="ticket-quote-bar-label">Replying to {{ isAdminMsg(quote) ? 'support' : 'you' }}</div>
                <div class="ticket-quote-bar-body">{{ quote.body }}</div>
              </div>
              <button type="button" class="btn-close" @click="quote = null"></button>
            </div>
            <form v-if="active.status !== 'closed'" class="mt-3" @submit.prevent="submitReply">
              <label class="form-label">Reply</label>
              <textarea
                v-model.trim="replyMessage"
                class="form-control"
                rows="3"
                required
                maxlength="5000"
                placeholder="Type your reply…"
                @keydown.enter.exact.prevent="submitReply"
              ></textarea>
              <div class="mt-2 d-flex justify-content-between align-items-center">
                <small class="text-muted">Swipe a message right to reply · hold a message to react</small>
                <button type="submit" class="btn btn-sm btn-primary" :disabled="saving">
                  <span v-if="saving" class="spinner-border spinner-border-sm"></span>
                  <span v-else><i class="bi bi-send me-1"></i>Send reply</span>
                </button>
              </div>
            </form>
            <div v-else class="alert alert-light border mt-3 mb-0 small text-muted">
              This ticket is closed. Contact us directly if you need further help.
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import api, { extractError } from '../../services/api'
import LoadingSpinner from '../../components/LoadingSpinner.vue'
import StatusBadge from '../../components/StatusBadge.vue'
import { useAuthStore } from '../../stores/auth'

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏']
const auth = useAuthStore()

const FAQS = [
  {
    q: 'How do I cancel a booking?',
    a: 'Open the booking from My Bookings and use the cancel option. Only pending or confirmed bookings can be cancelled. Refunds depend on the payment method used.',
  },
  {
    q: 'What happens if my payment fails?',
    a: 'Your booking is kept as pending so you can try again. You can reach out to us with your booking reference and we will help you complete or refund the payment.',
  },
  {
    q: 'How do I get my ticket?',
    a: 'Once your payment is confirmed, open the booking in My Bookings and tap to view your ticket. The QR code on the ticket is scanned by the bus operator at boarding.',
  },
  {
    q: 'Can I change my seat after booking?',
    a: 'Seat changes are handled by the bus operator before departure. Contact support with your booking reference and we will assist if seats are available.',
  },
  {
    q: 'What happens if I miss my bus?',
    a: 'Please contact support as soon as possible. Depending on the operator and how close the departure is, we may be able to transfer you to a later trip.',
  },
]

const CHANNELS = [
  { icon: 'bi bi-telephone', label: 'Call us', value: '0800 BUSLINE (0800 287 5463)', href: 'tel:+2348002875463' },
  { icon: 'bi bi-envelope', label: 'Email us', value: 'support@busline.ng', href: 'mailto:support@busline.ng' },
  { icon: 'bi bi-chat-dots', label: 'WhatsApp', value: '+234 800 287 5463', href: 'https://wa.me/2348002875463' },
]

const categories = [
  { value: 'general', label: 'General' },
  { value: 'booking', label: 'Booking' },
  { value: 'payment', label: 'Payment' },
  { value: 'refund', label: 'Refund' },
  { value: 'technical', label: 'Technical' },
  { value: 'other', label: 'Other' },
]
const priorities = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

const openIndex = ref(0)
const loading = ref(true)
const saving = ref(false)
const tickets = ref([])
const showCreate = ref(false)
const active = ref(null)
const replyMessage = ref('')
const threadEl = ref(null)
const form = ref({ subject: '', category: 'general', priority: 'medium', message: '' })
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
      const { data } = await api.get(`/support/tickets/${active.value.id}`)
      active.value = data.data
      scrollThread()
    } catch (e) {
      // keep current thread on transient errors
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
    startPolling()
    scrollThread()
  } else {
    stopPolling()
  }
})

onBeforeUnmount(stopPolling)

function toggle(i) {
  openIndex.value = openIndex.value === i ? null : i
}

function catLabel(v) {
  return categories.find((c) => c.value === v)?.label || v || '—'
}

function prioLabel(v) {
  const m = { low: 'Low priority', medium: 'Medium priority', high: 'High priority' }
  return m[v] || v || '—'
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
    const { data } = await api.post(`/support/tickets/${active.value.id}/messages/${m.id}/react`, { emoji })
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

function openCreate() {
  form.value = { subject: '', category: 'general', priority: 'medium', message: '' }
  showCreate.value = true
}

async function submitCreate() {
  saving.value = true
  try {
    const { data } = await api.post('/support/tickets', form.value)
    tickets.value.unshift(data.data)
    showCreate.value = false
    await openThread(data.data.id)
  } catch (e) {
    alert(extractError(e).message)
  } finally {
    saving.value = false
  }
}

async function openThread(id) {
  active.value = null
  try {
    const { data } = await api.get(`/support/tickets/${id}`)
    active.value = data.data
    replyMessage.value = ''
    quote.value = null
    reactionTarget.value = null
    dragOffsets.value = {}
    gesture = null
  } catch (e) {
    alert(extractError(e).message)
  }
}

function closeThread() {
  active.value = null
  stopPolling()
  quote.value = null
  reactionTarget.value = null
  dragOffsets.value = {}
  gesture = null
}

async function submitReply() {
  if (!replyMessage.value.trim() || saving.value) return
  saving.value = true
  try {
    const { data } = await api.post(`/support/tickets/${active.value.id}/reply`, {
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

onMounted(async () => {
  try {
    const { data } = await api.get('/support/tickets')
    tickets.value = data.data
  } catch (e) {
    tickets.value = []
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.sup-hero {
  text-align: center;
  padding: 1.5rem 1rem 1rem;
}
.sup-hero-icon {
  width: 60px;
  height: 60px;
  border-radius: 20px;
  background: var(--brand-100);
  color: var(--brand);
  display: grid;
  place-items: center;
  font-size: 1.5rem;
  margin: 0 auto 0.75rem;
}
.sup-hero-title { font-size: 1.2rem; font-weight: 800; color: var(--text); }
.sup-hero-sub {
  font-size: 0.82rem;
  color: var(--muted);
  margin: 0.3rem auto 0;
  max-width: 320px;
  line-height: 1.5;
}
.sup-section-label {
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 1.1rem 0 0.5rem;
  padding: 0 0.25rem;
}
.sup-channel {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.9rem 1rem;
  border-bottom: 1px solid var(--border);
  color: inherit;
  text-decoration: none;
  transition: background 0.15s ease;
}
.sup-channel:hover { background: var(--brand-50); }
.sup-last { border-bottom: 0; }
.sup-channel-ico {
  width: 40px;
  height: 40px;
  border-radius: 13px;
  background: var(--brand-100);
  color: var(--brand);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.sup-channel-body { flex: 1; min-width: 0; }
.sup-channel-label { font-size: 0.92rem; font-weight: 700; color: var(--text); }
.sup-channel-value { font-size: 0.76rem; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sup-open { color: var(--muted); opacity: 0.7; font-size: 0.8rem; }
.sup-ticket {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  width: 100%;
  border: 0;
  background: transparent;
  padding: 0.9rem 1rem;
  border-bottom: 1px solid var(--border);
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease;
}
.sup-ticket:hover { background: var(--brand-50); }
.sup-ticket-ico {
  width: 40px;
  height: 40px;
  border-radius: 13px;
  background: var(--brand-100);
  color: var(--brand);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.sup-ticket-body { flex: 1; min-width: 0; }
.sup-ticket-subject { font-size: 0.92rem; font-weight: 700; color: var(--text); }
.sup-ticket-meta { font-size: 0.74rem; color: var(--muted); margin-top: 2px; }
.sup-empty { text-align: center; padding: 1.6rem 1rem; color: var(--muted); }
.sup-empty i { font-size: 1.6rem; opacity: 0.5; }
.sup-empty-title { font-weight: 700; color: var(--text); margin-top: 0.4rem; }
.sup-empty-sub { font-size: 0.78rem; max-width: 320px; margin: 0.2rem auto 0; }
.sup-faq-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  border: 0;
  background: transparent;
  padding: 0.9rem 1rem;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  text-align: left;
}
.sup-faq-header.open { border-bottom-color: transparent; }
.sup-faq-q { flex: 1; font-size: 0.86rem; font-weight: 600; color: var(--text); line-height: 1.35; }
.sup-faq-header i { color: var(--muted); }
.sup-faq-body {
  padding: 0.25rem 1rem 0.9rem;
  border-bottom: 1px solid var(--border);
  background: var(--surface-alt);
}
.sup-faq-a { font-size: 0.82rem; color: var(--muted); line-height: 1.55; margin: 0; }
.sup-footer {
  font-size: 0.74rem;
  color: var(--muted);
  opacity: 0.9;
  text-align: center;
  margin: 1.2rem 1rem 0;
  line-height: 1.5;
}
.ticket-thread {
  max-height: 380px;
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
  justify-content: flex-end;
}
.ticket-msg-wrap-admin {
  justify-content: flex-start;
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
  background: #d9fdd3;
  border-bottom-right-radius: 3px;
}
.ticket-msg-customer::before {
  content: '';
  position: absolute;
  right: -3px;
  bottom: 0;
  width: 10px;
  height: 10px;
  background: #d9fdd3;
  transform: rotate(45deg);
}
.ticket-msg-admin {
  background: #fff;
  border-bottom-left-radius: 3px;
}
.ticket-msg-admin::before {
  content: '';
  position: absolute;
  left: -3px;
  bottom: 0;
  width: 10px;
  height: 10px;
  background: #fff;
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
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.74rem;
  color: var(--muted);
  padding: 4px 2px 0;
}
.sup-typing-off .sup-live-dot {
  background: var(--muted);
  animation: none;
}
</style>
