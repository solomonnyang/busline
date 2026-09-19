<template>
  <header class="site-header" :class="{ scrolled }">
    <div class="container site-header-inner">
      <router-link to="/" class="site-brand" aria-label="BusLine home">
        <span class="brand-mark"><i class="bi bi-bus-front-fill"></i></span>
        <span class="brand-name">Bus<span class="brand-accent">Line</span></span>
      </router-link>

      <nav class="site-nav" aria-label="Primary">
        <RouterLink v-for="link in links" :key="link.to" :to="link.to" class="nav-link">
          {{ link.label }}
        </RouterLink>
      </nav>

      <div class="site-actions">
        <router-link to="/vendor-login" class="nav-link d-none d-lg-inline-flex">Vendor Login</router-link>
        <a :href="downloadUrl" class="btn btn-dark btn-download">
          <i class="bi bi-arrow-down-circle me-1"></i>Download the App
        </a>
        <button
          class="menu-toggle"
          type="button"
          :aria-expanded="open ? 'true' : 'false'"
          aria-label="Toggle menu"
          @click="open = !open"
        >
          <i :class="open ? 'bi bi-x-lg' : 'bi bi-list'"></i>
        </button>
      </div>
    </div>

    <transition name="drawer">
      <div v-if="open" class="mobile-drawer">
        <nav class="mobile-nav" aria-label="Mobile">
          <router-link v-for="link in links" :key="link.to" :to="link.to" class="mobile-link" @click="open = false">
            {{ link.label }}
          </router-link>
          <router-link to="/vendor-login" class="mobile-link" @click="open = false">Vendor Login</router-link>
        </nav>
        <div class="drawer-actions">
          <a :href="downloadUrl" class="btn btn-dark btn-download w-100">
            <i class="bi bi-arrow-down-circle me-1"></i>Download the App
          </a>
        </div>
      </div>
    </transition>
  </header>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { s } from '../../composables/useSiteContent'

const open = ref(false)
const scrolled = ref(false)

const links = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
  { label: 'Become a Vendor', to: '/vendor-register' },
  { label: 'Download App', to: '/download' },
]

const downloadUrl = ref(s('app.download_page_url', '/download'))

function onScroll() {
  scrolled.value = window.scrollY > 12
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
</script>

<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: 1040;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.2s ease, background 0.2s ease;
}
.site-header.scrolled {
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 6px 30px rgba(0, 0, 0, 0.06);
}
.site-header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  height: 72px;
}
.site-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  text-decoration: none;
  color: #000;
  flex-shrink: 0;
}
.brand-mark {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: #000;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
}
.brand-name { font-weight: 800; font-size: 1.25rem; letter-spacing: -0.02em; }
.brand-accent { color: var(--brand); }

.site-nav {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin: 0 auto;
}
.nav-link {
  color: #333;
  text-decoration: none;
  font-weight: 500;
  font-size: 0.92rem;
  padding: 0.5rem 0.8rem;
  border-radius: 8px;
  transition: background 0.15s ease, color 0.15s ease;
  white-space: nowrap;
}
.nav-link:hover { background: rgba(0, 0, 0, 0.05); color: #000; }
.nav-link.router-link-exact-active { color: var(--brand-700); font-weight: 600; }

.site-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}
.btn-download {
  border-radius: 999px;
  background: #000;
  border-color: #000;
  font-weight: 700;
  padding: 0.55rem 1.15rem;
  font-size: 0.9rem;
}
.btn-download:hover { background: var(--brand-700); border-color: var(--brand-700); color: #fff; }
.menu-toggle {
  display: none;
  width: 42px;
  height: 42px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  background: #fff;
  font-size: 1.3rem;
  align-items: center;
  justify-content: center;
  color: #000;
}

.mobile-drawer {
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  background: #fff;
  padding: 1rem 1.25rem 1.4rem;
}
.mobile-nav { display: flex; flex-direction: column; gap: 0.15rem; }
.mobile-link {
  color: #111;
  text-decoration: none;
  font-weight: 500;
  padding: 0.8rem 0.5rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.mobile-link:hover { background: rgba(0, 0, 0, 0.05); }
.drawer-actions { margin-top: 1rem; }

.drawer-enter-active, .drawer-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.drawer-enter-from, .drawer-leave-to { opacity: 0; transform: translateY(-8px); }

@media (max-width: 991.98px) {
  .site-nav, .site-actions .nav-link { display: none; }
  .menu-toggle { display: inline-flex; }
  .site-actions .btn-download { display: none; }
}
</style>