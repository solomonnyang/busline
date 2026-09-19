<template>
  <section id="services" class="section services-section">
    <div class="container">
      <SectionHeading eyebrow="Services" eyebrow-icon="bi-grid" title="Explore our platform" subtitle="Everything travellers and businesses need — powered by the app." />

      <div class="row g-4">
        <div v-for="(service, i) in services" :key="i" class="col-md-6 col-lg-3">
          <div class="service-card">
            <div class="service-media">
              <img v-if="service.image" :src="service.image" :alt="service.title" />
              <ServiceIllustration v-else class="service-media-fallback" :type="['bus','destination','travel','marketplace'][i % 4]" />
            </div>
            <div class="service-body">
              <h3 class="service-title">{{ service.title }}</h3>
              <p class="service-text">{{ service.text }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import SectionHeading from '../SectionHeading.vue'
import ServiceIllustration from './illustrations/ServiceIllustration.vue'
import { s } from '../../composables/useSiteContent'

const services = s('services', [
  { title: 'Bus & Transportation', text: 'Discover transportation options and routes through the mobile application.', image: '' },
  { title: 'Explore Destinations', text: 'Discover interesting places, destinations, restaurants, hotels, and attractions.', image: '' },
  { title: 'Travel Services', text: 'Access additional services designed to make travelling easier.', image: '' },
  { title: 'Vendor Marketplace', text: 'Let businesses and transportation operators showcase their services on the platform.', image: '' },
])
</script>

<style scoped>
.services-section { background: #f6f6f6; }
.service-card {
  border-radius: 14px;
  overflow: hidden;
  background: #fff;
  border: 1px solid #ececec;
  height: 100%;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.service-card:hover { transform: translateY(-4px); box-shadow: 0 18px 44px rgba(0, 0, 0, 0.08); }
.service-media { height: 170px; overflow: hidden; background: #f6f6f6; }
.service-media img { width: 100%; height: 100%; object-fit: cover; }
.service-media-fallback {
  width: 100%;
  height: 100%;
}
.service-body { padding: 1.4rem 1.3rem 1.5rem; }
.service-title { font-weight: 700; font-size: 1.1rem; margin-bottom: 0.4rem; }
.service-text { color: rgba(0, 0, 0, 0.6); font-size: 0.9rem; margin-bottom: 0; }
</style>