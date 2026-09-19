<template>
  <div>
    <div ref="mapEl" class="city-map"></div>
    <div v-if="!coordsSet" class="text-muted mt-1" style="font-size: 0.72rem">
      <i class="bi bi-info-circle me-1"></i>Click the map (or drag the marker) to set the city's coordinates.
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  lat: { type: Number, default: null },
  lng: { type: Number, default: null },
})

const emit = defineEmits(['update:lat', 'update:lng'])

const mapEl = ref(null)
let leaflet = null
let map = null
let marker = null

const DEFAULT_CENTER = [9.08, 8.67]
const DEFAULT_ZOOM = 6

const coordsSet = ref(!!(props.lat != null && props.lng != null))

function setPosition(latlng) {
  coordsSet.value = true
  emit('update:lat', Number(latlng.lat.toFixed(6)))
  emit('update:lng', Number(latlng.lng.toFixed(6)))
}

async function init() {
  if (!leaflet) {
    const LMod = await import('leaflet')
    leaflet = LMod.default || LMod
    await import('leaflet/dist/leaflet.css')
  }
  await new Promise((r) => requestAnimationFrame(r))
  if (!mapEl.value) return

  if (!map) {
    const hasCoords = props.lat != null && props.lng != null
    map = leaflet.map(mapEl.value, {
      center: hasCoords ? [props.lat, props.lng] : DEFAULT_CENTER,
      zoom: hasCoords ? 10 : DEFAULT_ZOOM,
      scrollWheelZoom: true,
      attributionControl: true,
    })
    leaflet
      .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      })
      .addTo(map)

    map.on('click', (e) => {
      placeMarker(e.latlng)
      setPosition(e.latlng)
    })
  }

  if (hasCoords()) placeMarker(leaflet.latLng(props.lat, props.lng), false)

  setTimeout(() => map.invalidateSize(), 50)
}

function hasCoords() {
  return props.lat != null && props.lng != null
}

function placeMarker(latlng, pan = true) {
  if (!map) return
  if (marker) marker.remove()
  marker = leaflet.marker(latlng, { draggable: true })
  marker.addTo(map)
  marker.on('dragend', () => {
    setPosition(marker.getLatLng())
  })
  if (pan) map.panTo(latlng)
}

watch(
  () => [props.lat, props.lng],
  ([lat, lng]) => {
    if (!map) return
    if (lat != null && lng != null) {
      placeMarker(leaflet.latLng(lat, lng), false)
    }
  }
)

onMounted(init)

onBeforeUnmount(() => {
  if (map) {
    map.remove()
    map = null
  }
  marker = null
})
</script>

<style scoped>
.city-map {
  height: 240px;
  border-radius: 12px;
  border: 1px solid var(--border, #e2e8f0);
  z-index: 0;
}
:deep(.leaflet-container) {
  border-radius: 12px;
  font-family: 'Inter', system-ui, sans-serif;
}
</style>
