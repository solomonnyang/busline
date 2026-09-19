<template>
  <div class="card stat-card h-100">
    <div class="card-body d-flex align-items-center gap-3">
      <div class="stat-icon" :style="{ background: iconBg, color: iconColor }">
        <i :class="icon"></i>
      </div>
      <div>
        <div class="fs-3 fw-bold lh-1">{{ value }}</div>
        <div class="text-muted small">{{ label }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  icon: { type: String, default: 'bi-speedometer2' },
  iconBg: { type: String, default: '#eef2ff' },
  iconColor: { type: String, default: '#0d6efd' },
})
</script>
