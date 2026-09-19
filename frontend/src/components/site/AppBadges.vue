<template>
  <div class="app-badges" :class="{ 'justify-center': center }">
    <a :href="iosUrl" target="_blank" rel="noopener" class="store-badge">
      <i class="bi bi-apple"></i>
      <span class="badge-text"><small>Download on the</small><strong>App Store</strong></span>
    </a>
    <a :href="androidUrl" target="_blank" rel="noopener" class="store-badge">
      <i class="bi bi-google-play"></i>
      <span class="badge-text"><small>Get it on</small><strong>Google Play</strong></span>
    </a>
  </div>
</template>

<script setup>
import { s } from '../../composables/useSiteContent'

defineProps({
  center: { type: Boolean, default: false },
})

const iosUrl = s('app.ios_url', '/download')
const androidUrl = s('app.android_url', '/download')
</script>

<style scoped>
.app-badges { display: flex; gap: 0.8rem; flex-wrap: wrap; }
.app-badges.justify-center { justify-content: center; }
.store-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  background: #000;
  color: #fff;
  border-radius: 10px;
  padding: 0.55rem 1.1rem;
  text-decoration: none;
  border: 1px solid rgba(255, 255, 255, 0.12);
  transition: transform 0.18s ease, background 0.2s ease;
}
.store-badge:hover { transform: translateY(-2px); background: #1c1c1c; color: #fff; }
.store-badge i { font-size: 1.7rem; }
.badge-text { display: flex; flex-direction: column; text-align: left; line-height: 1.15; }
.badge-text small { font-size: 0.68rem; opacity: 0.8; }
.badge-text strong { font-size: 0.95rem; font-weight: 700; }
</style>