<template>
  <div class="text-center py-5" v-if="show">
    <div class="spinner-border text-primary" role="status"></div>
    <p class="text-muted small mt-2 mb-0">{{ text }}</p>
  </div>
</template>

<script setup>
defineProps({
  show: { type: Boolean, default: false },
  text: { type: String, default: 'Loading...' },
})
</script>
