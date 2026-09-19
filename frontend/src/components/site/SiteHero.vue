<template>
  <section class="site-hero">
    <div class="container">
      <div class="row align-items-center g-5">
        <div class="col-lg-6">
          <span class="hero-eyebrow"><i class="bi bi-bus-front-fill"></i> {{ s('brand.name', 'BusLine') }}</span>
          <h1 class="hero-title">{{ s('hero.title', 'Your Journey Starts With Our App.') }}</h1>
          <p class="hero-sub">{{ s('hero.subtitle', 'Discover a smarter and more convenient way to travel. Download our mobile app to explore routes, discover transportation options, and manage your journeys from your phone.') }}</p>
          <div class="hero-actions">
            <a :href="downloadPage" class="btn btn-dark btn-lg hero-cta">
              <i class="bi bi-arrow-down-circle me-2"></i>{{ s('hero.primary_cta', 'Download the App') }}
            </a>
            <router-link to="/vendor-register" class="btn btn-outline-dark btn-lg hero-cta">
              {{ s('hero.secondary_cta', 'Become a Vendor') }}
            </router-link>
          </div>
          <div class="hero-badges">
            <AppBadges />
          </div>
          <p class="hero-hint">
            <i class="bi bi-phone me-1"></i>Travellers register, sign in, and book inside the app.
          </p>
        </div>
        <div class="col-lg-6">
          <div class="hero-media" aria-hidden="true">
            <img v-if="heroImage" :src="heroImage" alt="Transportation" />
            <HeroIllustration v-else />
            <div class="media-chip chip-a"><i class="bi bi-patch-check-fill"></i>Verified operators</div>
            <div class="media-chip chip-b"><i class="bi bi-stars"></i>5,000+ trips daily</div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import AppBadges from './AppBadges.vue'
import HeroIllustration from './illustrations/HeroIllustration.vue'
import { s } from '../../composables/useSiteContent'

const downloadPage = s('app.download_page_url', '/download')
const heroImage = s('hero.image', '')
</script>

<style scoped>
.site-hero {
  background:
    radial-gradient(900px 500px at 88% -10%, rgba(0, 0, 0, 0.045), transparent 60%),
    #fff;
  padding: 5.5rem 0 6rem;
}
.hero-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: rgba(0, 0, 0, 0.05);
  color: var(--brand-700);
  font-weight: 700;
  font-size: 0.8rem;
  padding: 0.35rem 0.9rem;
  border-radius: 999px;
  margin-bottom: 1.25rem;
}
.hero-title {
  font-size: clamp(2.6rem, 5.5vw, 4.1rem);
  font-weight: 800;
  line-height: 1.02;
  letter-spacing: -0.03em;
  color: #000;
  margin-bottom: 1.2rem;
}
.hero-sub {
  color: rgba(0, 0, 0, 0.66);
  font-size: 1.12rem;
  max-width: 34rem;
  margin-bottom: 1.9rem;
}
.hero-actions { display: flex; flex-wrap: wrap; gap: 0.9rem; margin-bottom: 1.8rem; }
.hero-cta { border-radius: 999px; font-weight: 700; }
.hero-badges { margin-bottom: 1.2rem; }
.hero-hint {
  color: rgba(0, 0, 0, 0.5);
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.15rem;
}
.hero-hint i { color: var(--brand-700); }

.hero-media {
  position: relative;
  max-width: 480px;
  margin: 0 auto;
}
.hero-media img {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border-radius: 20px;
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.18);
}
.hero-media :deep(.illus-hero) {
  border-radius: 20px;
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.16);
  overflow: hidden;
}
.hero-media-fallback {
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: 20px;
  background: linear-gradient(150deg, #111111, #3a3a3a);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8rem;
}
.media-chip {
  position: absolute;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  background: #fff;
  color: #000;
  font-weight: 700;
  font-size: 0.85rem;
  padding: 0.55rem 0.95rem;
  border-radius: 999px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.14);
}
.media-chip i { color: var(--brand); }
.chip-a { top: 18px; left: -12px; }
.chip-b { bottom: 26px; right: -6px; }

@media (max-width: 991.98px) {
  .hero-media { margin-top: 2rem; }
}
</style>