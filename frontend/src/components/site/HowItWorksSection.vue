<template>
  <section id="how-it-works" class="section how-section">
    <div class="container">
      <SectionHeading eyebrow="How It Works" eyebrow-icon="bi-diagram-3" title="Four simple steps" subtitle="Getting started with BusLine takes just minutes — everything happens in the app." />

      <div class="row g-4">
        <div v-for="(step, i) in steps" :key="i" class="col-md-6 col-lg-3">
          <div class="how-card">
            <span class="step-index">{{ String(i + 1).padStart(2, '0') }}</span>
            <div class="step-icon"><i :class="icons[i % icons.length]"></i></div>
            <h3 class="step-title">{{ step.title }}</h3>
            <p class="step-text">{{ step.text }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import SectionHeading from '../SectionHeading.vue'
import { s } from '../../composables/useSiteContent'

const icons = ['bi-download', 'bi-person-plus', 'bi-compass', 'bi-suitcase2']
const steps = s('how_it_works', [
  { title: 'Download', text: 'Get the mobile app from the App Store or Google Play.' },
  { title: 'Create Your Account', text: 'Register directly inside the mobile app.' },
  { title: 'Explore', text: 'Discover transportation services, routes, destinations and more.' },
  { title: 'Travel', text: 'Use the app to manage your whole travel experience.' },
])
</script>

<style scoped>
.how-section { background: #fff; }
.how-card {
  position: relative;
  padding: 2rem 1.4rem 1.6rem;
  border: 1px solid #ececec;
  border-radius: 14px;
  background: #fff;
  height: 100%;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.how-card:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(0, 0, 0, 0.07); }
.step-index {
  position: absolute;
  top: 1.2rem;
  right: 1.3rem;
  font-weight: 800;
  font-size: 2rem;
  color: rgba(0, 0, 0, 0.06);
  letter-spacing: -0.03em;
}
.step-icon {
  width: 58px;
  height: 58px;
  border-radius: 14px;
  background: #000;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  margin-bottom: 1.2rem;
}
.step-title { font-weight: 700; font-size: 1.1rem; margin-bottom: 0.4rem; }
.step-text { color: rgba(0, 0, 0, 0.6); font-size: 0.92rem; margin-bottom: 0; }
</style>