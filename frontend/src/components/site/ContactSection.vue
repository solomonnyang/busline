<template>
  <section id="contact" class="section contact-section">
    <div class="container">
      <div class="row justify-content-center">
        <div class="col-lg-8">
          <SectionHeading eyebrow="Contact" eyebrow-icon="bi-headset" title="Get in touch" subtitle="Our team is here to help — reach us any time." class="text-center" />

          <div class="contact-grid">
            <div class="contact-card">
              <i class="bi bi-telephone"></i>
              <strong>Phone</strong>
              <a :href="'tel:' + clean(phone)">{{ phone }}</a>
            </div>
            <div class="contact-card">
              <i class="bi bi-envelope"></i>
              <strong>Email</strong>
              <a :href="'mailto:' + email">{{ email }}</a>
            </div>
            <div class="contact-card">
              <i class="bi bi-geo-alt"></i>
              <strong>Office</strong>
              <span>{{ address }}</span>
            </div>
            <div class="contact-card">
              <i class="bi bi-life-preserver"></i>
              <strong>Support</strong>
              <span>{{ support }}</span>
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

const phone = s('contact.phone', '+234 800 000 0000')
const email = s('contact.email', 'support@busline.com')
const address = s('contact.address', 'Lagos, Nigeria')
const support = s('contact.support', 'We are available 24/7 to help you.')

function clean(v) { return String(v).replace(/[^+\d]/g, '') }
</script>

<style scoped>
.contact-section { background: #f6f6f6; }
.contact-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.2rem; }
.contact-card {
  background: #fff;
  border: 1px solid #ececec;
  border-radius: 14px;
  padding: 1.6rem 1.3rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.contact-card i { font-size: 1.6rem; color: var(--brand); margin-bottom: 0.3rem; }
.contact-card strong { font-weight: 700; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.03em; color: #888; }
.contact-card a, .contact-card span { color: #111; text-decoration: none; font-weight: 600; font-size: 0.95rem; word-break: break-word; }
.contact-card a:hover { color: var(--brand-700); }
@media (max-width: 991.98px) { .contact-grid { grid-template-columns: 1fr 1fr; } }
@media (max-width: 575.98px) { .contact-grid { grid-template-columns: 1fr; } }
</style>