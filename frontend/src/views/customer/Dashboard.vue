<template>
  <div class="cx-dash">
    <!-- ================= HEADER ================= -->
    <header class="cx-head">
      <span class="cx-date-chip"><i class="bi bi-calendar3"></i>{{ todayLabel }}</span>
      <h1 class="cx-title">Good {{ greeting }}, {{ firstName }} <span class="cx-wave">👋</span></h1>
      <p class="cx-sub">Where are you headed today?</p>
    </header>

    <!-- ================= ROUTE / SEARCH CARD ================= -->
    <div class="cx-route">
      <div class="cx-route-head">
        <span class="cx-route-ico"><i class="bi bi-search"></i></span>
        <div class="cx-route-head-body">
          <strong>Find a trip</strong>
          <small>Search routes, compare fares and book your seat.</small>
        </div>
      </div>

      <!-- From -->
      <div class="cx-field" :class="{ 'has-hint': detectedCity || detectError }">
        <div class="cx-field-ico from"><i class="bi bi-navigation-fill"></i></div>
        <div class="cx-field-body">
          <span class="cx-field-hint">From</span>
          <div class="cx-field-control">
            <select id="cx-from" v-model="from" @change="onFromChange">
              <option value="" disabled>Where from?</option>
              <option v-for="c in cities" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
        </div>
        <button class="cx-detect" type="button" :title="detecting ? 'Detecting…' : 'Use my location'" @click="detectLocation">
          <i class="bi bi-crosshair" :class="{ spin: detecting }"></i>
        </button>
      </div>
      <span v-if="detectedCity" class="cx-hint ok"><i class="bi bi-check-circle-fill me-1"></i>{{ detectedCity.name }} · using your location</span>
      <span v-else-if="detectError" class="cx-hint err"><i class="bi bi-exclamation-circle me-1"></i>{{ detectError }}</span>

      <!-- Swap -->
      <div class="cx-divider">
        <span class="cx-line"></span>
        <button class="cx-swap" type="button" title="Swap route" @click="swapRoute"><i class="bi bi-arrow-down-up"></i></button>
        <span class="cx-line"></span>
      </div>

      <!-- To -->
      <div class="cx-field">
        <div class="cx-field-ico to"><i class="bi bi-flag-fill"></i></div>
        <div class="cx-field-body">
          <span class="cx-field-hint">To</span>
          <div class="cx-field-control">
            <input
              id="cx-dest"
              v-model="destination"
              type="text"
              placeholder="Where to?"
              autocomplete="off"
              @input="onDestInput"
              @focus="openSuggestions"
              @blur="onDestBlur"
            />
          </div>
        </div>
        <span v-if="loadingSuggest" class="spinner-border spinner-border-sm text-brand"></span>
        <span v-else-if="destinationMeta" class="cx-ok"><i class="bi bi-check2"></i></span>
      </div>

      <div v-if="suggestionOpen && suggestions.length" class="cx-suggest" @mousedown.prevent>
        <div v-for="(g, gi) in suggestionGroups" :key="gi" class="cx-suggest-group">
          <div class="cx-suggest-label">{{ g.label }}</div>
          <button v-for="s in g.items" :key="s.type + '-' + s.id" type="button" class="cx-suggest-item" @mousedown.prevent="pickSuggestion(s)">
            <span class="cx-suggest-icon"><i :class="s.type === 'city' ? 'bi bi-building' : 'bi bi-bus-front-fill'"></i></span>
            <span class="cx-suggest-text">
              <strong>{{ s.label }}</strong>
              <small>{{ s.sub }}</small>
            </span>
            <i class="bi bi-arrow-up-right-circle"></i>
          </button>
        </div>
      </div>

      <!-- Popular destinations -->
      <div class="cx-popular">
        <span class="cx-popular-label">Popular</span>
        <div class="cx-popular-list">
          <button v-for="p in popularDestinations" :key="p" type="button" class="cx-chip" @click="quickTo(p)">
            <i class="bi bi-geo-alt"></i>{{ p }}
          </button>
        </div>
      </div>

      <button class="cx-search-btn" type="button" :disabled="searching" @click="searchBus">
        <template v-if="searching"><span class="spinner-border spinner-border-sm me-2"></span>Searching…</template>
        <template v-else><i class="bi bi-search me-2"></i>Search trips</template>
      </button>
      <p v-if="searchError" class="cx-err"><i class="bi bi-exclamation-circle me-1"></i>{{ searchError }}</p>

      <div class="cx-trust">
        <span><i class="bi bi-shield-check"></i>Verified operators</span>
        <span><i class="bi bi-grid-3x3-gap"></i>Live seat maps</span>
        <span><i class="bi bi-qr-code"></i>Digital tickets</span>
      </div>
    </div>

    <!-- ================= QUICK ACTIONS ================= -->
    <section class="cx-actions">
      <button v-for="a in quickActions" :key="a.label" type="button" class="cx-action" @click="a.action">
        <span class="cx-action-ico" :style="{ background: a.bg, color: a.color }"><i :class="a.icon"></i></span>
        <span class="cx-action-label">{{ a.label }}</span>
        <span class="cx-action-sub">{{ a.sub }}</span>
      </button>
    </section>

    <!-- ================= UPCOMING TRIPS ================= -->
    <section class="cx-upcoming">
      <div class="cx-sec-head">
        <div>
          <span class="cx-eyebrow"><i class="bi bi-clock-history"></i>Upcoming</span>
          <h3 class="cx-title-sec">Upcoming trips</h3>
        </div>
        <router-link to="/customer/bookings" class="cx-link-all">View all <i class="bi bi-arrow-right ms-1"></i></router-link>
      </div>

      <div v-if="loading" class="cx-loading">
        <span class="skeleton cx-loading-line"></span>
        <span class="skeleton cx-loading-line"></span>
      </div>

      <div v-else-if="upcomingBookings.length === 0" class="cx-empty compact">
        <i class="bi bi-ticket-perforated"></i>
        <p>No upcoming trips — search above to grab your seat.</p>
      </div>

      <div v-else class="cx-trip-list">
        <div v-for="b in upcomingBookings" :key="b.id" class="cx-trip" @click="goBooking(b.id)">
          <span class="cx-trip-ico"><i class="bi bi-bus-front-fill"></i></span>
          <div class="cx-trip-body">
            <strong class="cx-trip-route">{{ b.origin_city }} → {{ b.destination_city }}</strong>
            <span class="cx-trip-meta">{{ formatDate(b.departure_date) }} · {{ b.departure_time }} · {{ b.vendor_name }}</span>
          </div>
          <div class="cx-trip-right">
            <strong class="cx-trip-price">{{ currency }}{{ formatPrice(b.total_amount) }}</strong>
            <span class="cx-trip-seats">{{ b.seat_count > 1 ? `${b.seat_count} seats` : '1 seat' }}</span>
          </div>
          <i class="bi bi-chevron-right cx-trip-chev"></i>
        </div>
      </div>
    </section>

    <!-- ================= SAVED ROUTES MODAL ================= -->
    <div v-if="savedRoutesOpen" class="cx-modal" @click.self="savedRoutesOpen = false">
      <div class="cx-modal-card" role="dialog" aria-modal="true" aria-label="Saved routes">
        <div class="cx-modal-head">
          <h5 class="cx-modal-title"><i class="bi bi-bookmark-heart-fill me-2"></i>Saved routes</h5>
          <button class="cx-modal-close" type="button" aria-label="Close" @click="savedRoutesOpen = false"><i class="bi bi-x-lg"></i></button>
        </div>
        <div v-if="savedRoutes.length" class="cx-modal-list">
          <button v-for="r in savedRoutes" :key="r.id" type="button" class="cx-modal-item" @click="flyTo(r)">
            <span class="cx-modal-ico"><i class="bi bi-geo-alt-fill"></i></span>
            <span class="cx-modal-text">
              <strong>{{ r.name }}</strong>
              <small>{{ r.sub || 'Saved destination' }}</small>
            </span>
            <i class="bi bi-arrow-up-right"></i>
          </button>
        </div>
        <div v-else class="cx-modal-empty">
          <i class="bi bi-bookmark-star"></i>
          <p>No saved routes yet.</p>
          <p class="small">Search a trip above and it will be saved here automatically.</p>
        </div>
      </div>
    </div>

    <!-- ================= OFFERS MODAL ================= -->
    <div v-if="offersOpen" class="cx-modal" @click.self="offersOpen = false">
      <div class="cx-modal-card" role="dialog" aria-modal="true" aria-label="Travel offers">
        <div class="cx-modal-head">
          <h5 class="cx-modal-title"><i class="bi bi-tags-fill me-2"></i>Travel offers</h5>
          <button class="cx-modal-close" type="button" aria-label="Close" @click="offersOpen = false"><i class="bi bi-x-lg"></i></button>
        </div>
        <div class="cx-offer-list">
          <div v-for="o in offers" :key="o.code" class="cx-offer">
            <span class="cx-offer-ico" :style="{ color: o.color }"><i :class="o.icon"></i></span>
            <div class="cx-offer-info">
              <h6>{{ o.title }}</h6>
              <p>{{ o.text }}</p>
              <span class="cx-offer-code">{{ o.code }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ================= MAP MODAL ================= -->
    <TerminalMap
      v-if="mapOpen"
      v-model="mapOpen"
      :city="mapCity"
      :destination="destination"
      :destination-city-id="destinationCityId"
      :dest-lat="destinationMeta ? Number(destinationMeta.lat) : null"
      :dest-lng="destinationMeta ? Number(destinationMeta.lng) : null"
      :user-lat="userLat"
      :user-lng="userLng"
    />
  </div>
</template>

<script setup>
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import api from '../../services/api'
import { detectCity } from '../../services/location'
const TerminalMap = defineAsyncComponent(() => import('../../components/TerminalMap.vue'))

const router = useRouter()
const auth = useAuthStore()

// ---- Profile / time ----
const firstName = computed(() => String(auth.user?.name || 'there').trim().split(/\s+/)[0])
const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
})
const todayLabel = new Date().toLocaleDateString(undefined, {
  weekday: 'long', month: 'short', day: 'numeric',
})

// ---- Search state ----
const cities = ref([])
const from = ref('')
const detectedCity = ref(null)
const detecting = ref(false)
const detectError = ref('')
const destination = ref('')
const destinationMeta = ref(null)
const date = ref('')
const passengers = ref(1)
const suggestions = ref([])
const suggestionOpen = ref(false)
const loadingSuggest = ref(false)
const searching = ref(false)
const searchError = ref('')
const userLat = ref(null)
const userLng = ref(null)

let suggestTimer = null

const mapOpen = ref(false)
const mapCity = ref(null)
const currency = ref('₦')

// ---- Bookings state ----
const bookings = ref([])
const loading = ref(true)

// ---- Quick actions ----
const savedRoutesOpen = ref(false)
const offersOpen = ref(false)

const offers = ref([])

const offerIcons = {
  'school-outline': 'bi-mortarboard-fill',
  'sunny-outline': 'bi-brightness-high-fill',
  'gift-outline': 'bi-gift-fill',
  'pricetag-outline': 'bi-tags-fill',
  'flash-outline': 'bi-lightning-charge-fill',
  'star-outline': 'bi-star-fill',
  'ticket-outline': 'bi-ticket-perforated-fill',
  'people-outline': 'bi-people-fill',
  'heart-outline': 'bi-heart-fill',
  'wallet-outline': 'bi-wallet2',
}

async function loadOffers() {
  try {
    const { data } = await api.get('/offers')
    offers.value = (data.data || []).map((o) => ({
      code: o.code,
      title: o.title,
      text: o.description || '',
      icon: offerIcons[o.icon] || 'bi-tags-fill',
      color: o.color || '#0E9384',
    }))
  } catch {
    offers.value = []
  }
}

const quickActions = [
  { label: 'My Bookings', sub: 'Your tickets', icon: 'bi-ticket-perforated', color: '#0E9384', bg: '#E2F4F1', action: () => router.push('/customer/bookings') },
  { label: 'Saved Routes', sub: 'Frequent trips', icon: 'bi-bookmark-heart-fill', color: '#0A6B60', bg: '#E2F4F1', action: () => (savedRoutesOpen.value = true) },
  { label: 'Nearby Terminals', sub: 'Stations near you', icon: 'bi-signpost-2-fill', color: '#C7792B', bg: '#FAF0E0', action: nearbyTerminals },
  { label: 'Offers', sub: 'Deals & codes', icon: 'bi-tags-fill', color: '#2E9E5B', bg: '#E7F5EC', action: () => (offersOpen.value = true) },
  { label: 'Help', sub: 'We’re here 24/7', icon: 'bi-headset', color: '#8A7B6F', bg: '#F9FBFA', action: () => (window.location.href = 'mailto:support@busline.ng') },
]

const popularDestinations = ['Lagos', 'Abuja', 'Port Harcourt', 'Benin City', 'Ibadan']

const suggestionGroups = computed(() => {
  const citiesArr = suggestions.value.filter((s) => s.type === 'city')
  const termsArr = suggestions.value.filter((s) => s.type === 'terminal')
  const groups = []
  if (citiesArr.length) groups.push({ label: 'Cities', items: citiesArr })
  if (termsArr.length) groups.push({ label: 'Bus terminals', items: termsArr })
  return groups
})

const upcomingBookings = computed(() =>
  [...bookings.value]
    .filter((b) => b.status !== 'cancelled' && b.status !== 'completed' && String(b.departure_date) >= todayStr())
    .sort((a, b) => `${a.departure_date} ${a.departure_time}`.localeCompare(`${b.departure_date} ${b.departure_time}`))
    .slice(0, 5)
)

const savedRoutes = computed(() => {
  const stored = JSON.parse(localStorage.getItem('busline.favorites') || '[]')
  return stored.slice(0, 8)
})

const destinationCityId = computed(() =>
  destinationMeta.value
    ? destinationMeta.value.type === 'terminal'
      ? destinationMeta.value.city_id
      : destinationMeta.value.id
    : null
)

function todayStr() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

// ---- Location ----
async function detectLocation() {
  detectError.value = ''
  detecting.value = true
  try {
    const city = await detectCity(cities.value)
    if (city) {
      detectedCity.value = city
      from.value = String(city.id)
      const point = JSON.parse(localStorage.getItem('busline.user_position') || 'null')
      if (point) {
        userLat.value = point.lat
        userLng.value = point.lng
      }
    } else {
      detectError.value = 'Could not detect location — pick a city below.'
    }
  } finally {
    detecting.value = false
  }
}

function onFromChange() {
  detectError.value = ''
  detectedCity.value = null
  mapCity.value = originCityMeta()
}

function originCityMeta() {
  const c = cities.value.find((c) => String(c.id) === String(from.value))
  return c ? { id: c.id, name: c.name, lat: c.lat, lng: c.lng } : null
}

// ---- Destination suggestions ----
function onDestInput() {
  searchError.value = ''
  destinationMeta.value = null
  suggestionOpen.value = true
  clearTimeout(suggestTimer)
  const q = destination.value.trim()
  if (q.length < 2) {
    suggestions.value = []
    loadingSuggest.value = false
    return
  }
  loadingSuggest.value = true
  suggestTimer = setTimeout(async () => {
    try {
      const { data } = await api.get('/terminals/suggestions', { params: { q } })
      suggestions.value = data.data || []
      suggestionOpen.value = true
    } catch {
      suggestions.value = []
    } finally {
      loadingSuggest.value = false
    }
  }, 220)
}

function openSuggestions() {
  if (destination.value.trim().length >= 2) suggestionOpen.value = true
}
function onDestBlur() {
  setTimeout(() => (suggestionOpen.value = false), 150)
}

function pickSuggestion(s) {
  destination.value = s.label
  suggestionOpen.value = false
  destinationMeta.value = s
}

// ---- Swap / popular ----
function swapRoute() {
  const dest = destinationMeta.value
  const origin = originCityMeta()
  if (!dest || !origin) return
  const destCityId = dest.type === 'terminal' ? dest.city_id : dest.id
  if (!destCityId) return
  from.value = String(destCityId)
  destination.value = origin.name
  destinationMeta.value = { type: 'city', id: origin.id, label: origin.name, sub: origin.state, lat: origin.lat, lng: origin.lng }
  detectError.value = ''
  detectedCity.value = null
}

async function quickTo(label) {
  try {
    const { data } = await api.get('/terminals/suggestions', { params: { q: label } })
    const list = data.data || []
    const city = list.find((s) => s.type === 'city' && s.label.toLowerCase() === label.toLowerCase()) || list[0]
    if (city) pickSuggestion(city)
  } catch {
    // ignore — the destination input still works manually
  }
}

// ---- Search ----
async function searchBus() {
  searchError.value = ''
  if (!from.value) {
    searchError.value = 'Please choose where you’re traveling from.'
    return
  }
  let meta = destinationMeta.value
  if (!meta) {
    const q = destination.value.trim().toLowerCase()
    const city = cities.value.find((c) => c.name.toLowerCase() === q || c.state.toLowerCase() === q)
    if (city) {
      meta = { type: 'city', id: city.id, label: city.name, sub: city.state, lat: city.lat, lng: city.lng }
      destinationMeta.value = meta
      destination.value = city.name
    }
  }
  // If the user typed a destination without picking from the dropdown,
  // accept the top suggestion so Search always works in one click.
  if (!meta && suggestions.value.length) {
    pickSuggestion(suggestions.value[0])
    meta = destinationMeta.value
  }
  if (!meta) {
    searchError.value = 'Please choose a destination from the suggestions.'
    return
  }
  mapCity.value = originCityMeta()
  if (!mapCity.value) {
    searchError.value = 'Please choose where you’re traveling from.'
    return
  }
  saveFavorite(destinationMeta.value)
  cacheSearch()
  mapOpen.value = true
}

function saveFavorite(meta) {
  if (!meta?.id) return
  const fav = {
    id: meta.type === 'terminal' ? meta.city_id : meta.id,
    name: meta.name || meta.label,
    sub: meta.sub || meta.state || meta.city_name || '',
    lat: meta.lat,
    lng: meta.lng,
  }
  if (!fav.id) return
  const arr = JSON.parse(localStorage.getItem('busline.favorites') || '[]')
  const clean = arr.filter((f) => String(f.id) !== String(fav.id))
  clean.unshift(fav)
  localStorage.setItem('busline.favorites', JSON.stringify(clean.slice(0, 6)))
}

function cacheSearch() {
  const meta = destinationMeta.value
  localStorage.setItem('busline.last_search', JSON.stringify({
    from: from.value,
    destination: destination.value,
    destination_id: meta ? (meta.type === 'terminal' ? meta.city_id : meta.id) : null,
    date: date.value,
    passengers: passengers.value,
  }))
}

// ---- Saved routes / nearby terminals ----
function flyTo(r) {
  destination.value = r.name
  destinationMeta.value = { type: 'city', id: r.id, label: r.name, sub: r.sub, lat: r.lat, lng: r.lng }
  mapCity.value = originCityMeta()
  if (mapCity.value) {
    mapOpen.value = true
  }
}

async function nearbyTerminals() {
  detectError.value = ''
  let city = originCityMeta()
  if (!city) {
    detecting.value = true
    try {
      const c = await detectCity(cities.value)
      if (c) {
        detectedCity.value = c
        from.value = String(c.id)
        city = originCityMeta()
      }
    } finally {
      detecting.value = false
    }
  }
  if (!city) {
    detectError.value = 'Enable location or pick your current location to see nearby terminals.'
    return
  }
  const point = JSON.parse(localStorage.getItem('busline.user_position') || 'null')
  if (point) {
    userLat.value = point.lat
    userLng.value = point.lng
  }
  mapCity.value = city
  destination.value = ''
  destinationMeta.value = null
  mapOpen.value = true
}

// ---- Helpers ----
function formatPrice(v) { return Number(v || 0).toLocaleString() }
function formatDate(v) {
  if (!v) return '—'
  const [y, m, d] = String(v).split('-')
  return `${d}-${m}-${y}`
}
function goBooking(id) {
  router.push(`/customer/bookings/${id}`)
}

// ---- Mount ----
onMounted(async () => {
  try {
    const { data } = await api.get('/cities')
    cities.value = data.data || []
  } catch {
    cities.value = []
  }

  const last = JSON.parse(localStorage.getItem('busline.last_search') || 'null')
  if (last) {
    if (last.from) from.value = String(last.from)
    if (last.date) date.value = last.date
    if (last.passengers) passengers.value = last.passengers
    if (last.destination_id) {
      const c = cities.value.find((x) => String(x.id) === String(last.destination_id))
      if (c) {
        destination.value = c.name
        destinationMeta.value = { type: 'city', id: Number(c.id), label: c.name, sub: c.state, lat: c.lat, lng: c.lng }
      }
    }
  }

  try {
    const { data } = await api.get('/bookings')
    bookings.value = data.data || []
  } catch {
    bookings.value = []
  } finally {
    loading.value = false
  }

  loadOffers()
})

onBeforeUnmount(() => {
  clearTimeout(suggestTimer)
})
</script>

<style>
/* Customer dashboard — mirrors the mobile app's design system (amber accent). */
.cx-dash {
  max-width: 760px;
  margin: 0 auto;
}

/* ---------- HEADER ---------- */
.cx-head { margin-bottom: 1.1rem; }
.cx-date-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  background: var(--brand-50);
  color: var(--brand-700);
  border-radius: var(--pill);
  padding: 0.3rem 0.8rem;
}
.cx-title { font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: clamp(1.5rem, 3vw, 2rem); margin: 0.7rem 0 0.25rem; letter-spacing: -0.02em; color: var(--text); }
.cx-wave { display: inline-block; animation: cx-wave 2.4s ease-in-out infinite; transform-origin: 70% 70%; }
@keyframes cx-wave { 0%, 60%, 100% { transform: rotate(0); } 10% { transform: rotate(14deg); } 20% { transform: rotate(-8deg); } 30% { transform: rotate(14deg); } 40% { transform: rotate(-4deg); } 50% { transform: rotate(10deg); } }
.cx-sub { color: var(--muted); margin: 0; font-size: 0.95rem; }

/* ---------- ROUTE CARD ---------- */
.cx-route {
  position: relative;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1rem;
  box-shadow: var(--shadow-sm);
  margin-bottom: 1.4rem;
}
.cx-route-head { display: flex; align-items: center; gap: 0.7rem; margin-bottom: 0.9rem; }
.cx-route-ico {
  width: 36px; height: 36px;
  border-radius: 12px;
  background: var(--brand-50);
  color: var(--brand);
  display: grid;
  place-items: center;
  font-size: 1.05rem;
  flex-shrink: 0;
}
.cx-route-head-body { display: flex; flex-direction: column; line-height: 1.25; }
.cx-route-head-body strong { color: var(--text); font-size: 0.98rem; font-family: 'Plus Jakarta Sans', sans-serif; }
.cx-route-head-body small { color: var(--muted); font-size: 0.78rem; }

.cx-field {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.55rem 0.8rem;
  border: 1.5px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}
.cx-field:focus-within { border-color: var(--brand); box-shadow: 0 0 0 4px var(--brand-50); }
.cx-field-ico {
  width: 34px; height: 34px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 0.95rem;
  flex-shrink: 0;
}
.cx-field-ico.from { background: var(--brand); }
.cx-field-ico.to { background: var(--text); }
.cx-field-body { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.cx-field-hint { font-size: 0.66rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700; }
.cx-field-control select,
.cx-field-control input {
  width: 100%;
  border: 0;
  background: transparent;
  outline: 0;
  color: var(--text);
  font-weight: 600;
  font-size: 1rem;
  padding: 0.2rem 0;
}
.cx-field-control select { cursor: pointer; appearance: auto; }
.cx-field-control input::placeholder { color: var(--muted-light); font-weight: 500; }
.cx-field-control select option { color: var(--text); background: var(--surface); }
.cx-ok { color: var(--success-600); flex-shrink: 0; }
.cx-hint { font-size: 0.74rem; color: var(--muted); padding: 0.4rem 0.9rem 0.25rem; display: block; }
.cx-hint.ok { color: var(--success-700); }
.cx-hint.err { color: var(--danger-700); }

.cx-detect {
  width: 36px; height: 36px;
  border-radius: 11px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text);
  display: grid;
  place-items: center;
  flex-shrink: 0;
  transition: all 0.15s ease;
}
.cx-detect:hover { background: var(--brand); border-color: var(--brand); color: #fff; }
.cx-detect .spin { display: inline-block; animation: cx-spin 0.9s linear infinite; }
@keyframes cx-spin { to { transform: rotate(360deg); } }

.cx-divider { display: flex; align-items: center; padding: 0.35rem 0.8rem; }
.cx-line { flex: 1; height: 1px; background: var(--border); }
.cx-swap {
  width: 32px; height: 32px;
  border-radius: 50%;
  background: var(--brand-50);
  border: 1px solid var(--brand);
  color: var(--brand-700);
  display: grid;
  place-items: center;
  margin: 0 0.6rem;
  font-size: 0.95rem;
  flex-shrink: 0;
  transition: all 0.15s ease;
}
.cx-swap:hover { background: var(--brand); color: #fff; }

.cx-suggest {
  position: absolute;
  left: 0.8rem;
  right: 0.8rem;
  top: calc(100% + 6px);
  z-index: 50;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-md);
  padding: 0.5rem;
  max-height: 300px;
  overflow: auto;
}
.cx-suggest-label { font-size: 0.66rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted-light); padding: 0.4rem 0.6rem 0.2rem; }
.cx-suggest-item {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  width: 100%;
  border: 0;
  background: transparent;
  border-radius: 12px;
  padding: 0.55rem 0.6rem;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s ease;
}
.cx-suggest-item:hover { background: var(--brand-50); }
.cx-suggest-icon {
  width: 38px; height: 38px;
  border-radius: 11px;
  background: var(--surface-2);
  color: var(--text);
  display: grid;
  place-items: center;
  font-size: 1.05rem;
  flex-shrink: 0;
}
.cx-suggest-text { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.25; }
.cx-suggest-text strong { color: var(--text); font-size: 0.9rem; }
.cx-suggest-text small { color: var(--muted); font-size: 0.75rem; }
.cx-suggest-item > .bi { color: var(--muted-light); }

/* ---------- POPULAR ---------- */
.cx-popular { margin-top: 0.9rem; }
.cx-popular-label { display: block; font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); margin-bottom: 0.5rem; }
.cx-popular-list { display: flex; gap: 0.5rem; overflow-x: auto; padding-bottom: 2px; scrollbar-width: none; }
.cx-popular-list::-webkit-scrollbar { display: none; }
.cx-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--pill);
  padding: 0.45rem 0.9rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.15s ease;
}
.cx-chip i { color: var(--brand); }
.cx-chip:hover { border-color: var(--brand); background: var(--brand-50); }

/* ---------- SEARCH ---------- */
.cx-search-btn {
  width: 100%;
  margin-top: 0.9rem;
  border: 0;
  border-radius: var(--pill);
  padding: 0.9rem;
  font-weight: 800;
  font-size: 1rem;
  font-family: 'Plus Jakarta Sans', sans-serif;
  color: #fff;
  background: linear-gradient(135deg, var(--brand), var(--brand-700));
  box-shadow: var(--shadow-brand);
  transition: all 0.18s ease;
}
.cx-search-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 12px 28px rgba(14, 147, 132, 0.45); }
.cx-search-btn:active:not(:disabled) { transform: translateY(0); }
.cx-search-btn:disabled { opacity: 0.7; cursor: not-allowed; }
.cx-err { margin: 0.6rem 0 0; font-size: 0.82rem; font-weight: 600; color: var(--danger-700); text-align: center; }
.cx-trust {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 1.1rem;
  margin-top: 0.9rem;
}
.cx-trust span { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.74rem; font-weight: 600; color: var(--muted); }
.cx-trust i { color: var(--brand); }

/* ---------- QUICK ACTIONS ---------- */
.cx-actions { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.75rem; margin-bottom: 1.6rem; }
.cx-action {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.4rem;
  text-align: left;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1rem;
  box-shadow: var(--shadow-xs);
  cursor: pointer;
  transition: all 0.2s ease;
}
.cx-action:hover { transform: translateY(-3px); border-color: var(--brand-100); box-shadow: var(--shadow-md); }
.cx-action-ico {
  width: 44px; height: 44px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  font-size: 1.2rem;
}
.cx-action-label { font-weight: 800; font-size: 0.9rem; color: var(--text); font-family: 'Plus Jakarta Sans', sans-serif; }
.cx-action-sub { font-size: 0.74rem; color: var(--muted); }

/* ---------- SECTION HEADS ---------- */
.cx-sec-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
.cx-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--brand-700);
  background: var(--brand-50);
  border-radius: var(--pill);
  padding: 0.25rem 0.7rem;
}
.cx-title-sec { font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 1.25rem; margin: 0.45rem 0 0; color: var(--text); letter-spacing: -0.01em; }
.cx-link-all { font-size: 0.82rem; font-weight: 700; color: var(--brand-700); text-decoration: none; }
.cx-link-all:hover { color: var(--brand); }

/* ---------- UPCOMING TRIPS ---------- */
.cx-upcoming { margin-bottom: 1.75rem; }
.cx-trip-list { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); overflow: hidden; }
.cx-trip {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background 0.12s ease;
}
.cx-trip:last-child { border-bottom: 0; }
.cx-trip:hover { background: var(--brand-50); }
.cx-trip-ico {
  width: 40px; height: 40px;
  border-radius: 13px;
  background: var(--brand-50);
  color: var(--brand);
  display: grid;
  place-items: center;
  font-size: 1.05rem;
  flex-shrink: 0;
}
.cx-trip-body { flex: 1; min-width: 0; }
.cx-trip-route { display: block; font-weight: 700; font-size: 0.9rem; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cx-trip-meta { font-size: 0.76rem; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cx-trip-right { text-align: right; flex-shrink: 0; }
.cx-trip-price { display: block; font-weight: 800; font-size: 0.9rem; color: var(--brand-700); font-family: 'Plus Jakarta Sans', sans-serif; }
.cx-trip-seats { font-size: 0.72rem; font-weight: 700; color: var(--success-700); }
.cx-trip-chev { color: var(--muted-light); flex-shrink: 0; }

.cx-loading { display: flex; flex-direction: column; gap: 0.6rem; }
.cx-loading-line { height: 54px; border-radius: 12px; }

.cx-empty {
  background: var(--surface);
  border: 1px dashed var(--border);
  border-radius: var(--radius-lg);
  padding: 2.2rem 1rem;
  text-align: center;
  color: var(--muted);
}
.cx-empty i { font-size: 2.4rem; color: var(--brand-100); }
.cx-empty p { margin: 0.4rem 0 0; font-weight: 600; }
.cx-empty.compact { padding: 1.4rem; }
.cx-empty.compact i { font-size: 1.8rem; }

/* ---------- MODALS ---------- */
.cx-modal {
  position: fixed;
  inset: 0;
  z-index: 1080;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}
.cx-modal-card {
  width: 100%;
  max-width: 460px;
  max-height: 82vh;
  overflow: auto;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 1.2rem;
  box-shadow: var(--shadow-lg);
}
.cx-modal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.9rem; }
.cx-modal-title { margin: 0; font-weight: 800; font-size: 1.05rem; color: var(--text); font-family: 'Plus Jakarta Sans', sans-serif; }
.cx-modal-title i { color: var(--brand); }
.cx-modal-close { width: 34px; height: 34px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface); color: var(--text); display: grid; place-items: center; transition: all 0.15s ease; }
.cx-modal-close:hover { background: var(--surface-2); }
.cx-modal-list { display: flex; flex-direction: column; gap: 0.5rem; }
.cx-modal-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  text-align: left;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0.75rem 0.9rem;
  cursor: pointer;
  transition: all 0.15s ease;
}
.cx-modal-item:hover { border-color: var(--brand-100); background: var(--brand-50); }
.cx-modal-ico { width: 40px; height: 40px; border-radius: 12px; background: var(--brand-50); color: var(--brand-700); display: grid; place-items: center; font-size: 1.1rem; flex-shrink: 0; }
.cx-modal-text { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.25; }
.cx-modal-text strong { color: var(--text); font-size: 0.9rem; }
.cx-modal-text small { color: var(--muted); font-size: 0.75rem; }
.cx-modal-item > .bi { color: var(--muted-light); }
.cx-modal-empty { text-align: center; padding: 2rem 1rem; color: var(--muted); }
.cx-modal-empty i { font-size: 2.2rem; color: var(--brand-100); }
.cx-modal-empty p { margin: 0.4rem 0 0; font-weight: 600; }
.cx-modal-empty .small { font-weight: 500; }

.cx-offer-list { display: flex; flex-direction: column; gap: 0.7rem; }
.cx-offer {
  display: flex;
  gap: 0.85rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 0.9rem 1rem;
}
.cx-offer-ico { width: 42px; height: 42px; border-radius: 13px; background: var(--brand-50); color: var(--text); display: grid; place-items: center; font-size: 1.15rem; flex-shrink: 0; }
.cx-offer-info { min-width: 0; }
.cx-offer-info h6 { margin: 0 0 0.15rem; font-weight: 800; color: var(--text); font-size: 0.92rem; }
.cx-offer-info p { margin: 0 0 0.4rem; color: var(--muted); font-size: 0.78rem; }
.cx-offer-code {
  display: inline-block;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  background: var(--brand-50);
  border: 1px dashed var(--brand);
  color: var(--brand-700);
  border-radius: 8px;
  padding: 0.2rem 0.5rem;
}

/* ---------- RESPONSIVE ---------- */
@media (max-width: 1100px) {
  .cx-actions { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 720px) {
  .cx-actions { grid-template-columns: repeat(2, 1fr); gap: 0.7rem; }
  .cx-modal-card { max-width: 100%; }
}
@media (max-width: 480px) {
  .cx-sec-head { flex-direction: column; align-items: flex-start; gap: 0.4rem; }
}
</style>
