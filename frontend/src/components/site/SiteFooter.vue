<template>
  <footer class="site-footer">
    <div class="container">
      <div class="footer-top">
        <div class="footer-brand-col">
          <router-link to="/" class="footer-brand">
            <span class="brand-mark"><i class="bi bi-bus-front-fill"></i></span>
            <span class="brand-name">Bus<span class="brand-accent">Line</span></span>
          </router-link>
          <p class="footer-tagline">Your journey starts with our app.</p>
          <div class="footer-social">
            <a v-for="(url, key) in social" :key="key" v-if="url" :href="url" target="_blank" rel="noopener" class="social-btn" :aria-label="key">
              <i :class="'bi bi-' + key"></i>
            </a>
            <a v-if="!social || !Object.values(social).some(Boolean)" href="#" class="social-btn" aria-label="Facebook"><i class="bi bi-facebook"></i></a>
            <a v-if="!social || !Object.values(social).some(Boolean)" href="#" class="social-btn" aria-label="Instagram"><i class="bi bi-instagram"></i></a>
            <a v-if="!social || !Object.values(social).some(Boolean)" href="#" class="social-btn" aria-label="Twitter"><i class="bi bi-twitter-x"></i></a>
            <a v-if="!social || !Object.values(social).some(Boolean)" href="#" class="social-btn" aria-label="LinkedIn"><i class="bi bi-linkedin"></i></a>
          </div>
        </div>

        <nav class="footer-col" aria-label="Company">
          <h6>Company</h6>
          <router-link to="/about" class="footer-link">About</router-link>
          <a href="/#services" class="footer-link">Services</a>
          <a href="#" class="footer-link" @click.prevent>Careers</a>
          <a href="/#contact" class="footer-link">Contact</a>
        </nav>

        <nav class="footer-col" aria-label="Platform">
          <h6>Platform</h6>
          <a href="/#how-it-works" class="footer-link">How It Works</a>
          <router-link to="/vendor-register" class="footer-link">Become a Vendor</router-link>
          <router-link to="/vendor-login" class="footer-link">Vendor Login</router-link>
          <router-link to="/admin-login" class="footer-link">Admin Login</router-link>
        </nav>

        <nav class="footer-col" aria-label="Download">
          <h6>Download</h6>
          <a :href="androidUrl" target="_blank" rel="noopener" class="footer-link">Google Play</a>
          <a :href="iosUrl" target="_blank" rel="noopener" class="footer-link">App Store</a>
        </nav>

        <div class="footer-col" aria-label="Legal">
          <h6>Legal</h6>
          <router-link to="/privacy-policy" class="footer-link">Privacy Policy</router-link>
          <router-link to="/terms-and-conditions" class="footer-link">Terms &amp; Conditions</router-link>
          <router-link to="/cookie-policy" class="footer-link">Cookie Policy</router-link>
        </div>
      </div>

      <div class="footer-bottom">
        <span>© {{ year }} {{ brandName }}. All rights reserved.</span>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { s } from '../../composables/useSiteContent'

const year = new Date().getFullYear()
const brandName = s('brand.name', 'BusLine')
const iosUrl = s('app.ios_url', '/download')
const androidUrl = s('app.android_url', '/download')
const social = s('contact.social', null) || null
</script>

<style scoped>
.site-footer {
  background: #000;
  color: rgba(255, 255, 255, 0.72);
  padding: 3.5rem 0 0;
}
.footer-top {
  display: grid;
  grid-template-columns: 1.6fr 1fr 1fr 1fr 1fr;
  gap: 2rem;
  padding-bottom: 3rem;
}
.footer-brand-col .footer-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  text-decoration: none;
  margin-bottom: 1rem;
}
.brand-mark {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #fff;
  color: #000;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
}
.brand-name { color: #fff; font-weight: 800; font-size: 1.2rem; letter-spacing: -0.02em; }
.brand-accent { color: #fff; }
.footer-tagline { color: rgba(255, 255, 255, 0.6); max-width: 22rem; }
.footer-social { display: flex; gap: 0.5rem; margin-top: 1.2rem; }
.social-btn {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.16);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;
}
.social-btn:hover { background: var(--brand); color: #fff; }

.footer-col h6 {
  color: #fff;
  font-weight: 700;
  font-size: 0.8rem;
  letter-spacing: 0.02em;
  margin-bottom: 1rem;
}
.footer-link {
  color: rgba(255, 255, 255, 0.68);
  text-decoration: none;
  display: block;
  padding: 0.3rem 0;
  font-size: 0.9rem;
  transition: color 0.15s ease;
}
.footer-link:hover { color: #fff; text-decoration: underline; }

.footer-bottom {
  border-top: 1px solid rgba(255, 255, 255, 0.14);
  padding: 1.4rem 0;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.85rem;
}

@media (max-width: 767.98px) {
  .footer-top { grid-template-columns: 1fr 1fr; }
  .footer-brand-col { grid-column: 1 / -1; }
}
</style>