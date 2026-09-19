<template>
  <span
    class="avatar"
    :style="{
      width: size + 'px',
      height: size + 'px',
      fontSize: Math.round(size * 0.4) + 'px',
      background: bg,
      color: color,
      backgroundImage: src ? `url(${src})` : undefined,
    }"
    :title="name"
    role="img"
    :aria-label="name"
  >
    <span v-if="!src">{{ initials }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  name: { type: String, default: '?' },
  src: { type: String, default: '' },
  size: { type: Number, default: 40 },
  gradient: { type: Number, default: 0 },
})

const palette = [
  ['#dbeafe', '#1d4ed8'],
  ['#ecfdf5', '#047857'],
  ['#fffbeb', '#b45309'],
  ['#fef2f2', '#b91c1c'],
  ['#f5f3ff', '#6d28d9'],
  ['#fdf2f8', '#be185d'],
  ['#eff6ff', '#0e7490'],
]

const initials = computed(() => {
  const words = String(props.name || '?').trim().split(/\s+/)
  const first = (words[0] || '?')[0] || '?'
  const last = words.length > 1 ? words[words.length - 1][0] : ''
  return (first + last).toUpperCase()
})

const colors = computed(() => palette[props.gradient % palette.length])
const bg = computed(() => colors.value[0])
const color = computed(() => colors.value[1])
</script>

<style scoped>
.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-weight: 700;
  flex-shrink: 0;
  background-size: cover;
  background-position: center;
  user-select: none;
}
</style>
