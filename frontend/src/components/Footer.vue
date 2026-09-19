<template>
  <footer class="site-footer mt-auto">
    <div class="container footer-main py-5">
      <div class="row g-4 g-lg-5">

        <div class="col-lg-4">
          <div class="d-flex align-items-center gap-2 fw-bold font-display mb-3 footer-brand" style="font-size: 1.25rem">
            <span class="logo-mark" aria-hidden="true"><i class="bi bi-bus-front-fill"></i></span>
            Bus<span class="brand-accent">Line</span>
          </div>
          <p class="footer-blurb small mb-4">
            Book verified bus trips across Nigeria with secure payments, live seat maps, and digital QR tickets — all in one place.
          </p>

          <form class="newsletter" novalidate @submit.prevent="subscribe">
            <label for="newsletter-email" class="form-label small fw-semibold">Get travel deals in your inbox</label>
            <div class="d-flex gap-2" :class="{ 'is-invalid-wrap': newsError }">
              <input
                id="newsletter-email"
                v-model.trim="email"
                type="email"
                class="form-control"
                :class="{ 'is-invalid': newsError }"
                placeholder="you@example.com"
                autocomplete="email"
                aria-describedby="newsletter-feedback"
              />
              <button class="btn btn-primary px-3" type="submit" :disabled="subscribed">
                {{ subscribed ? 'Subscribed' : 'Subscribe' }}
              </button>
            </div>
            <p v-if="newsError" id="newsletter-feedback" class="small mb-0 mt-2 text-danger-emphasis">
              <i class="bi bi-exclamation-circle me-1"></i>{{ newsError }}
            </p>
            <p v-else-if="subscribed" id="newsletter-feedback" class="small mb-0 mt-2 text-success-emphasis fade-in">
              <i class="bi bi-check-circle me-1"></i>You're on the list. Travel deals coming your way!
            </p>
          </form>

          <div class="d-flex gap-2 mt-4">
            <a v-for="s in socials" :key="s.label" class="social-btn" :href="s.href" :aria-label="s.label">
              <i :class="s.icon" aria-hidden="true"></i>
            </a>
          </div>
        </div>

        <div class="col-6 col-md-3 col-lg-2 offset-lg-1">
          <h6>Popular Routes</h6>
          <router-link v-for="r in popularRoutes" :key="r" class="link" to="/routes">{{ r }}</router-link>
        </div>

        <div class="col-6 col-md-3 col-lg-2">
          <h6>Company</h6>
          <router-link class="link" to="/#why-us">Why BusLine</router-link>
          <router-link class="link" to="/operators">Operators</router-link>
          <router-link class="link" to="/faqs">FAQs</router-link>
          <router-link class="link" to="/register?role=vendor">Become an operator</router-link>
        </div>

        <div class="col-md-6 col-lg-3">
          <h6>Support</h6>
          <ul class="contact-list list-unstyled small mb-3">
            <li><i class="bi bi-envelope me-2"></i><a href="mailto:support@busline.ng">support@busline.ng</a></li>
            <li><i class="bi bi-telephone me-2"></i><a href="tel:+2348000000000">+234 800 000 0000</a></li>
            <li><i class="bi bi-geo-alt me-2"></i>Ikeja, Lagos, Nigeria</li>
            <li><i class="bi bi-clock me-2"></i>24/7 customer support</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="footer-bottom">
      <div class="container py-3 d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
        <div class="small order-2 order-md-1">&copy; {{ year }} BusLine. All rights reserved.</div>
        <nav class="small d-flex flex-wrap justify-content-center gap-3 order-1 order-md-2" aria-label="Legal">
          <router-link class="legal-link" to="/">Terms &amp; Conditions</router-link>
          <router-link class="legal-link" to="/">Privacy Policy</router-link>
          <router-link class="legal-link" to="/">Refund Policy</router-link>
        </nav>
        <div class="pay-badges d-none d-md-inline-flex order-3" aria-label="Accepted payment methods">
          <span>Visa</span><span>Mastercard</span><span>Verve</span><span>Paystack</span>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { ref } from 'vue'

const email = ref('')
const subscribed = ref(false)
const newsError = ref('')
const year = new Date().getFullYear()

const socials = [
  { label: 'Twitter / X', icon: 'bi bi-twitter-x', href: '#' },
  { label: 'Facebook', icon: 'bi bi-facebook', href: '#' },
  { label: 'Instagram', icon: 'bi bi-instagram', href: '#' },
  { label: 'LinkedIn', icon: 'bi bi-linkedin', href: '#' },
]

const popularRoutes = [
  'Lagos → Abuja',
  'Lagos → Enugu',
  'Abuja → Port Harcourt',
  'Lagos → Ibadan',
  'Abuja → Kano',
  'Onitsha → Lagos',
]

function subscribe() {
  newsError.value = ''
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)
  if (!email.value) {
    newsError.value = 'Please enter your email address.'
    return
  }
  if (!valid) {
    newsError.value = 'That email address doesn\u2019t look right.'
    return
  }
  subscribed.value = true
}
</script>

<style scoped>
.site-footer {
  background: #000;
  color: rgba(255, 255, 255, 0.72);
}
.footer-brand { color: #fff; }
.logo-mark {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: var(--brand);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.brand-accent { color: var(--brand); }
.footer-blurb { max-width: 24rem; color: rgba(255, 255, 255, 0.6); }

.newsletter .form-label { color: rgba(255, 255, 255, 0.85); }
.newsletter .form-control {
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: transparent;
  color: #fff;
  min-height: 44px;
  border-radius: 0;
}
.newsletter .form-control::placeholder { color: rgba(255, 255, 255, 0.4); }
.newsletter .form-control:focus {
  background: rgba(255, 255, 255, 0.06);
  border-color: var(--brand);
  box-shadow: 0 0 0 0 transparent;
  color: #fff;
}
.text-success-emphasis { color: #5ad6a5 !important; }
.text-danger-emphasis { color: #ff9d9d !important; }

.site-footer h6 {
  color: #fff;
  font-weight: 700;
  font-size: 0.82rem;
  letter-spacing: 0.02em;
  text-transform: none;
  margin-bottom: 1.1rem;
}
.link {
  color: rgba(255, 255, 255, 0.66);
  text-decoration: none;
  display: block;
  padding: 0.26rem 0;
  font-size: 0.92rem;
  transition: color 0.15s ease;
}
.link:hover { color: #fff; text-decoration: underline; }
.link:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; border-radius: 4px; }

.contact-list li { padding: 0.22rem 0; color: rgba(255, 255, 255, 0.7); }
.contact-list a { color: inherit; text-decoration: none; }
.contact-list a:hover { color: #fff; text-decoration: underline; }
.contact-list i { color: var(--brand); }

.social-btn {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.16);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
}
.social-btn:hover {
  background: var(--brand);
  border-color: var(--brand);
  color: #fff;
  transform: translateY(-2px);
}
.social-btn:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }

.footer-bottom {
  border-top: 1px solid rgba(255, 255, 255, 0.14);
  color: rgba(255, 255, 255, 0.6);
}
.legal-link {
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
}
.legal-link:hover { color: #fff; text-decoration: underline; }
.pay-badges { gap: 0.4rem; }
.pay-badges span {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 4px;
  padding: 0.18rem 0.5rem;
}
</style>
