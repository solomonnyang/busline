<template>
  <section id="download" class="section app-download-section">
    <div class="container">
      <div class="row align-items-center g-5">
        <div class="col-lg-6">
          <span class="section-eyebrow"><i class="bi bi-phone"></i>Mobile App</span>
          <h2 class="section-title">{{ s('app.title', 'Everything You Need, Right in Your Pocket') }}</h2>
          <p class="section-sub">{{ s('app.subtitle', 'Book trips, explore destinations and manage your travel — all from one secure app.') }}</p>
          <ul class="app-features">
            <li v-for="(feature, i) in features" :key="i"><i class="bi bi-check2"></i>{{ feature }}</li>
          </ul>
          <div class="app-badges">
            <AppBadges />
          </div>
        </div>
        <div class="col-lg-6">
          <div class="phone-wrap" aria-hidden="true">
            <AppIllustration />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import AppBadges from './AppBadges.vue'
import AppIllustration from './illustrations/AppIllustration.vue'
import { s } from '../../composables/useSiteContent'

const features = s('app.features', [
  'Discover transportation options',
  'Explore destinations',
  'View available routes',
  'Manage your trips',
  'Access travel services',
  'Receive notifications',
  'Secure and convenient experience',
])
</script>

<style scoped>
.app-download-section { background: #fff; }
.app-features {
  list-style: none;
  padding: 0;
  margin: 1.6rem 0 1.8rem;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.65rem 1.5rem;
}
.app-features li { display: flex; align-items: center; gap: 0.55rem; font-weight: 500; color: #111; }
.app-features li i { color: var(--brand); font-weight: 700; }

.phone-wrap { position: relative; max-width: 420px; margin: 0 auto; }
.phone-wrap :deep(.illus-phone) {
  border-radius: 40px;
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.18);
  overflow: hidden;
}
@media (max-width: 575.98px) {
  .app-features { grid-template-columns: 1fr; }
}
</style>