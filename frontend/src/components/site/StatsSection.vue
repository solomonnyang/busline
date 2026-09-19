<template>
  <section class="stats-section">
    <div class="container">
      <div class="row g-4 text-center">
        <div v-for="(stat, i) in stats" :key="i" class="col-6 col-lg-3">
          <div class="stat-item">
            <div class="stat-value">
              <CountUp :end="stat.value" :suffix="stat.suffix" />
            </div>
            <div class="stat-label">{{ stat.label }}</div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import CountUp from '../CountUp.vue'
import { s } from '../../composables/useSiteContent'

const stats = s('stats', [
  { label: 'App Users', value: 50000, suffix: '+' },
  { label: 'Transport Partners', value: 500, suffix: '+' },
  { label: 'Destinations', value: 100, suffix: '+' },
  { label: 'Platform Availability', value: 24, suffix: '/7' },
])
</script>

<style scoped>
.stats-section { background: #000; color: #fff; padding: 4rem 0; }
.stat-value {
  font-size: clamp(2.4rem, 5vw, 3.6rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1;
  color: #fff;
}
.stat-label { color: rgba(255, 255, 255, 0.7); font-weight: 500; font-size: 0.92rem; margin-top: 0.5rem; }
</style>