<template>
  <section id="about" class="section about-section">
    <div class="container">
      <div class="row align-items-center g-5">
        <div class="col-lg-6">
          <div class="about-visual" aria-hidden="true"><MapIllustration /></div>
        </div>
        <div class="col-lg-6">
          <span class="section-eyebrow"><i class="bi bi-stars"></i>About Us</span>
          <h2 class="section-title">{{ s('about.title', 'We are the future of travel') }}</h2>
          <p class="section-sub">{{ s('about.body', 'We are a trust-driven platform connecting passengers with verified transportation operators and travel businesses.') }}</p>
          <div class="about-points">
            <div class="about-point">
              <i class="bi bi-eye"></i>
              <div>
                <strong>Our Vision</strong>
                <p>{{ s('about.vision', 'To make travel simple, secure, and accessible for everyone.') }}</p>
              </div>
            </div>
            <div class="about-point">
              <i class="bi bi-bullseye"></i>
              <div>
                <strong>Our Mission</strong>
                <p>{{ s('about.mission', 'To connect travellers with reliable transport and travel services through one secure app.') }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import MapIllustration from './illustrations/MapIllustration.vue'
import { s } from '../../composables/useSiteContent'
</script>

<style scoped>
.about-section { background: #f6f6f6; }
.about-visual {
  max-width: 460px;
  margin: 0 auto;
  overflow: hidden;
  border-radius: 20px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.12);
}
.about-visual :deep(.illus-map) { width: 100%; height: auto; display: block; }
.about-points { display: flex; flex-direction: column; gap: 1.2rem; margin-top: 1.6rem; }
.about-point { display: flex; gap: 0.95rem; align-items: flex-start; }
.about-point i {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 12px;
  background: #000;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
}
.about-point strong { display: block; font-weight: 700; margin-bottom: 0.15rem; }
.about-point p { color: rgba(0, 0, 0, 0.62); font-size: 0.92rem; margin-bottom: 0; }
</style>