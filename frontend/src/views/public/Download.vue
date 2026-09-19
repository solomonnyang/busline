<template>
  <div>
    <section class="download-hero">
      <div class="container text-center">
        <span class="download-eyebrow"><i class="bi bi-download"></i> Download the App</span>
        <h1 class="download-title">{{ s('app.title', 'Everything You Need, Right in Your Pocket') }}</h1>
        <p class="download-sub">{{ s('app.subtitle', 'Download BusLine and manage your travel from your phone. Travellers register, sign in and book inside the app.') }}</p>
        <AppBadges class="justify-center download-badges" />
        <div class="qr-row">
          <img v-if="qrImage" :src="qrImage" alt="Scan to download BusLine" />
          <div v-else class="qr-fallback"><i class="bi bi-qr-code"></i></div>
          <span>Scan the code to download</span>
        </div>
      </div>
    </section>

    <section class="section download-features">
      <div class="container">
        <div class="row g-4">
          <div class="col-md-4" v-for="(f, i) in features" :key="i">
            <div class="dl-card">
              <i class="dl-icon" :class="icons[i % icons.length]"></i>
              <h3>{{ f }}</h3>
            </div>
          </div>
        </div>
      </div>
    </section>

    <CtaBanner />
  </div>
</template>

<script setup>
import AppBadges from '../../components/site/AppBadges.vue'
import CtaBanner from '../../components/site/CtaBanner.vue'
import { s } from '../../composables/useSiteContent'

const icons = ['bi-compass', 'bi-journal-text', 'bi-bell', 'bi-shield-lock', 'bi-person-badge', 'bi-headset']
const features = s('app.features', [
  'Discover transportation options',
  'Explore destinations',
  'View available routes',
  'Manage your trips',
  'Access travel services',
  'Receive notifications',
])
const qrImage = s('app.qr_image', '')
</script>

<style scoped>
.download-hero { background: #fff; padding: 5rem 0 4rem; }
.download-eyebrow { display: inline-flex; align-items: center; gap: 0.4rem; background: rgba(0,0,0,0.05); color: var(--brand-700); font-weight: 700; padding: 0.4rem 1rem; border-radius: 999px; margin-bottom: 1.2rem; }
.download-title { font-size: clamp(2.4rem, 5vw, 3.4rem); font-weight: 800; letter-spacing: -0.03em; max-width: 44rem; margin: 0 auto 1rem; }
.download-sub { color: rgba(0,0,0,0.66); font-size: 1.08rem; max-width: 40rem; margin: 0 auto 2rem; }
.download-badges { margin-bottom: 2rem; }
.qr-row { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; color: rgba(0,0,0,0.6); font-size: 0.85rem; }
.qr-row img { width: 120px; height: 120px; border: 1px solid #ddd; border-radius: 12px; }
.qr-fallback { width: 120px; height: 120px; border: 1px solid #ddd; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 3rem; color: #000; }

.download-features { background: #f6f6f6; }
.dl-card { background: #fff; border: 1px solid #ececec; border-radius: 14px; padding: 1.6rem; height: 100%; text-align: center; }
.dl-icon { font-size: 2rem; color: var(--brand); display: block; margin-bottom: 0.8rem; }
.dl-card h3 { font-size: 1.05rem; font-weight: 700; }
</style>