<template>
  <section id="faqs" class="section faq-section">
    <div class="container">
      <div class="row justify-content-center">
        <div class="col-lg-8">
          <SectionHeading eyebrow="FAQs" eyebrow-icon="bi-question-circle" title="Frequently asked questions" subtitle="Quick answers about the platform and the app." class="text-center" />
          <div class="accordion" id="siteFaqs">
            <div v-for="(faq, i) in faqs" :key="i" class="accordion-item">
              <h3 class="accordion-header">
                <button
                  class="accordion-button"
                  :class="{ collapsed: i !== 0 }"
                  type="button"
                  data-bs-toggle="collapse"
                  :data-bs-target="'#faq' + i"
                  :aria-expanded="i === 0 ? 'true' : 'false'"
                  :aria-controls="'faq' + i"
                >
                  {{ faq.q }}
                </button>
              </h3>
              <div :id="'faq' + i" class="accordion-collapse collapse" :class="{ show: i === 0 }" data-bs-parent="#siteFaqs">
                <div class="accordion-body">{{ faq.a }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import SectionHeading from '../SectionHeading.vue'
import { s } from '../../composables/useSiteContent'

const faqs = s('faqs', [
  { q: 'How do I use the platform?', a: 'Everything happens in the mobile app. Download BusLine, create your account, and explore routes and services from your phone.' },
  { q: 'Where can I download the app?', a: 'BusLine is available on the App Store for iPhone and Google Play for Android.' },
  { q: 'Can I book directly from the website?', a: 'No. Bookings and customer services are handled through the mobile application. The website introduces the platform and helps vendors manage their business.' },
  { q: 'How do I become a vendor?', a: 'Click "Become a Vendor" to register your business. Once approved, you can manage your services and bookings from your vendor dashboard.' },
  { q: 'How do vendors manage their businesses?', a: 'Vendors sign in to the vendor dashboard to manage services, availability, bookings, performance, and revenue.' },
  { q: 'Is the app available on Android?', a: 'Yes. The BusLine app is available on Google Play for Android devices.' },
  { q: 'Is the app available on iPhone?', a: 'Yes. The BusLine app is available on the Apple App Store for iPhones.' },
  { q: 'How do I contact support?', a: 'Reach our support team using the contact details on this website, or use the in-app help feature.' },
])
</script>

<style scoped>
.faq-section { background: #fff; }
.faq-section :deep(.accordion-item) { border: 1px solid #ececec; border-radius: 12px !important; margin-bottom: 0.7rem; overflow: hidden; }
.faq-section :deep(.accordion-button) { font-weight: 600; background: #fff; }
.faq-section :deep(.accordion-button:not(.collapsed)) { color: var(--brand-700); background: #f6f6f6; box-shadow: none; }
.faq-section :deep(.accordion-button:focus) { box-shadow: none; }
</style>