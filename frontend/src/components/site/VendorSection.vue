<template>
  <section id="vendor" class="section vendor-section">
    <div class="container">
      <div class="row align-items-center g-5">
        <div class="col-lg-6">
          <span class="section-eyebrow"><i class="bi bi-buildings"></i>For Business</span>
          <h2 class="section-title">{{ s('vendor.title', 'Grow Your Business With Us') }}</h2>
          <p class="section-sub">{{ s('vendor.subtitle', 'Join our growing network of transportation operators and travel businesses. Reach more customers and manage your services through our vendor platform.') }}</p>
          <router-link to="/vendor-register" class="btn btn-dark btn-lg vendor-cta">
            {{ s('vendor.cta', 'Become a Vendor') }} <i class="bi bi-arrow-right ms-2"></i>
          </router-link>
        </div>
        <div class="col-lg-6">
          <div class="benefit-grid">
            <div v-for="(benefit, i) in benefits" :key="i" class="benefit-item">
              <span class="benefit-icon"><i :class="icons[i % icons.length]"></i></span>
              <span>{{ benefit }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { s } from '../../composables/useSiteContent'

const icons = ['bi-people', 'bi-sliders', 'bi-clipboard-check', 'bi-calendar-check', 'bi-graph-up-arrow', 'bi-bell', 'bi-columns-gap', 'bi-cash-stack']
const benefits = s('vendor.benefits', [
  'Reach more customers',
  'Manage your services',
  'Manage bookings / orders',
  'Manage availability',
  'Track performance',
  'Receive notifications',
  'Business dashboard',
  'Revenue analytics',
])
</script>

<style scoped>
.vendor-section { background: #fff; }
.vendor-cta { border-radius: 999px; font-weight: 700; }
.benefit-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.8rem;
}
.benefit-item {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 1rem 1.1rem;
  background: #f6f6f6;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.9rem;
  color: #111;
}
.benefit-icon {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border-radius: 10px;
  background: #000;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
}
.benefit-icon i { color: #fff; }
@media (max-width: 575.98px) {
  .benefit-grid { grid-template-columns: 1fr; }
}
</style>