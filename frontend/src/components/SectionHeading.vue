<template>
  <div class="mb-5">
    <span v-if="eyebrow" class="section-eyebrow"><i :class="eyebrowIcon"></i>{{ eyebrow }}</span>
    <h2 class="section-title mb-2">{{ title }}</h2>
    <p v-if="subtitle" class="section-sub mb-0">{{ subtitle }}</p>
  </div>
</template>

<script setup>
defineProps({
  eyebrow: { type: String, default: '' },
  eyebrowIcon: { type: String, default: 'bi-stars' },
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
})
</script>
