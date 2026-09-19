<template>
  <span class="badge rounded-pill text-uppercase px-3" :class="badgeClass">
    {{ label }}
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: { type: String, default: '' },
})

const map = {
  // Booking / trip statuses
  pending: 'chip chip-warning',
  confirmed: 'chip chip-success',
  cancelled: 'chip chip-danger',
  completed: 'chip chip-success',
  paid: 'chip chip-success',
  unpaid: 'chip chip-warning',
  refunded: 'chip chip-info',
  failed: 'chip chip-danger',
  scheduled: 'chip chip-info',
  in_progress: 'chip chip-info',
  active: 'chip chip-success',
  inactive: 'chip chip-neutral',
  maintenance: 'chip chip-warning',
  approved: 'chip chip-success',
  suspended: 'chip chip-danger',
  success: 'chip chip-success',
  // HR / payroll statuses
  draft: 'chip chip-neutral',
  rejected: 'chip chip-danger',
  present: 'chip chip-success',
  late: 'chip chip-warning',
  half_day: 'chip chip-info',
  absent: 'chip chip-danger',
  holiday: 'chip chip-info',
}

const badgeClass = computed(() => map[props.status] || 'bg-secondary')
const label = computed(() => String(props.status ?? '').replace(/_/g, ' '))
</script>
