/**
 * Geolocation helpers: detect the user's position and map it to the
 * nearest city in the catalogue. Results are cached in localStorage.
 */

const POSITION_KEY = 'busline.user_position'
const DETECTED_KEY = 'busline.detected_city'

export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Promise wrapper around the browser geolocation API. */
export function getCurrentPosition(timeout = 8000) {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation is not supported by this browser.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const point = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        localStorage.setItem(POSITION_KEY, JSON.stringify(point))
        resolve(point)
      },
      (err) => reject(new Error(err.message || 'Location could not be determined.')),
      { enableHighAccuracy: false, timeout, maximumAge: 600000 }
    )
  })
}

/** Pick the closest city from the catalogue to a coordinate. */
export function nearestCity(cities, { lat, lng }) {
  let best = null
  let bestDist = Infinity
  for (const c of cities) {
    if (!c.lat || !c.lng) continue
    const d = haversineKm(Number(lat), Number(lng), Number(c.lat), Number(c.lng))
    if (d < bestDist) {
      bestDist = d
      best = { city: c, distanceKm: Math.round(d) }
    }
  }
  return best
}

/** Detect location and resolve the nearest catalogue city. */
export async function detectCity(cities) {
  try {
    const point = await getCurrentPosition()
    const match = nearestCity(cities, point)
    if (match) {
      localStorage.setItem(DETECTED_KEY, JSON.stringify(match.city.id))
      return match.city
    }
    return null
  } catch {
    // Fall back to the cached detection, then to nothing (user picks manually).
    const cached = localStorage.getItem(DETECTED_KEY)
    if (cached) return cities.find((c) => String(c.id) === cached) || null
    return null
  }
}

export function getCachedCity(cities) {
  const cached = localStorage.getItem(DETECTED_KEY)
  if (!cached) return null
  return cities.find((c) => String(c.id) === cached) || null
}
