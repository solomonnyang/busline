<template>
  <div class="container py-4" :class="{ 'bk-has-bar': !loading && trip }">
    <nav class="mb-3" aria-label="breadcrumb">
      <ol class="breadcrumb mb-0">
        <li class="breadcrumb-item"><router-link to="/customer/dashboard">Dashboard</router-link></li>
        <li class="breadcrumb-item active">Book Trip</li>
      </ol>
    </nav>

    <LoadingSpinner :show="loading" />

    <div v-if="!loading && trip" class="fade-in">
      <!-- Trip summary -->
      <div class="soft-card bk-summary">
        <div class="bk-sum-bus">
          <span class="bk-sum-bus-icon"><i class="bi bi-bus-front-fill"></i></span>
          <span class="bk-sum-bus-txt">{{ trip.vendor_name }} · {{ trip.bus_name }} ({{ trip.registration_number }})</span>
        </div>
        <div class="bk-sum-route">
          <span class="bk-sum-city">{{ trip.origin_city }}</span>
          <span class="bk-sum-arrow"><i class="bi bi-arrow-right"></i></span>
          <span class="bk-sum-city bk-sum-dest">{{ trip.destination_city }}</span>
        </div>
        <div class="bk-sum-meta">
          <span>{{ formatDate(trip.departure_date) }}</span>
          <span class="bk-sum-dot">·</span>
          <span>{{ trip.departure_time }}</span>
          <template v-if="tripDuration">
            <span class="bk-sum-dot">·</span>
            <span>{{ tripDuration }}</span>
          </template>
        </div>
        <div class="bk-sum-price">{{ currency }}{{ formatPrice(trip.price) }}<small>per seat</small></div>
      </div>

      <!-- Choose your seats -->
      <div class="soft-card bk-card">
        <div class="card-head">
          <h6 class="bk-card-title">Choose your seats</h6>
          <span class="bk-badge">{{ selectedSeats.length }} / {{ maxSeats }}</span>
        </div>
        <SeatMap v-model="selectedSeats" :seats="seats" :max="maxSeats" :layout="seatLayout" />
      </div>

      <!-- Passenger details -->
      <div class="soft-card bk-card">
        <div class="card-head">
          <h6 class="bk-card-title">Passenger details</h6>
          <span v-if="selectedSeats.length" class="bk-badge">{{ selectedSeats.length }} selected</span>
        </div>

        <div v-if="selectedSeats.length === 0" class="bk-empty">
          Select at least one seat to continue.
        </div>

        <div v-for="seatId in selectedSeats" :key="seatId" class="pax-panel">
          <div class="pax-head">
            <span class="seat-chip">Seat {{ seatNumber(seatId) }}</span>
            <span class="pax-price">{{ currency }}{{ formatPrice(trip.price) }}</span>
          </div>
          <input
            v-model="passengers[seatId].name"
            class="form-control pax-input"
            :placeholder="`Passenger ${selectedSeats.indexOf(seatId) + 1} full name`"
            required
          />
          <div class="pax-row">
            <input v-model="passengers[seatId].age" type="number" min="0" class="form-control pax-col" placeholder="Age" />
            <div class="gender-wrap pax-col">
              <button type="button" class="gender-pill" :class="{ active: passengers[seatId].gender === 'male' }" @click="toggleGender(seatId, 'male')">male</button>
              <button type="button" class="gender-pill" :class="{ active: passengers[seatId].gender === 'female' }" @click="toggleGender(seatId, 'female')">female</button>
              <button type="button" class="gender-pill" :class="{ active: passengers[seatId].gender === 'other' }" @click="toggleGender(seatId, 'other')">other</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Bottom bar -->
  <div v-if="!loading && trip" class="bk-bottombar">
    <div class="bk-bottombar-inner">
      <div class="bk-total-row">
        <span class="bk-total-lbl">Total</span>
        <span class="bk-total-amount">{{ currency }}{{ formatPrice(totalAmount) }}</span>
      </div>
      <div v-if="earlyBird" class="bk-discount">
        <span><i class="bi bi-sunrise-fill me-1"></i>Early bird · {{ earlyBird.discount_percent }}% off</span>
        <span>−{{ currency }}{{ formatPrice(discountAmount) }}</span>
      </div>
      <div class="pay-methods">
        <button type="button" class="pay-chip" :class="{ active: paymentMethod === 'wallet' }" @click="paymentMethod = 'wallet'">
          <i class="bi bi-wallet2"></i>
          <span class="pay-chip-txt">
            <span class="pay-lbl">Wallet</span>
            <span class="pay-sub">{{ walletSub }}</span>
          </span>
        </button>
        <button type="button" class="pay-chip" :class="{ active: paymentMethod === 'paystack' }" @click="paymentMethod = 'paystack'">
          <i class="bi bi-credit-card-2-front"></i>
          <span class="pay-chip-txt">
            <span class="pay-lbl">Pay online</span>
            <span class="pay-sub">Paystack</span>
          </span>
        </button>
      </div>
      <div v-if="insufficient" class="bk-error">Insufficient wallet balance. Top up in the Payment tab.</div>
      <div v-if="error" class="bk-error">{{ error }}</div>
      <button class="btn-pay" :disabled="booking || selectedSeats.length === 0" @click="submitBooking">
        <span v-if="booking" class="spinner-border spinner-border-sm"></span>
        <template v-else><i class="bi bi-lock-fill"></i>Book &amp; Pay {{ currency }}{{ formatPrice(totalAmount) }}</template>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api, { extractError } from '../../services/api'
import SeatMap from '../../components/SeatMap.vue'
import LoadingSpinner from '../../components/LoadingSpinner.vue'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const booking = ref(false)
const trip = ref(null)
const seats = ref([])
const seatLayout = ref(null)
const selectedSeats = ref([])
const passengers = reactive({})
const paymentMethod = ref('wallet')
const walletBalance = ref(null)
const error = ref('')
const currency = ref('₦')

const maxSeats = 10

const earlyBirdRules = ref(null)
const subtotal = computed(() => (trip.value ? selectedSeats.value.length * Number(trip.value.price) : 0))
const earlyBird = computed(() => {
  const r = earlyBirdRules.value
  if (!trip.value?.departure_date || !r) return null
  const days = Number(r.days ?? 0)
  const percent = Number(r.discount_percent ?? 0)
  if (days <= 0 || percent <= 0) return null
  const diff = Math.floor((new Date(String(trip.value.departure_date) + 'T00:00:00') - new Date()) / 86400000)
  if (diff < days) return null
  return { days, discount_percent: percent }
})
const discountAmount = computed(() =>
  earlyBird.value ? Math.round(subtotal.value * earlyBird.value.discount_percent * 100) / 10000 : 0
)
const totalAmount = computed(() => Math.max(0, Math.round((subtotal.value - discountAmount.value) * 100) / 100))

const walletSub = computed(() =>
  walletBalance.value !== null ? `${currency.value}${formatPrice(walletBalance.value)} available` : 'Pay from wallet'
)

const insufficient = computed(
  () => paymentMethod.value === 'wallet' && walletBalance.value !== null && walletBalance.value < totalAmount.value
)

const tripDuration = computed(() => {
  if (!trip.value?.arrival_time) return ''
  return minutesBetween(trip.value.departure_time, trip.value.arrival_time)
})

// Initialize a passenger record for each selected seat so v-model
// binding (passengers[seatId].name) never reads from undefined.
watch(
  selectedSeats,
  (list) => {
    list.forEach((seatId) => {
      if (!passengers[seatId]) {
        passengers[seatId] = { name: '', age: null, gender: '' }
      }
    })
  },
  { deep: true }
)

function seatNumber(seatId) {
  const seat = seats.value.find((s) => s.id === seatId)
  return seat ? seat.seat_number : '?'
}

function toggleGender(seatId, gender) {
  passengers[seatId].gender = passengers[seatId].gender === gender ? '' : gender
}

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

function formatDate(v) {
  if (!v) return ''
  const d = new Date(String(v) + 'T00:00:00')
  if (isNaN(d)) return String(v)
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

function formatPrice(v) {
  return Number(v).toLocaleString()
}

async function submitBooking() {
  error.value = ''
  // Validate all selected seats have passenger names.
  const pax = selectedSeats.value.map((seatId) => passengers[seatId] || {})
  if (pax.some((p) => !p.name || !p.name.trim())) {
    error.value = 'Please enter a name for every passenger.'
    return
  }
  if (insufficient.value) {
    error.value = 'Insufficient wallet balance. Top up in the Payment tab.'
    return
  }

  booking.value = true
  try {
    const payload = {
      trip_id: Number(route.params.id),
      payment_method: paymentMethod.value,
      seats: selectedSeats.value,
      passengers: pax.map((p) => ({ name: p.name, age: p.age || null, gender: p.gender || null })),
      callback_url: window.location.origin + '/payment/callback',
    }
    const { data } = await api.post('/bookings', payload)

    const bookingId = data.data.booking.id
    if (paymentMethod.value === 'paystack' && data.data.authorization_url) {
      window.location.href = data.data.authorization_url
    } else if (paymentMethod.value === 'paystack') {
      // Payment init failed (e.g. no keys) - keep pending, show message.
      error.value = data.data.paystack_error || 'Payment could not be initialized. You can pay later.'
      router.push(`/customer/bookings/${bookingId}`)
    } else {
      // Wallet payments are marked paid & confirmed server-side.
      router.push(`/customer/bookings/${bookingId}`)
    }
  } catch (e) {
    error.value = extractError(e).message
  } finally {
    booking.value = false
  }
}

onMounted(async () => {
  try {
    const [t, m] = await Promise.all([
      api.get(`/trips/${route.params.id}`),
      api.get(`/trips/${route.params.id}/seats`),
    ])
    trip.value = t.data.data
    seats.value = m.data.data.seats
    seatLayout.value = m.data.data.layout
  } catch (e) {
    error.value = extractError(e).message
  } finally {
    loading.value = false
  }
  try {
    const { data } = await api.get('/offers/rules')
    earlyBirdRules.value = data.data?.early_bird || null
  } catch {
    earlyBirdRules.value = null
  }
  try {
    const w = await api.get('/wallet')
    walletBalance.value = Number(w.data?.data?.wallet?.balance ?? null)
  } catch {
    // wallet balance is cosmetic here; the server validates anyway
  }
})
</script>

<style scoped>
.bk-has-bar { padding-bottom: 250px !important; }

.bk-summary {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
  padding: 1.25rem 1.4rem;
  margin-bottom: 1.25rem;
  background: linear-gradient(180deg, var(--brand-50) 0%, var(--surface) 55%);
  border: 1px solid var(--brand-100);
}
.bk-sum-bus { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 2px; }
.bk-sum-bus-icon {
  width: 30px;
  height: 30px;
  border-radius: 10px;
  background: var(--surface);
  color: var(--brand);
  display: grid;
  place-items: center;
  font-size: 1rem;
  flex-shrink: 0;
}
.bk-sum-bus-txt { font-size: 0.82rem; color: var(--muted); }
.bk-sum-route { display: flex; align-items: center; gap: 10px; }
.bk-sum-city { font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 1.25rem; color: var(--text); }
.bk-sum-dest { color: var(--brand-700); }
.bk-sum-arrow {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--brand);
  color: #fff;
  font-size: 0.85rem;
  display: grid;
  place-items: center;
  box-shadow: 0 4px 10px rgba(14, 147, 132, 0.35);
  flex-shrink: 0;
}
.bk-sum-meta { display: flex; align-items: center; gap: 8px; color: var(--muted); font-size: 0.82rem; margin-top: 2px; flex-wrap: wrap; justify-content: center; }
.bk-sum-dot { color: var(--muted-light); }
.bk-sum-price {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 800;
  font-size: 1.05rem;
  color: var(--accent-700);
  margin-top: 4px;
}
.bk-sum-price small { font-size: 0.72rem; font-weight: 600; color: var(--muted); }

.bk-card { padding: 1.35rem 1.4rem; margin-bottom: 1.25rem; }
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-bottom: 0.9rem;
  margin-bottom: 1.1rem;
  border-bottom: 1px dashed var(--border);
}
.bk-card-title {
  margin: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 800;
  font-size: 1.05rem;
  color: var(--text);
}
.bk-badge {
  background: var(--brand-100);
  color: var(--brand-700);
  font-weight: 800;
  font-size: 0.78rem;
  border-radius: 999px;
  padding: 0.3rem 0.85rem;
  white-space: nowrap;
}

.bk-empty {
  padding: 1.25rem 1rem;
  color: var(--muted);
  text-align: center;
  font-size: 0.88rem;
}

.pax-panel {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0.85rem;
  margin-bottom: 0.85rem;
}
.pax-panel:last-child { margin-bottom: 0; }
.pax-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.65rem;
}
.seat-chip {
  display: inline-flex;
  align-items: center;
  background: var(--brand);
  color: #0f172a;
  font-weight: 700;
  font-size: 0.78rem;
  border-radius: 999px;
  padding: 0.28rem 0.85rem;
}
.pax-price { font-size: 0.82rem; color: var(--muted); }
.pax-input { margin-bottom: 0.65rem; }
.pax-row { display: flex; gap: 0.6rem; }
.pax-col { flex: 1; min-width: 0; }
.gender-wrap { display: flex; gap: 0.35rem; align-items: center; }
.gender-pill {
  flex: 1;
  border: 1.5px solid var(--border);
  background: var(--surface);
  border-radius: var(--radius-sm);
  padding: 0.55rem 0.4rem;
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--muted);
  text-transform: capitalize;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}
.gender-pill:hover { border-color: var(--brand-100); }
.gender-pill.active {
  background: var(--brand-50);
  border-color: var(--brand);
  color: #0f172a;
}

/* Bottom bar */
.bk-bottombar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  /* Below the fixed sidebar (z-index 1040) so the bar never covers it; the
     opaque sidebar keeps the overlap invisible, so the bar only shows in the
     content column. Above page content and the sticky topbar (1030). */
  z-index: 1020;
  background: var(--surface);
  border-top-left-radius: var(--radius-xl);
  border-top-right-radius: var(--radius-xl);
  box-shadow: 0 -8px 24px rgba(43, 31, 25, 0.12);
  padding: 0.9rem 1rem 1rem;
}
.bk-bottombar-inner { max-width: 1140px; margin: 0 auto; }
.bk-total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.65rem;
}
.bk-total-lbl { font-size: 0.85rem; color: var(--muted); }
.bk-total-amount {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 800;
  font-size: 1.45rem;
  color: #0f172a;
  line-height: 1.1;
}
.bk-discount {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  background: var(--success-50, #E7F5EC);
  border: 1px dashed var(--success-500, #22c55e);
  color: var(--success-700, #15803d);
  border-radius: var(--radius);
  padding: 0.45rem 0.8rem;
  font-size: 0.8rem;
  font-weight: 700;
  margin-bottom: 0.65rem;
}
.pay-methods { display: flex; gap: 0.6rem; margin-bottom: 0.65rem; }
.pay-chip {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  border: 1.5px solid var(--border);
  background: var(--surface);
  border-radius: var(--radius);
  padding: 0.6rem 0.8rem;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
}
.pay-chip i { font-size: 1.05rem; color: var(--muted); flex-shrink: 0; }
.pay-chip:hover { border-color: var(--brand-100); }
.pay-chip.active { border-color: var(--brand); background: var(--brand-50); }
.pay-chip.active i { color: var(--brand); }
.pay-chip-txt { display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; }
.pay-lbl { font-size: 0.8rem; font-weight: 700; color: var(--text); }
.pay-sub { font-size: 0.68rem; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bk-error { color: var(--danger); font-size: 0.82rem; margin: 0 0 0.5rem; text-align: center; }
.btn-pay {
  width: 100%;
  border: 0;
  border-radius: var(--radius);
  padding: 0.85rem 1.5rem;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 800;
  font-size: 1rem;
  color: #0f172a;
  background: linear-gradient(135deg, var(--brand), var(--brand-600));
  box-shadow: 0 8px 18px rgba(14, 147, 132, 0.4);
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}
.btn-pay:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 10px 22px rgba(14, 147, 132, 0.5);
  filter: brightness(1.04);
}
.btn-pay:active:not(:disabled) { transform: translateY(1px); }
.btn-pay:disabled { background: var(--border); box-shadow: none; cursor: not-allowed; color: var(--muted); }
.btn-pay .spinner-border { color: #0f172a; }

@media (max-width: 991.98px) {
  .bk-has-bar { padding-bottom: 320px !important; }
  /* No bottom tab bar on web: sit flush with the viewport bottom. */
  .bk-bottombar { bottom: env(safe-area-inset-bottom, 0px); }
}
</style>
