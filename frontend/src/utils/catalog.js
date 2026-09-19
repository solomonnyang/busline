export function durationMinutes(trip) {
  if (!trip.departure_time || !trip.arrival_time) return 0
  const [h1, m1] = trip.departure_time.split(':').map(Number)
  const [h2, m2] = trip.arrival_time.split(':').map(Number)
  let mins = h2 * 60 + m2 - (h1 * 60 + m1)
  if (mins < 0) mins += 24 * 60
  return mins
}

export function buildRoutes(trips = []) {
  const map = new Map()
  trips.forEach((t) => {
    const key = `${t.origin_city}|${t.destination_city}`
    if (!map.has(key)) {
      map.set(key, {
        key,
        origin_city: t.origin_city,
        destination_city: t.destination_city,
        origin_state: t.origin_state || t.origin_city,
        destination_state: t.destination_state || t.destination_city,
        price: Number(t.price) || 0,
        operator: t.vendor_name,
        estimated_duration: durationMinutes(t),
      })
    } else {
      const r = map.get(key)
      r.price = Math.min(r.price, Number(t.price) || r.price)
    }
  })
  return [...map.values()]
}

export function buildOperators(trips = []) {
  const map = new Map()
  trips.forEach((t) => {
    const name = t.vendor_name || 'Unknown'
    if (!map.has(name)) {
      map.set(name, { company_name: name, routes: new Set(), buses: new Set(), rating: 4.5 })
    }
    const op = map.get(name)
    op.routes.add(`${t.origin_city}|${t.destination_city}`)
    if (t.bus_name) op.buses.add(t.bus_name)
  })
  return [...map.values()].map((op) => ({
    company_name: op.company_name,
    routes: op.routes.size,
    buses: op.buses.size,
    rating: op.rating,
  }))
}
