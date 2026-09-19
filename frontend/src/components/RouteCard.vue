<template>
  <div class="route-card">
    <div class="route-route">
      <div>
        <div class="city">{{ route.origin_city }}</div>
        <div class="small text-muted">{{ route.origin_state || 'Departure' }}</div>
      </div>
      <div class="line"></div>
      <div>
        <div class="city">{{ route.destination_city }}</div>
        <div class="small text-muted">{{ route.destination_state || 'Arrival' }}</div>
      </div>
    </div>

    <div class="route-meta d-flex flex-wrap gap-3">
      <span><i class="bi bi-clock me-1"></i>{{ durationLabel }}</span>
      <span><i class="bi bi-bus-front me-1"></i>{{ route.operator || 'Multiple operators' }}</span>
    </div>

    <div class="route-foot">
      <div>
        <div class="small text-muted">from</div>
        <div class="fw-bold fs-5 text-brand">{{ currency }}{{ formatPrice(route.price) }}</div>
      </div>
      <router-link :to="bookLink" class="btn btn-sm btn-primary">
        <i class="bi bi-arrow-right me-1"></i>Book now
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  route: { type: Object, required: true },
  bookLink: { type: String, default: '/customer/dashboard' },
  currency: { type: String, default: '₦' },
})

const durationLabel = computed(() => {
  const mins = Number(props.route.estimated_duration) || 0
  if (!mins) return 'Direct trip'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m > 0 ? m + 'm' : ''}` : `${m} min`
})

function formatPrice(v) {
  return Number(v || 0).toLocaleString()
}
</script>
