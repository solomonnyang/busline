<template>
  <div class="operator-card">
    <div class="operator-logo">{{ initials }}</div>
    <h6 class="fw-bold mb-1">{{ operator.company_name }}</h6>
    <div class="stars small mb-2" :aria-label="`Rated ${operator.rating} out of 5`">
      <i v-for="n in 5" :key="n" :class="n <= Math.round(operator.rating) ? 'bi bi-star-fill' : 'bi bi-star'" class="small"></i>
      <span class="text-muted ms-1">{{ operator.rating }}</span>
    </div>
    <div class="text-muted small mb-3">
      <i class="bi bi-signpost-split me-1"></i>{{ operator.routes }} route{{ operator.routes === 1 ? '' : 's' }}
      &middot; <i class="bi bi-bus-front me-1"></i>{{ operator.buses }} buses
    </div>
    <router-link to="/customer/dashboard" class="btn btn-sm btn-ghost w-100">
      <i class="bi bi-eye me-1"></i>View trips
    </router-link>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  operator: { type: Object, required: true },
})

const initials = computed(() => {
  const words = String(props.operator.company_name || '?').trim().split(/\s+/)
  return words.slice(0, 2).map((w) => w[0]).join('').toUpperCase()
})
</script>
