<template>
  <section class="cta-banner">
    <div class="container cta-inner">
      <div class="cta-copy">
        <h2 class="cta-title">{{ title }}</h2>
        <p v-if="subtitle" class="cta-sub">{{ subtitle }}</p>
      </div>
      <div class="cta-actions">
        <a :href="downloadPage" class="btn btn-light btn-lg cta-btn">
          <i class="bi bi-arrow-down-circle me-2"></i>{{ ctaLabel }}
        </a>
      </div>
    </div>
  </section>
</template>

<script setup>
import { s } from '../../composables/useSiteContent'

defineProps({
  title: { type: String, default: 'Explore More on the App' },
  subtitle: { type: String, default: 'Everything you need, right in your pocket.' },
  ctaLabel: { type: String, default: 'Download the App' },
})

const downloadPage = s('app.download_page_url', '/download')
</script>

<style scoped>
.cta-banner {
  background: #000;
  color: #fff;
  padding: 3.5rem 0;
}
.cta-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
  flex-wrap: wrap;
}
.cta-title { font-size: clamp(1.6rem, 3.5vw, 2.4rem); font-weight: 800; letter-spacing: -0.02em; margin-bottom: 0.4rem; }
.cta-sub { color: rgba(255, 255, 255, 0.7); max-width: 34rem; margin-bottom: 0; }
.cta-btn { border-radius: 999px; font-weight: 700; }
</style>