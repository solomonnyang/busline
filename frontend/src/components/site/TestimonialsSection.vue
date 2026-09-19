<template>
  <section class="section testimonials-section">
    <div class="container">
      <SectionHeading eyebrow="Testimonials" eyebrow-icon="bi-chat-quote" title="Loved by travellers and partners" subtitle="Real stories from people who use BusLine every day." />

      <div class="testimonial-grid">
        <div v-for="(t, i) in items" :key="i" class="testimonial-card">
          <div class="t-stars"><i v-for="n in 5" :key="n" class="bi bi-star-fill"></i></div>
          <p class="t-text">“{{ t.text }}”</p>
          <div class="t-author">
            <Avatar :name="t.name" :size="46" :gradient="t.name.length" />
            <div>
              <div class="t-name">{{ t.name }}</div>
              <div class="t-role">{{ t.role }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import SectionHeading from '../SectionHeading.vue'
import Avatar from '../Avatar.vue'
import { s } from '../../composables/useSiteContent'

// For many testimonials we show the first few; on mobile a simple wrap.
const items = s('testimonials', [
  { name: 'Ada Obi', role: 'Frequent traveller', text: 'Booking trips from my phone has never been easier. The app is fast, secure, and reliable.', avatar: '' },
  { name: 'Chinedu Eze', role: 'Transport partner', text: 'The vendor dashboard gives my fleet everything it needs to reach more customers and grow.', avatar: '' },
  { name: 'Fatima Bello', role: 'Traveller', text: 'I love how I can explore destinations and manage my whole trip in one place.', avatar: '' },
])
</script>

<style scoped>
.testimonials-section { background: #f6f6f6; }
.testimonial-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
.testimonial-card {
  background: #fff;
  border: 1px solid #ececec;
  border-radius: 16px;
  padding: 1.8rem;
  display: flex;
  flex-direction: column;
  height: 100%;
}
.t-stars { color: #f5b301; display: flex; gap: 0.2rem; margin-bottom: 1rem; }
.t-text { color: #2a2a2a; font-size: 1rem; line-height: 1.6; flex: 1; margin-bottom: 1.4rem; }
.t-author { display: flex; align-items: center; gap: 0.8rem; }
.t-name { font-weight: 700; }
.t-role { color: rgba(0, 0, 0, 0.55); font-size: 0.85rem; }
@media (max-width: 991.98px) {
  .testimonial-grid { grid-template-columns: 1fr; }
}
</style>