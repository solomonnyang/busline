<template>
  <span>{{ display }}</span>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  end: { type: Number, default: 0 },
  duration: { type: Number, default: 1500 },
  decimals: { type: Number, default: 0 },
  prefix: { type: String, default: '' },
  suffix: { type: String, default: '' },
  start: { type: Boolean, default: true },
})

const display = ref('0')

function fmt(n) {
  const num = n.toLocaleString(undefined, {
    minimumFractionDigits: props.decimals,
    maximumFractionDigits: props.decimals,
  })
  return props.prefix + num + props.suffix
}

function run() {
  const startTime = performance.now()
  const from = 0
  const to = Number(props.end) || 0

  const tick = (now) => {
    const elapsed = now - startTime
    const progress = Math.min(elapsed / props.duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3)
    display.value = fmt(from + (to - from) * eased)
    if (progress < 1) {
      raf = requestAnimationFrame(tick)
    }
  }
  cancelAnimationFrame(raf)
  raf = requestAnimationFrame(tick)
}

let raf = 0
watch(() => props.end, run)
watch(() => props.start, (v) => { if (v) run() })
onMounted(() => { if (props.start) run() })

onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>
