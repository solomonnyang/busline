<template>
  <div class="container py-4">
    <nav class="mb-3" aria-label="breadcrumb">
      <ol class="breadcrumb mb-0">
        <li class="breadcrumb-item"><router-link to="/customer/bookings">My Bookings</router-link></li>
        <li class="breadcrumb-item active">Ticket</li>
      </ol>
    </nav>

    <LoadingSpinner :show="loading" />

    <div v-if="!loading && ticket" class="row justify-content-center fade-in">
      <div class="col-lg-8">
        <!-- Header -->
        <div class="tk-card tk-header">
          <div class="tk-header-top">
            <div>
              <div class="tk-number">{{ ticket.booking.booking_number }}</div>
              <div class="tk-date">{{ formatBookingDate(ticket.booking.booking_date) }}</div>
            </div>
            <div class="tk-badges">
              <StatusBadge :status="ticket.booking.status" />
              <StatusBadge :status="ticket.booking.payment_status" />
            </div>
          </div>

          <div class="tk-route">
            <span class="tk-city">{{ ticket.booking.origin_city }}</span>
            <i class="bi bi-arrow-right"></i>
            <span class="tk-city tk-dest">{{ ticket.booking.destination_city }}</span>
          </div>

          <div class="tk-meta-row">
            <div class="tk-meta">
              <span class="tk-meta-lbl">Departs</span>
              <span class="tk-meta-val">{{ ticket.booking.departure_date }} · {{ ticket.booking.departure_time }}</span>
            </div>
            <div v-if="ticket.booking.arrival_time" class="tk-meta">
              <span class="tk-meta-lbl">Duration</span>
              <span class="tk-meta-val">{{ duration }}</span>
            </div>
          </div>
        </div>

        <!-- Bus & operator -->
        <div class="tk-card">
          <h6 class="tk-card-title">Bus &amp; operator</h6>
          <div class="tk-bus-name">{{ ticket.booking.vendor_name }}</div>
          <div class="tk-bus-detail">
            {{ ticket.booking.bus_name }} · {{ ticket.booking.bus_type }} · {{ ticket.booking.registration_number }}
          </div>
        </div>

        <!-- Passengers & seats -->
        <div class="tk-card">
          <h6 class="tk-card-title">Passengers &amp; seats</h6>
          <div v-for="s in ticket.seats" :key="s.id" class="tk-pax">
            <span class="seat-chip">Seat {{ s.seat_number }}</span>
            <div class="tk-pax-info">
              <span class="tk-pax-name">{{ s.passenger_name }}</span>
              <span v-if="s.passenger_age || s.passenger_gender" class="tk-pax-meta">
                {{ [s.passenger_age ? `${s.passenger_age} yrs` : null, s.passenger_gender].filter(Boolean).join(' · ') }}
              </span>
            </div>
            <span class="tk-pax-price">{{ currency }}{{ formatPrice(s.ticket_price) }}</span>
          </div>
        </div>

        <!-- Payment -->
        <div class="tk-card">
          <h6 class="tk-card-title">Payment</h6>
          <div v-for="p in ticket.payments" :key="p.id" class="tk-pay">
            <div>
              <span class="tk-pay-ref">{{ p.payment_reference }}</span>
              <span class="tk-pay-method">{{ p.payment_method }} · {{ p.status }}</span>
            </div>
            <span class="tk-pay-amount">{{ currency }}{{ formatPrice(p.amount) }}</span>
          </div>
          <div class="tk-divider"></div>
          <div class="tk-total-row">
            <span class="tk-total-lbl">Total paid</span>
            <span class="tk-total-amount">{{ currency }}{{ formatPrice(ticket.booking.total_amount) }}</span>
          </div>
        </div>

        <!-- Boarding pass -->
        <div v-if="ticket.qr" class="tk-card">
          <h6 class="tk-card-title">Boarding pass</h6>
          <div class="tk-qr-wrap">
            <img :src="ticket.qr" alt="QR Code" class="tk-qr" />
          </div>
          <p class="tk-qr-hint">Show this QR to the bus staff at check-in.</p>
        </div>

        <!-- Actions -->
        <div class="d-flex gap-2 justify-content-center mt-4">
          <button class="btn btn-outline-primary" @click="printTicket">
            <i class="bi bi-printer me-1"></i>Print ticket
          </button>
          <button
            v-if="canCancel"
            class="btn btn-outline-danger"
            :disabled="cancelling"
            @click="cancelBooking"
          >
            <span v-if="cancelling" class="spinner-border spinner-border-sm me-1"></span>
            <template v-else><i class="bi bi-x-circle me-1"></i>Cancel booking</template>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import api, { extractError } from '../../services/api'
import LoadingSpinner from '../../components/LoadingSpinner.vue'
import StatusBadge from '../../components/StatusBadge.vue'

const route = useRoute()
const ticket = ref(null)
const loading = ref(true)
const error = ref('')
const cancelling = ref(false)
const currency = ref('₦')

const canCancel = computed(() => ticket.value && ['pending', 'confirmed'].includes(ticket.value.booking.status))

const duration = computed(() => {
  const b = ticket.value?.booking
  if (!b?.arrival_time) return ''
  return minutesBetween(b.departure_time, b.arrival_time)
})

function minutesBetween(from, to) {
  if (!from || !to) return ''
  const [h1, m1] = String(from).split(':').map(Number)
  const [h2, m2] = String(to).split(':').map(Number)
  let mins = h2 * 60 + m2 - (h1 * 60 + m1)
  if (mins < 0) mins += 24 * 60
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`
}

function formatBookingDate(v) {
  if (!v) return '—'
  const d = new Date(v)
  if (isNaN(d)) return String(v)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatPrice(v) {
  return Number(v).toLocaleString()
}

function printTicket() {
  window.print()
}

async function cancelBooking() {
  if (!confirm('Cancel this booking?')) return
  cancelling.value = true
  try {
    await api.post(`/bookings/${route.params.id}/cancel`)
    location.reload()
  } catch (e) {
    alert(extractError(e).message)
  } finally {
    cancelling.value = false
  }
}

onMounted(async () => {
  try {
    const { data } = await api.get(`/bookings/${route.params.id}`)
    ticket.value = data.data
  } catch (e) {
    error.value = extractError(e).message
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.tk-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  padding: 1.25rem 1.4rem;
  margin-bottom: 1rem;
}

.tk-header {
  position: relative;
  overflow: hidden;
  background: linear-gradient(160deg, var(--brand-700) 0%, var(--brand-600) 45%, var(--brand) 100%);
  border: 0;
  color: #fff;
  box-shadow: var(--shadow-brand);
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}
.tk-header::before {
  content: '';
  position: absolute;
  top: -70px;
  right: -60px;
  width: 210px;
  height: 210px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0) 70%);
  pointer-events: none;
}
.tk-header::after {
  content: '';
  position: absolute;
  bottom: -44px;
  left: -40px;
  width: 150px;
  height: 150px;
  border-radius: 50%;
  border: 20px solid rgba(255, 255, 255, 0.08);
  pointer-events: none;
}
.tk-header > * { position: relative; z-index: 1; }

.tk-header-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}
.tk-number {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 800;
  font-size: 1rem;
  color: #fff;
  letter-spacing: 0.02em;
}
.tk-date { font-size: 0.8rem; color: rgba(255, 255, 255, 0.82); margin-top: 2px; }
.tk-badges { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }

.tk-route {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 1rem;
}
.tk-route i { color: var(--accent-50); }
.tk-city {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 800;
  font-size: 1.25rem;
  color: #fff;
}
.tk-dest { color: rgba(255, 255, 255, 0.92); }

.tk-meta-row {
  display: flex;
  gap: 1.5rem;
  margin-top: 0.9rem;
}
.tk-meta { flex: 1; min-width: 0; }
.tk-meta-lbl {
  display: block;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.72);
}
.tk-meta-val {
  display: block;
  font-size: 0.82rem;
  font-weight: 600;
  color: #fff;
  margin-top: 2px;
}

.tk-card-title {
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 0.75rem;
}
.tk-bus-name { font-size: 0.95rem; font-weight: 600; color: var(--text); }
.tk-bus-detail { font-size: 0.8rem; color: var(--muted); margin-top: 4px; }

.tk-pax {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0;
}
.seat-chip {
  background: var(--brand);
  color: #0f172a;
  font-size: 0.75rem;
  font-weight: 700;
  border-radius: 999px;
  padding: 0.3rem 0.8rem;
  white-space: nowrap;
  flex-shrink: 0;
}
.tk-pax-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.tk-pax-name { font-size: 0.88rem; font-weight: 600; color: var(--text); }
.tk-pax-meta { font-size: 0.74rem; color: var(--muted); text-transform: capitalize; }
.tk-pax-price { font-size: 0.82rem; font-weight: 700; color: #0f172a; white-space: nowrap; }

.tk-pay {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.35rem 0;
}
.tk-pay > div { display: flex; flex-direction: column; min-width: 0; }
.tk-pay-ref { font-size: 0.82rem; font-weight: 600; color: var(--text); }
.tk-pay-method { font-size: 0.72rem; color: var(--muted); text-transform: capitalize; }
.tk-pay-amount { font-size: 0.85rem; font-weight: 800; color: var(--text); white-space: nowrap; }
.tk-divider { height: 1px; background: var(--border); margin: 0.7rem 0; }
.tk-total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.tk-total-lbl { font-size: 0.9rem; font-weight: 700; color: var(--text); }
.tk-total-amount {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 800;
  font-size: 1.25rem;
  color: var(--accent-700);
}

.tk-qr-wrap { display: flex; justify-content: center; padding: 0.75rem 0; }
.tk-qr { width: 180px; height: 180px; }
.tk-qr-hint { font-size: 0.74rem; color: var(--muted); text-align: center; margin: 0; }
</style>
