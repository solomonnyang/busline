<template>
  <div class="empty-state fade-in">
    <div class="es-ico"><i :class="icon"></i></div>
    <h6 class="fw-bold text-body mb-1">{{ title }}</h6>
    <p class="mb-3 small" v-if="message">{{ message }}</p>
    <router-link v-if="actionTo" :to="actionTo" class="btn btn-sm btn-primary">
      <i :class="`bi ${actionIcon} me-1`"></i>{{ actionLabel }}
    </router-link>
    <slot name="actions" />
  </div>
</template>

<script setup>
defineProps({
  icon: { type: String, default: 'bi-inbox' },
  title: { type: String, default: 'Nothing here yet' },
  message: { type: String, default: '' },
  actionTo: { type: String, default: '' },
  actionLabel: { type: String, default: 'Get started' },
  actionIcon: { type: String, default: 'bi-arrow-right' },
})
</script>
