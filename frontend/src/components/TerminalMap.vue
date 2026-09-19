<template>
  <teleport to="body">
    <transition name="tm-fade">
      <div v-if="modelValue" class="tm-overlay" @keydown.esc="close">
        <div class="tm-modal" role="dialog" aria-modal="true" :aria-label="`Available trips from ${city?.name || ''}`">
          <!-- Header -->
          <header class="tm-head">
            <div class="tm-head-left">
              <span class="tm-eyebrow"><i class="bi bi-bus-front-fill"></i> Available trips</span>
              <h5 class="tm-title">
                <span class="tm-route">
                  <span class="tm-route-city">{{ city?.name || 'Origin' }}</span>
                  <span class="tm-route-arrow"><i class="bi bi-arrow-right"></i></span>
                  <span class="tm-route-city tm-route-dest">{{ destination || 'Destination' }}</span>
                </span>
              </h5>
              <span v-if="!loading" class="tm-sub">
                <span class="tm-pill">{{ availableTripsCount }} trip{{ availableTripsCount === 1 ? '' : 's' }}</span>
                {{ sections.length }} terminal{{ sections.length === 1 ? '' : 's' }} with availability
              </span>
              <span v-else class="tm-sub">Fetching trips…</span>
            </div>
            <button class="tm-close" type="button" aria-label="Close map" @click="close"><i class="bi bi-x-lg"></i></button>
          </header>

          <!-- Filters -->
          <div class="tm-filters">
            <div class="tm-search">
              <i class="bi bi-search"></i>
              <input v-model="operatorFilter" type="search" placeholder="Filter by operator…" aria-label="Filter by operator" />
            </div>
            <div class="tm-search">
              <i class="bi bi-tag"></i>
              <select v-model="priceFilter" aria-label="Filter by price">
                <option value="">Any price</option>
                <option value="10000">Under ₦10,000</option>
                <option value="20000">Under ₦20,000</option>
                <option value="30000">Under ₦30,000</option>
              </select>
            </div>
            <div class="tm-chips">
              <button
                v-for="opt in amenityOptions"
                :key="opt.key"
                class="tm-chip"
                :class="{ active: activeAmenities.includes(opt.key) }"
                type="button"
                @click="toggleAmenity(opt.key)"
              >
                <i :class="`bi ${opt.icon}`"></i>{{ opt.label }}
              </button>
            </div>
          </div>

          <!-- Body -->
          <div class="tm-body">
            <!-- Map pane -->
            <div class="tm-map-pane">
              <div ref="mapEl" class="tm-map"></div>
            </div>

            <!-- Trips pane -->
            <aside ref="listPane" class="tm-list-pane" aria-label="Available trips">
              <div v-if="loading" class="tm-skel">
                <div v-for="n in 3" :key="n" class="tm-skel-card">
                  <span class="sk sk-avatar"></span>
                  <span class="sk sk-line w70"></span>
                  <span class="sk sk-line w40"></span>
                </div>
              </div>

              <div v-else-if="sections.length === 0" class="tm-empty">
                <i class="bi bi-signpost-2"></i>
                <p>{{ hasAnyTrips ? 'No available trips match your filters.' : 'No scheduled trips at these terminals yet.' }}</p>
                <button v-if="hasAnyTrips" class="tm-reset" type="button" @click="resetFilters">Reset filters</button>
              </div>

              <div v-else class="tm-groups">
                <div
                  v-for="t in sections"
                  :key="t.id"
                  class="tm-group"
                  :class="{ active: selected?.id === t.id }"
                  :data-tid="t.id"
                  @click="selectTerminal(t)"
                >
                  <div class="tm-group-head">
                    <span class="tm-group-avatar"><i class="bi bi-geo-alt-fill"></i></span>
                    <div class="tm-group-meta">
                      <span class="tm-group-name">{{ t.name }}</span>
                      <span class="tm-group-addr">{{ t.address || t.city_name }}</span>
                    </div>
                    <span class="tm-group-count">{{ t.trips.length }}</span>
                  </div>
                  <ul class="tm-trips">
                    <li
                      v-for="tr in t.trips"
                      :key="tr.trip_id"
                      class="tm-trip"
                      :class="{ active: selectedTrip && selectedTrip.trip_id === tr.trip_id }"
                      :title="`Select this trip`"
                      @click.stop="selectTrip(tr)"
                    >
                      <span class="tm-trip-img" :style="imgStyle(tr)" aria-hidden="true"><i class="bi bi-bus-front-fill"></i><b>{{ vendorInitials(tr.vendor_name) }}</b></span>
                      <span class="tm-trip-time">
                        <span class="tm-trip-date">{{ shortDate(tr.departure_date) }}</span>
                        <span>{{ shortTime(tr.departure_time) }}</span>
                      </span>
                      <span class="tm-trip-mid">
                        <span class="tm-trip-vendor">{{ tr.vendor_name }}</span>
                        <span class="tm-trip-bus">{{ tr.bus_name }} · {{ tr.available_seats }} seats left</span>
                        <span class="tm-trip-meta">
                          <span v-if="arrivalLabel(tr)" class="tm-trip-arr"><i class="bi bi-flag-fill"></i>{{ arrivalLabel(tr) }}</span>
                          <span v-if="durationLabel(tr)" class="tm-trip-dur"><i class="bi bi-clock-history"></i>{{ durationLabel(tr) }}</span>
                          <span v-if="tr.bus_type" class="tm-trip-type">{{ busTypeLabel(tr.bus_type) }}</span>
                        </span>
                      </span>
                      <span class="tm-trip-price">
                        ₦{{ formatPrice(tr.price) }}
                        <span class="tm-trip-cta">Select</span>
                      </span>
                    </li>
                  </ul>
                </div>
              </div>

              <div v-if="selectedTrip" class="tm-continue">
                <div class="tm-continue-meta">
                  <span class="tm-continue-name"><i class="bi bi-bus-front-fill me-1"></i>{{ selectedTrip.vendor_name }}</span>
                  <span class="tm-continue-sub">{{ selectedTrip.bus_name }} · {{ shortDate(selectedTrip.departure_date) }} · {{ shortTime(selectedTrip.departure_time) }} · ₦{{ formatPrice(selectedTrip.price) }}</span>
                </div>
                <button class="tm-continue-btn" type="button" @click="continueBooking">Continue</button>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getCurrentPosition } from '../services/location'

const router = useRouter()

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  city: { type: Object, default: null },
  destination: { type: String, default: '' },
  destinationCityId: { type: Number, default: null },
  destLat: { type: Number, default: null },
  destLng: { type: Number, default: null },
  userLat: { type: Number, default: null },
  userLng: { type: Number, default: null },
  focusTerminalId: { type: Number, default: null },
})
const emit = defineEmits(['update:modelValue'])

const AMENITY_META = [
  { key: 'parking', label: 'Parking', icon: 'bi-p-circle' },
  { key: 'restroom', label: 'Restroom', icon: 'bi-building' },
  { key: 'waiting_lounge', label: 'Waiting lounge', icon: 'bi-people-fill' },
  { key: 'wifi', label: 'Wi-Fi', icon: 'bi-wifi' },
  { key: 'refreshments', label: 'Refreshments', icon: 'bi-cup-hot' },
]

const mapEl = ref(null)
const listPane = ref(null)
const terminals = ref([])
const loading = ref(false)
const selected = ref(null)
const selectedTrip = ref(null)
const operatorFilter = ref('')
const priceFilter = ref('')
const activeAmenities = ref([])

let map = null
let cluster = null
let markers = []
let leaflet = null
let routeLine = null
let routeArrow = null
let routeInfo = null
let destMarker = null
let userMarker = null
let locateControl = null
let userPoint = null
let locating = false

const IMG_PALETTES = [
  ['#f97316', '#c2410c'],
  ['#0284c7', '#0e7490'],
  ['#16a34a', '#15803d'],
  ['#7c3aed', '#5b21b6'],
  ['#dc2626', '#991b1b'],
  ['#db2777', '#9d174d'],
  ['#0891b2', '#155e75'],
  ['#ca8a04', '#854d0e'],
]

const amenityOptions = AMENITY_META
const filtered = computed(() => {
  let list = terminals.value
  const op = operatorFilter.value.trim().toLowerCase()
  if (op) list = list.filter((t) => (t.operators || []).some((o) => String(o).toLowerCase().includes(op)))
  if (priceFilter.value) list = list.filter((t) => t.min_price !== null && t.min_price <= Number(priceFilter.value))
  if (activeAmenities.value.length) {
    list = list.filter((t) => activeAmenities.value.every((k) => t.amenities_map?.[k]))
  }
  return list
})

function terminalTrips(t) {
  const rows = []
  for (const g of t.buses_by_vendor || []) {
    for (const b of g.buses || []) {
      if ((b.available_seats ?? 1) <= 0) continue
      rows.push({ vendor_id: g.vendor_id, vendor_name: g.vendor_name, vendor_logo: g.vendor_logo, ...b })
    }
  }
  return rows
}

// Only terminals that actually have available trips, with their trips flattened.
const sections = computed(() => {
  const seen = new Set()
  return filtered.value
    .filter((t) => (t.buses_by_vendor || []).length)
    .filter((t) => (seen.has(Number(t.id)) ? false : (seen.add(Number(t.id)), true)))
    .map((t) => ({ ...t, trips: terminalTrips(t) }))
    .filter((t) => t.trips.length > 0)
})

const availableTripsCount = computed(() => sections.value.reduce((n, s) => n + s.trips.length, 0))
const hasAnyTrips = computed(() => (terminals.value || []).some((t) => (t.buses_by_vendor || []).length))

function close() {
  emit('update:modelValue', false)
}
function goToTrip(tr) {
  close()
  router.push(`/customer/trips/${tr.trip_id}/book`)
}
function continueBooking() {
  const tr = selectedTrip.value
  if (tr) goToTrip(tr)
}
function shortTime(v) {
  return v ? String(v).slice(0, 5) : '--:--'
}
function shortDate(v) {
  if (!v) return ''
  const d = new Date(String(v) + 'T00:00:00')
  if (isNaN(d)) return String(v)
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}
function formatPrice(v) {
  return Number(v || 0).toLocaleString()
}

function vendorInitials(name) {
  return String(name || '?')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function imgStyle(tr) {
  const name = String(tr.vendor_name || 'bus').trim()
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  const p = IMG_PALETTES[h % IMG_PALETTES.length]
  return { background: `linear-gradient(135deg, ${p[0]}, ${p[1]})` }
}

function busTypeLabel(t) {
  return { standard: 'Standard', luxury: 'Luxury', vip: 'VIP', executive: 'Executive' }[t] || String(t || '')
}

function minutesBetween(from, to) {
  if (!from || !to) return null
  const [h1, m1] = String(from).split(':').map(Number)
  const [h2, m2] = String(to).split(':').map(Number)
  let mins = h2 * 60 + m2 - (h1 * 60 + m1)
  if (mins < 0) mins += 24 * 60
  return mins
}

function durationLabel(tr) {
  const mins = minutesBetween(tr.departure_time, tr.arrival_time)
  if (mins == null) return ''
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h ${String(m).padStart(2, '0')}m`
}

function arrivalLabel(tr) {
  return tr.arrival_time ? `Arr ${shortTime(tr.arrival_time)}` : ''
}
function toggleAmenity(k) {
  const i = activeAmenities.value.indexOf(k)
  if (i === -1) activeAmenities.value.push(k)
  else activeAmenities.value.splice(i, 1)
  renderMarkers()
}
function resetFilters() {
  operatorFilter.value = ''
  priceFilter.value = ''
  activeAmenities.value = []
  renderMarkers()
}

function selectTerminal(t) {
  selected.value = t
  selectedTrip.value = (t.trips || [])[0] || null
  if (map) {
    renderRoute()
    focusRoute()
  }
}

function selectTrip(tr) {
  const sec = sections.value.find((s) => s.trips.some((x) => x.trip_id === tr.trip_id))
  if (sec) {
    selected.value = sec
    selectedTrip.value = tr
    if (map) {
      renderRoute()
      focusRoute()
    }
    scrollToGroup(sec.id)
  }
}

function scrollToGroup(id) {
  nextTick(() => {
    const pane = listPane.value
    const el = pane && pane.querySelector(`[data-tid="${Number(id)}"]`)
    if (pane && el) pane.scrollTo({ top: el.offsetTop - pane.offsetTop - 12, behavior: 'smooth' })
  })
}

function terminalIcon(t, L) {
  const n = t.trips ? t.trips.length : t.available_buses || 0
  const has = n > 0
  return L.divIcon({
    className: 'tm-pin-wrap',
    html: `<div class="tm-pin ${has ? '' : 'tm-pin-empty'}">
             <i class="bi ${has ? 'bi-bus-front-fill' : 'bi-signpost'}"></i>
             <span>${n || ''}</span>
           </div>`,
    iconSize: [34, 42],
    iconAnchor: [17, 40],
    popupAnchor: [0, -36],
  })
}

function destPoint() {
  if (props.destLat != null && props.destLng != null) return [Number(props.destLat), Number(props.destLng)]
  return null
}

function propsUserPoint() {
  if (props.userLat != null && props.userLng != null) {
    return { lat: Number(props.userLat), lng: Number(props.userLng) }
  }
  return null
}

async function resolveUserPoint() {
  if (userPoint) return userPoint
  const fromProps = propsUserPoint()
  if (fromProps) {
    userPoint = fromProps
    return userPoint
  }
  if (locating) return null
  locating = true
  try {
    userPoint = await getCurrentPosition(5000)
  } catch {
    userPoint = null
  } finally {
    locating = false
  }
  return userPoint
}

function userIcon() {
  return leaflet.divIcon({
    className: 'tm-user-wrap',
    html: '<div class="tm-user-dot"><span class="tm-user-pulse"></span><i></i></div>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}

function renderUserMarker(pt) {
  if (!map || !leaflet) return
  if (userMarker) {
    userMarker.setLatLng([Number(pt.lat), Number(pt.lng)])
    return
  }
  userMarker = leaflet
    .marker([Number(pt.lat), Number(pt.lng)], { icon: userIcon(), keyboard: false, interactive: false })
    .addTo(map)
}

function addLocateControl() {
  if (!map || !leaflet || locateControl) return
  const btn = leaflet.DomUtil.create('button', 'tm-locate-btn')
  btn.type = 'button'
  btn.title = 'Show my location'
  btn.setAttribute('aria-label', 'Show my location')
  btn.innerHTML = '<i class="bi bi-crosshair"></i>'
  locateControl = leaflet.control({ position: 'topleft' })
  locateControl.onAdd = () => {
    leaflet.DomEvent.disableClickPropagation(btn)
    leaflet.DomEvent.on(btn, 'click', async () => {
      const pt = await resolveUserPoint()
      if (!pt || !map) return
      renderUserMarker(pt)
      map.setView([Number(pt.lat), Number(pt.lng)], 15, { animate: true })
    })
    return btn
  }
  locateControl.addTo(map)
}

function originPoint() {
  if (selected.value && selected.value.lat != null && selected.value.lng != null) {
    return [Number(selected.value.lat), Number(selected.value.lng)]
  }
  if (props.city?.lat != null && props.city?.lng != null) {
    return [Number(props.city.lat), Number(props.city.lng)]
  }
  return null
}

function bearingTo(a, b) {
  const toRad = Math.PI / 180
  const lat1 = a[0] * toRad
  const lat2 = b[0] * toRad
  const dLng = (b[1] - a[1]) * toRad
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

// Distance-weighted point at `frac` along a polyline (0..1).
function pointAlong(points, frac) {
  let total = 0
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    total += Math.hypot(b[0] - a[0], b[1] - a[1])
  }
  let target = total * Math.min(1, Math.max(0, frac))
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    const seg = Math.hypot(b[0] - a[0], b[1] - a[1])
    if (target <= seg) {
      const t = seg === 0 ? 0 : target / seg
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
    }
    target -= seg
  }
  return points[points.length - 1]
}

async function fetchDriveRoute(origin, dest) {
  const url = `https://router.project-osrm.org/route/v1/driving/${origin[1]},${origin[0]};${dest[1]},${dest[0]}?overview=full&geometries=geojson`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 7000)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    const j = await res.json()
    const coords = j?.routes?.[0]?.geometry?.coordinates
    if (!Array.isArray(coords) || coords.length < 2) return { points: null }
    return {
      points: coords.map((c) => [c[1], c[0]]),
      durationSeconds: j.routes[0].duration,
      distanceMeters: j.routes[0].distance,
    }
  } catch {
    return { points: null }
  } finally {
    clearTimeout(timer)
  }
}

function formatRouteInfo(sec, m) {
  const parts = []
  if (sec != null) {
    const mins = Math.round(sec / 60)
    const h = Math.floor(mins / 60)
    const mm = mins % 60
    parts.push(`${h}h ${String(mm).padStart(2, '0')}m`)
  }
  if (m != null) parts.push(`${Math.round(m / 1000)} km`)
  return parts.join(' · ')
}

function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

function clearRoute() {
  if (!map) return
  if (routeLine) { map.removeLayer(routeLine); routeLine = null }
  if (routeArrow) { map.removeLayer(routeArrow); routeArrow = null }
  if (routeInfo) { map.removeLayer(routeInfo); routeInfo = null }
  if (destMarker) { map.removeLayer(destMarker); destMarker = null }
}

let routeVersion = 0
async function renderRoute() {
  if (!map || !leaflet) return
  const version = ++routeVersion
  clearRoute()
  // Route line is only drawn once a vendor (trip) is selected.
  if (!selectedTrip.value) return
  const origin = originPoint()
  const dest = destPoint()
  if (!origin || !dest) return
  const L = leaflet

  const route = await fetchDriveRoute(origin, dest)
  if (!map || version !== routeVersion) return
  const points = route.points || [origin, dest]

  routeLine = L.polyline(points, {
    color: '#0f766e',
    weight: 4.5,
    opacity: 0.9,
    lineCap: 'round',
    lineJoin: 'round',
    interactive: false,
  }).addTo(map)

  const mid = pointAlong(points, 0.55)
  const deg = bearingTo(points[0], points[points.length - 1])
  routeArrow = L.marker(mid, {
    icon: L.divIcon({
      className: 'tm-arrow-wrap',
      html: `<div class="tm-route-arrow" style="transform: rotate(${deg}deg)"><i class="bi bi-bus-front-fill"></i></div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    }),
    interactive: false,
  }).addTo(map)

  const info = formatRouteInfo(route.durationSeconds, route.distanceMeters)
  if (info) {
    const at = pointAlong(points, 0.5)
    routeInfo = L.marker(at, {
      icon: L.divIcon({
        className: 'tm-info-wrap',
        html: `<span class="tm-route-info"><i class="bi bi-bus-front-fill"></i>${esc(info)}</span>`,
        iconSize: [220, 34],
        iconAnchor: [110, -14],
      }),
      interactive: false,
    }).addTo(map)
  }

  // Anchor the destination pin at the snapped route endpoint so the pin tip
  // lands exactly where the driving path ends.
  const destPos = points[points.length - 1]
  destMarker = L.marker(destPos, {
    icon: L.divIcon({
      className: 'tm-dest-wrap',
      html: `<div class="tm-dest-pin"><i class="bi bi-geo-fill"></i></div><span class="tm-dest-name">${esc(props.destination || 'Destination')}</span>`,
      iconSize: [40, 70],
      iconAnchor: [20, 48],
    }),
    zIndexOffset: 1200,
  }).addTo(map)
}

function focusRoute() {
  if (!map || !selectedTrip.value) return
  const sec = selected.value
  const dest = destPoint()
  if (sec && sec.lat != null && sec.lng != null && dest) {
    map.fitBounds([[Number(sec.lat), Number(sec.lng)], dest], { padding: [48, 48] })
  } else if (sec && sec.lat != null && sec.lng != null) {
    map.setView([Number(sec.lat), Number(sec.lng)], 14)
  }
}

function renderMarkers() {
  if (!map || !leaflet) return
  cluster.clearLayers()
  markers = []
  clearRoute()
  filtered.value.forEach((t) => {
    const m = leaflet.marker([Number(t.lat), Number(t.lng)], { icon: terminalIcon(t, leaflet), title: t.name })
    m.on('click', () => {
      const sec = sections.value.find((s) => Number(s.id) === Number(t.id))
      selected.value = sec || t
      selectedTrip.value = sec ? sec.trips[0] : null
      if (map) {
        renderRoute()
        focusRoute()
      }
      scrollToGroup(t.id)
    })
    cluster.addLayer(m)
    markers.push({ marker: m, terminal: t })
  })
  cluster.addTo(map)
  const dest = destPoint()
  const focus = filtered.value.find((t) => Number(t.id) === Number(props.focusTerminalId))
  if (focus) {
    selected.value = focus
    selectedTrip.value = (sections.value.find((s) => Number(s.id) === Number(focus.id))?.trips || [])[0] || null
    map.setView([Number(focus.lat), Number(focus.lng)], 14)
    scrollToGroup(focus.id)
  } else if (filtered.value.length) {
    const bounds = cluster.getBounds()
    if (selectedTrip.value && dest) bounds.extend(dest)
    map.fitBounds(bounds, { padding: [44, 44] })
  } else if (selectedTrip.value && dest) {
    const origin = originPoint()
    if (origin) map.fitBounds([origin, dest], { padding: [44, 44] })
  } else if (props.city?.lat && props.city?.lng) {
    map.setView([Number(props.city.lat), Number(props.city.lng)], 12)
  }
  renderRoute()
}

async function openMap() {
  selected.value = null
  selectedTrip.value = null
  loading.value = true

  // Lazy-load Leaflet the first time the map is opened.
  if (!leaflet) {
    const LMod = await import('leaflet')
    leaflet = LMod.default || LMod
    // leaflet.markercluster is a UMD that reads the global `L`.
    window.L = leaflet
    await import('leaflet.markercluster')
    // CSS side-effects come along with the module imports.
    await Promise.all([
      import('leaflet/dist/leaflet.css'),
      import('leaflet.markercluster/dist/MarkerCluster.css'),
      import('leaflet.markercluster/dist/MarkerCluster.Default.css'),
    ])
  }

  await nextTick()
  if (!mapEl.value) return

  if (!map) {
    map = leaflet.map(mapEl.value, {
      zoomControl: true,
      scrollWheelZoom: true,
      attributionControl: true,
    })
    leaflet
      .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      })
      .addTo(map)
    cluster = leaflet.markerClusterGroup({
      chunkedLoading: true,
      showCoverageOnHover: false,
      maxClusterRadius: 0,
    })
    map.on('click', () => {
      selected.value = null
      selectedTrip.value = null
      renderRoute()
    })
    addLocateControl()
  }

  map.invalidateSize()

  try {
    const params = new URLSearchParams()
    if (props.city?.id) params.set('city_id', props.city.id)
    if (props.destinationCityId) params.set('destination', props.destinationCityId)
    if (props.userLat != null && props.userLng != null) {
      params.set('lat', props.userLat)
      params.set('lng', props.userLng)
    }
    const body = await fetch(`/api/terminals?${params.toString()}`, { headers: { Accept: 'application/json' } }).then((r) => r.json())
    terminals.value = body.data || []
  } catch {
    terminals.value = []
  } finally {
    loading.value = false
    await nextTick()
    renderMarkers()
  }

  const pt = await resolveUserPoint()
  if (pt && map) renderUserMarker(pt)
}

function destroyMap() {
  if (map) {
    map.remove()
    map = null
  }
  cluster = null
  markers = []
  routeLine = null
  routeArrow = null
  routeInfo = null
  destMarker = null
  userMarker = null
  locateControl = null
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) openMap()
    else destroyMap()
  }
)

watch(filtered, () => {
  if (!props.modelValue) return
  if (selectedTrip.value) {
    const still = sections.value.some((s) => s.trips.some((x) => x.trip_id === selectedTrip.value.trip_id))
    if (!still) selectedTrip.value = null
  }
  if (selected.value) {
    const still = sections.value.some((s) => Number(s.id) === Number(selected.value.id))
    if (!still) selected.value = null
  }
  renderMarkers()
})

watch(
  () => [props.destLat, props.destLng],
  () => {
    if (props.modelValue) renderMarkers()
  }
)

onBeforeUnmount(() => {
  destroyMap()
})

defineExpose({})
</script>

<style>
/* Global styles (teleported to body + Leaflet injects marker DOM via JS). */
.tm-overlay {
  position: fixed;
  inset: 0;
  z-index: 1060;
  background: rgba(92, 46, 12, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.tm-modal {
  width: min(100%, 1240px);
  height: min(90vh, 860px);
  background: #fff;
  border-radius: 24px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 40px 100px rgba(122, 60, 16, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.5);
}
.tm-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.1rem 1.4rem;
  background: linear-gradient(135deg, #f8fafc, #f8fafc);
  border-bottom: 1px solid #e2e8f0;
}
.tm-head-left { min-width: 0; }
.tm-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #0f172a;
}
.tm-eyebrow i { font-size: 0.8rem; }
.tm-title { font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; margin: 0.2rem 0 0.25rem; color: #0f172a; font-size: 1.2rem; line-height: 1.2; }
.tm-route { display: inline-flex; align-items: center; gap: 0.55rem; flex-wrap: wrap; }
.tm-route-city { color: #0f172a; }
.tm-route-dest { color: #0f172a; }
.tm-route-arrow { color: #94a3b8; font-size: 0.8rem; display: grid; place-items: center; }
.tm-sub { display: inline-flex; align-items: center; gap: 0.45rem; font-size: 0.78rem; color: #475569; }
.tm-pill {
  background: #0E9384;
  color: #0f172a;
  font-weight: 800;
  font-size: 0.72rem;
  border-radius: 999px;
  padding: 0.15rem 0.6rem;
}
.tm-close {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #475569;
  display: grid;
  place-items: center;
  font-size: 0.95rem;
  flex-shrink: 0;
  transition: all 0.15s ease;
}
.tm-close:hover { background: #fee2e2; color: #b91c1c; transform: rotate(90deg); }

.tm-filters {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  padding: 0.8rem 1.4rem;
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
}
.tm-search { position: relative; display: flex; align-items: center; }
.tm-search > i {
  position: absolute;
  left: 0.8rem;
  color: #94a3b8;
  font-size: 0.85rem;
  pointer-events: none;
}
.tm-search input,
.tm-search select {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 0.55rem 0.85rem 0.55rem 2.2rem;
  font-size: 0.85rem;
  background: #ffffff;
  color: #0f172a;
  height: 42px;
  min-width: 170px;
}
.tm-search select { cursor: pointer; }
.tm-search input:focus,
.tm-search select:focus { outline: none; border-color: #0E9384; background: #fff; box-shadow: 0 0 0 3px rgba(14, 147, 132, 0.15); }
.tm-chips { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-left: auto; }
.tm-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.74rem;
  font-weight: 600;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  padding: 0.32rem 0.7rem;
  background: #fff;
  color: #475569;
  transition: all 0.15s ease;
}
.tm-chip:hover { border-color: #e2e8f0; color: #0f172a; }
.tm-chip.active { background: var(--info-600); border-color: var(--info-600); color: #fff; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3); }

.tm-body {
  position: relative;
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
}
.tm-map-pane { position: relative; min-width: 0; min-height: 0; background: #eef2f6; }
.tm-map { position: absolute; inset: 0; z-index: 0; }

.tm-list-pane {
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  background: #ffffff;
  border-left: 1px solid #e2e8f0;
  padding: 1.1rem;
}
.tm-list-pane::-webkit-scrollbar { width: 8px; }
.tm-list-pane::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 8px; }
.tm-list-pane::-webkit-scrollbar-thumb:hover { background: #e2e8f0; }

/* Skeleton */
.tm-skel { padding: 0.25rem; }
.tm-skel-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 1rem;
  margin-bottom: 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  animation: tm-pulse 1.4s ease-in-out infinite;
}
.sk { display: block; border-radius: 8px; background: #e2e8f0; height: 12px; }
.sk-avatar { width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(120deg, #e2e8f0 25%, #f8fafc 45%, #e2e8f0 65%); background-size: 200% 100%; animation: tm-shine 1.4s linear infinite; }
.sk-line { height: 11px; }
.w70 { width: 70%; }
.w40 { width: 40%; }

/* Empty */
.tm-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  height: 100%;
  min-height: 260px;
  color: #64748b;
  text-align: center;
  padding: 1rem;
}
.tm-empty i { font-size: 2.8rem; color: #cbd5e1; }
.tm-empty p { margin: 0; font-weight: 500; }
.tm-reset { border: 1px solid #0E9384; color: #0f172a; background: #fff; border-radius: 999px; font-weight: 700; font-size: 0.82rem; padding: 0.45rem 1.1rem; transition: all 0.15s ease; }
.tm-reset:hover { background: #0E9384; color: #0f172a; }

/* Terminal groups */
.tm-groups { display: flex; flex-direction: column; gap: 0.9rem; }
.tm-group {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 0.9rem;
  cursor: pointer;
  transition: all 0.18s ease;
  box-shadow: 0 2px 8px rgba(122, 60, 16, 0.05);
}
.tm-group:hover { border-color: #e2e8f0; transform: translateY(-2px); box-shadow: 0 12px 28px rgba(14, 147, 132, 0.14); }
.tm-group.active { border-color: #0E9384; box-shadow: 0 0 0 3px rgba(14, 147, 132, 0.15), 0 12px 28px rgba(14, 147, 132, 0.14); }
.tm-group-head { display: flex; align-items: center; gap: 0.7rem; margin-bottom: 0.75rem; }
.tm-group-avatar {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: #0E9384;
  color: #0f172a;
  display: grid;
  place-items: center;
  font-size: 1.05rem;
  flex-shrink: 0;
  box-shadow: 0 6px 14px rgba(14, 147, 132, 0.35);
}
.tm-group-meta { flex: 1; min-width: 0; }
.tm-group-name { display: block; font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 0.92rem; color: #0f172a; }
.tm-group-addr { display: block; font-size: 0.72rem; color: #64748b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tm-group-count {
  background: var(--success-50);
  color: var(--success-700);
  font-weight: 800;
  font-size: 0.78rem;
  border-radius: 999px;
  padding: 0.22rem 0.65rem;
  flex-shrink: 0;
}
.tm-trips { list-style: none; margin: 0; padding: 0; }
.tm-trip {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0.65rem;
  border-radius: 12px;
  background: #ffffff;
  margin-bottom: 0.45rem;
  transition: all 0.15s ease;
  border: 1px solid transparent;
}
.tm-trip:last-child { margin-bottom: 0; }
.tm-trip:hover { background: #f8fafc; border-color: #e2e8f0; transform: translateX(2px); }
.tm-group.active .tm-trip { background: #f8fafc; }
.tm-trip.active {
  background: #fff7ed;
  border-color: #0E9384;
  box-shadow: 0 0 0 2px rgba(14, 147, 132, 0.18);
}
.tm-trip.active .tm-trip-cta { opacity: 1; }
.tm-group.active .tm-trip.active { background: #fff7ed; }

/* Continue footer when a terminal is selected */
.tm-continue {
  position: sticky;
  bottom: 0;
  margin: 0.9rem -1.1rem -1.1rem;
  padding: 0.85rem 1.1rem;
  background: #fff;
  border-top: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  box-shadow: 0 -8px 20px rgba(15, 23, 42, 0.06);
}
.tm-continue-meta { min-width: 0; }
.tm-continue-name {
  display: block;
  font-weight: 800;
  font-size: 0.85rem;
  color: #0f172a;
  font-family: 'Plus Jakarta Sans', sans-serif;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tm-continue-name i { color: #0E9384; }
.tm-continue-sub {
  display: block;
  font-size: 0.7rem;
  color: #64748b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tm-continue-btn {
  border: 0;
  border-radius: 12px;
  padding: 0.72rem 1.35rem;
  font-weight: 800;
  font-size: 0.85rem;
  font-family: 'Plus Jakarta Sans', sans-serif;
  color: #0f172a;
  background: #0E9384;
  box-shadow: 0 8px 18px rgba(14, 147, 132, 0.45);
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}
.tm-continue-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 10px 22px rgba(14, 147, 132, 0.55); }
.tm-continue-btn:disabled { opacity: 0.55; cursor: not-allowed; box-shadow: none; }
.tm-trip-time {
  min-width: 52px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 800;
  font-size: 0.9rem;
  line-height: 1.05;
  color: #0f172a;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  text-align: center;
  padding: 0.3rem 0.4rem;
  flex-shrink: 0;
}
.tm-trip-img {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  color: #fff;
  position: relative;
  flex-shrink: 0;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.18);
}
.tm-trip-img i { font-size: 1.15rem; opacity: 0.9; }
.tm-trip-img b {
  position: absolute;
  bottom: 3px;
  right: 4px;
  font-size: 0.5rem;
  letter-spacing: 0.04em;
  background: rgba(0, 0, 0, 0.35);
  padding: 1px 4px;
  border-radius: 6px;
}
.tm-trip-meta {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  font-size: 0.66rem;
  color: #64748b;
  margin-top: 0.15rem;
  align-items: center;
}
.tm-trip-meta span { display: inline-flex; align-items: center; gap: 0.25rem; }
.tm-trip-meta i { font-size: 0.62rem; }
.tm-trip-type {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #334155;
  border-radius: 999px;
  padding: 0.05rem 0.45rem;
  font-weight: 700;
  text-transform: capitalize;
}
.tm-trip-price { font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 0.85rem; color: #0f172a; white-space: nowrap; flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 0.25rem; }
.tm-trip-cta {
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #b45309;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 999px;
  padding: 0.12rem 0.55rem;
  opacity: 0;
  transition: opacity 0.15s ease;
}
.tm-trip:hover .tm-trip-cta { opacity: 1; }

.tm-group.active .tm-trip .tm-trip-cta { opacity: 1; }
.tm-trip-date {
  font-size: 0.55rem;
  font-weight: 700;
  color: #0f172a;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}
.tm-trip-mid { flex: 1; min-width: 0; }
.tm-trip-vendor { display: block; font-weight: 700; font-size: 0.78rem; color: #0f172a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tm-trip-bus { display: block; font-size: 0.68rem; color: #64748b; }
.tm-trip-price { font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 0.85rem; color: #0f172a; white-space: nowrap; flex-shrink: 0; }

.tm-fade-enter-active, .tm-fade-leave-active { transition: opacity 0.25s ease; }
.tm-fade-enter-from, .tm-fade-leave-to { opacity: 0; }

/* Pin markers */
.tm-pin {
  position: relative;
  width: 34px;
  height: 34px;
  border-radius: 50% 50% 50% 4px;
  transform: rotate(-45deg);
  background: #0E9384;
  box-shadow: 0 6px 16px rgba(14, 147, 132, 0.5);
  display: grid;
  place-items: center;
  color: #0f172a;
  border: 2px solid #fff;
}
.tm-pin i { transform: rotate(45deg); font-size: 0.85rem; }
.tm-pin span {
  position: absolute;
  top: -9px;
  right: -9px;
  transform: rotate(45deg);
  background: #0f172a;
  color: #e2e8f0;
  border: 2px solid #fff;
  border-radius: 999px;
  font-size: 0.58rem;
  font-weight: 800;
  min-width: 17px;
  height: 17px;
  display: grid;
  place-items: center;
  padding: 0 3px;
}
.tm-pin-empty { background: linear-gradient(135deg, #94a3b8, #64748b); box-shadow: 0 6px 16px rgba(100, 116, 139, 0.4); }
.tm-pin-empty span { display: none; }

/* "My location" pulsing dot + locate control */
.tm-user-wrap { z-index: 700; }
.tm-user-dot { position: relative; width: 16px; height: 16px; }
.tm-user-dot i {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: #2563eb;
  border: 2.5px solid #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
}
.tm-user-pulse {
  position: absolute;
  inset: -7px;
  border-radius: 50%;
  background: rgba(37, 99, 235, 0.28);
  animation: tm-user-pulse 2.2s ease-out infinite;
}
@keyframes tm-user-pulse {
  0% { transform: scale(0.6); opacity: 1; }
  100% { transform: scale(1.9); opacity: 0; }
}
.tm-locate-btn {
  width: 34px;
  height: 34px;
  border: 0;
  border-bottom: 1px solid #d4d4d8;
  background: #fff;
  color: #0f172a;
  display: grid;
  place-items: center;
  font-size: 1.05rem;
  cursor: pointer;
  transition: all 0.15s ease;
}
.tm-locate-btn:last-child { border-bottom: 0; border-bottom-left-radius: 4px; border-bottom-right-radius: 4px; }
.tm-locate-btn:hover { background: #f4f4f5; color: #0E9384; }

/* Route direction: dashed line, arrowhead, destination pin */
.tm-dest-wrap { filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.35)); }
.tm-dest-pin {
  width: 40px;
  height: 40px;
  border-radius: 50% 50% 50% 4px;
  transform: rotate(-45deg);
  background: #0f172a;
  color: #0E9384;
  border: 2.5px solid #fff;
  display: grid;
  place-items: center;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.45);
}
.tm-dest-pin i { transform: rotate(45deg); font-size: 1.05rem; }
.tm-dest-name {
  position: absolute;
  top: -26px;
  left: 50%;
  transform: translateX(-50%);
  background: #0f172a;
  color: #fff;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.03em;
  padding: 0.22rem 0.6rem;
  border-radius: 999px;
  white-space: nowrap;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.35);
}
.tm-arrow-wrap { z-index: 900; }
.tm-route-arrow {
  width: 36px;
  height: 36px;
  background: #0f766e;
  color: #fff;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 1.15rem;
  border: 2.5px solid #fff;
  box-shadow: 0 6px 14px rgba(13, 148, 136, 0.5);
}
.tm-info-wrap { z-index: 890; }
.tm-route-info {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: #0f172a;
  color: #fff;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  font-family: 'Plus Jakarta Sans', sans-serif;
  padding: 0.32rem 0.7rem;
  border-radius: 999px;
  white-space: nowrap;
  border: 2px solid #fff;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.4);
}
.tm-route-info i { color: #5eead4; font-size: 0.85rem; }

/* Leaflet marker cluster - green theme */
.tm-map .marker-cluster { background: rgba(14, 147, 132, 0.28); }
.tm-map .marker-cluster div {
  background: #0E9384;
  color: #0f172a;
  font-weight: 800;
  font-family: 'Plus Jakarta Sans', sans-serif;
  box-shadow: 0 6px 16px rgba(14, 147, 132, 0.45);
}
.tm-map .marker-cluster-small, .tm-map .marker-cluster-medium, .tm-map .marker-cluster-large { background: rgba(14, 147, 132, 0.28); }
.tm-map .leaflet-control-zoom a { color: #0f172a; }
.tm-map .leaflet-control-attribution { font-size: 9px; }
.tm-map .leaflet-container { font-family: 'Inter', system-ui, sans-serif; }

@media (max-width: 900px) {
  .tm-modal { height: 94vh; height: 94dvh; }
  .tm-body { grid-template-columns: 1fr; grid-template-rows: minmax(220px, 36%) 1fr; }
  .tm-list-pane { border-left: 0; border-top: 1px solid #e2e8f0; }
  .tm-chip { display: none; }
}
@media (max-width: 640px) {
  .tm-overlay { padding: 0; align-items: flex-end; }
  .tm-modal { width: 100%; height: 100%; height: 100dvh; border-radius: 0; }
  .tm-head { padding: 0.9rem 1rem; }
  .tm-title { font-size: 1.05rem; }
  .tm-filters { padding: 0.6rem 1rem; gap: 0.5rem; }
  .tm-search input, .tm-search select { min-width: 0; flex: 1 1 130px; }
  .tm-body { grid-template-rows: minmax(200px, 38%) 1fr; }
  .tm-list-pane { padding: 0.9rem; }
}
</style>
