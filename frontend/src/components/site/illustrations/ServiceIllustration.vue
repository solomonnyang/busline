<template>
  <svg class="illus-service" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" :aria-label="label">
    <defs>
      <linearGradient id="svc-bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#EEF2FF"/>
        <stop offset="1" stop-color="#E0E7FF"/>
      </linearGradient>
    </defs>

    <!-- base layer -->
    <rect x="4" y="4" width="112" height="112" rx="22" fill="url(#svc-bg)"/>

    <!-- BUS -->
    <g v-if="type === 'bus'">
      <rect x="26" y="30" width="68" height="46" rx="10" fill="#ffffff" stroke="#4F46E5" stroke-width="3"/>
      <rect x="34" y="36" width="14" height="14" rx="3" fill="#FBBF24"/>
      <rect x="52" y="36" width="14" height="14" rx="3" fill="#F59E0B"/>
      <rect x="70" y="36" width="14" height="14" rx="3" fill="#FBBF24"/>
      <rect x="40" y="58" width="38" height="18" rx="4" fill="#4F46E5"/>
      <line x1="59" y1="58" x2="59" y2="76" stroke="#C7D2FE" stroke-width="2"/>
      <circle cx="40" cy="80" r="7" fill="#EC4899"/>
      <circle cx="80" cy="80" r="7" fill="#EC4899"/>
      <circle cx="40" cy="80" r="2.5" fill="#ffffff"/>
      <circle cx="80" cy="80" r="2.5" fill="#ffffff"/>
    </g>

    <!-- DESTINATION / pin -->
    <g v-else-if="type === 'destination'">
      <path d="M60 22 C40 22 30 38 30 52 C30 72 60 98 60 98 C60 98 90 72 90 52 C90 38 80 22 60 22 Z" fill="#F43F5E"/>
      <path d="M60 22 C40 22 30 38 30 52 C30 72 60 98 60 98 C60 98 90 72 90 52 C90 38 80 22 60 22 Z" fill="none" stroke="#BE123C" stroke-width="3"/>
      <circle cx="60" cy="52" r="14" fill="#ffffff"/>
      <circle cx="60" cy="52" r="5" fill="#F59E0B"/>
      <circle cx="94" cy="26" r="9" fill="#FBBF24"/>
    </g>

    <!-- TRAVEL / suitcase -->
    <g v-else-if="type === 'travel'">
      <rect x="30" y="40" width="60" height="46" rx="9" fill="#8B5CF6"/>
      <rect x="36" y="46" width="48" height="34" rx="6" fill="#ffffff"/>
      <rect x="46" y="28" width="28" height="16" rx="6" fill="#ffffff" stroke="#8B5CF6" stroke-width="3"/>
      <circle cx="60" cy="60" r="7" fill="#F59E0B"/>
      <circle cx="60" cy="60" r="2.5" fill="#ffffff"/>
      <path d="M46 56 l6 10 l8 -8 l4 8 l6 -6" stroke="#10B981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </g>

    <!-- MARKETPLACE / shop -->
    <g v-else>
      <rect x="24" y="40" width="72" height="44" rx="7" fill="#EC4899"/>
      <rect x="30" y="46" width="60" height="32" rx="5" fill="#ffffff"/>
      <rect x="44" y="54" width="32" height="22" rx="4" fill="#FCE7F3"/>
      <line x1="52" y1="54" x2="52" y2="76" stroke="#DB2777" stroke-width="2"/>
      <line x1="68" y1="54" x2="68" y2="76" stroke="#DB2777" stroke-width="2"/>
      <path d="M24 40 L30 26 L90 26 L96 40 Z" fill="#FBBF24"/>
      <path d="M24 40 L30 26 L90 26 L96 40 Z" fill="none" stroke="#D97706" stroke-width="2.5" stroke-linejoin="round"/>
    </g>
  </svg>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({ type: { type: String, default: 'bus' } })
const labels = { bus: 'Bus', destination: 'Explore destinations', travel: 'Travel services', marketplace: 'Vendor marketplace' }
const label = computed(() => labels[props.type] || 'Service')
</script>

<style scoped>
.illus-service { width: 100%; height: auto; display: block; }
</style>