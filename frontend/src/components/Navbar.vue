<template>
  <header class="glass-nav site-nav" :class="{ scrolled }">
    <nav class="container nav-inner" aria-label="Main navigation">
      <router-link class="navbar-brand d-flex align-items-center gap-2 fw-bold font-display" to="/" @click="closeMenu">
        <span class="logo-mark" aria-hidden="true"><i class="bi bi-bus-front-fill"></i></span>
        <span>Bus<span class="brand-accent">Line</span></span>
      </router-link>

      <ul class="nav-links d-none d-lg-flex mb-0">
        <li v-for="link in links" :key="link.to">
          <router-link class="nav-link" :to="link.to" @click="closeMenu">{{ link.label }}</router-link>
        </li>
      </ul>

      <div class="nav-actions d-none d-lg-flex" v-if="auth.isAuthenticated">
        <router-link class="btn btn-sm btn-white" :to="dashboardLink">
          <Avatar :name="auth.user?.name || 'U'" :size="26" :gradient="hash(auth.user?.email)" />
          <span class="ms-1">{{ auth.user?.name?.split(' ')[0] || 'Account' }}</span>
        </router-link>
        <button class="btn btn-sm btn-outline-white icon-btn" @click="handleLogout" aria-label="Log out">
          <i class="bi bi-box-arrow-right"></i>
        </button>
      </div>
      <div class="nav-actions d-none d-lg-flex" v-else>
        <router-link class="btn btn-sm btn-outline-white" to="/login">Log in</router-link>
        <router-link class="btn btn-sm btn-white" to="/register">Sign up</router-link>
      </div>

      <button
        ref="burgerBtn"
        class="burger d-lg-none"
        type="button"
        :aria-expanded="menuOpen ? 'true' : 'false'"
        aria-controls="mobile-menu"
        :aria-label="menuOpen ? 'Close menu' : 'Open menu'"
        @click="toggleMenu"
      >
        <span class="burger-line" :class="{ open: menuOpen }"></span>
        <span class="burger-line" :class="{ open: menuOpen }"></span>
        <span class="burger-line" :class="{ open: menuOpen }"></span>
      </button>
    </nav>

    <Teleport to="body">
      <Transition name="drawer-fade">
        <div v-if="menuOpen" class="drawer-backdrop d-lg-none" @click="closeMenu" aria-hidden="true"></div>
      </Transition>
      <Transition name="drawer-slide">
        <aside
          v-if="menuOpen"
          id="mobile-menu"
          ref="drawerEl"
          class="mobile-drawer d-lg-none"
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          tabindex="-1"
          @keydown.esc.prevent="closeMenu(true)"
        >
          <div class="d-flex align-items-center justify-content-between mb-4">
            <span class="fw-bold font-display fs-5">
              <span class="logo-mark me-2" aria-hidden="true"><i class="bi bi-bus-front-fill"></i></span>
              Bus<span class="brand-accent">Line</span>
            </span>
            <button ref="drawerCloseBtn" class="btn-close btn-close-white" type="button" aria-label="Close menu" @click="closeMenu(true)"></button>
          </div>

          <ul class="drawer-links list-unstyled mb-4">
            <li v-for="link in links" :key="link.to">
              <router-link :to="link.to" @click="closeMenu">
                {{ link.label }}
                <i class="bi bi-chevron-right ms-auto" aria-hidden="true"></i>
              </router-link>
            </li>
          </ul>

          <div class="drawer-actions" v-if="!auth.isAuthenticated">
            <router-link class="btn btn-outline-white w-100 mb-2" to="/login" @click="closeMenu">Log in</router-link>
            <router-link class="btn btn-white w-100" to="/register" @click="closeMenu">Get started free</router-link>
          </div>
          <div class="drawer-actions" v-else>
            <router-link class="btn btn-white w-100 mb-2" :to="dashboardLink" @click="closeMenu">
              Go to dashboard
            </router-link>
            <button class="btn btn-outline-white w-100" type="button" @click="handleLogout">
              <i class="bi bi-box-arrow-right me-1"></i>Log out
            </button>
          </div>

          <div class="drawer-foot small text-muted mt-auto pt-4">
            <i class="bi bi-shield-check text-accent me-1"></i>Secure payments · QR tickets · 24/7 support
          </div>
        </aside>
      </Transition>
    </Teleport>
  </header>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import Avatar from './Avatar.vue'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const links = [
  { label: 'Home', to: '/' },
  { label: 'Routes', to: '/routes' },
  { label: 'Operators', to: '/operators' },
  { label: 'FAQs', to: '/faqs' },
]

const scrolled = ref(false)
const menuOpen = ref(false)
const burgerBtn = ref(null)
const drawerEl = ref(null)
const drawerCloseBtn = ref(null)

function onScroll() {
  scrolled.value = window.scrollY > 12
}

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}
function closeMenu() {
  if (!menuOpen.value) return
  menuOpen.value = false
  restoreFocus()
}
function restoreFocus() {
  burgerBtn.value?.focus({ preventScroll: true })
}

watch(menuOpen, async (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
  if (open) {
    await nextTick()
    drawerCloseBtn.value?.focus({ preventScroll: true })
  }
})

watch(() => route.fullPath, () => {
  if (menuOpen.value) {
    menuOpen.value = false
    document.body.style.overflow = ''
  }
})

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function hash(s = '') {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h % 7
}

const dashboardLink = computed(() => {
  if (auth.isAdmin) return '/admin/dashboard'
  if (auth.isVendor || auth.isStaff) return '/vendor/dashboard'
  return '/customer/dashboard'
})

async function handleLogout() {
  menuOpen.value = false
  document.body.style.overflow = ''
  await auth.logout()
  router.push('/')
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  document.body.style.overflow = ''
})
</script>

<style scoped>
.site-nav {
  z-index: 1045;
  background: #000;
  border-bottom: 1px solid rgba(255, 255, 255, 0.14);
  position: sticky;
  top: 0;
}
.scrolled { box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35); }
.nav-inner {
  display: flex;
  align-items: center;
  gap: 1rem;
  min-height: 70px;
}
.navbar-brand { font-size: 1.25rem; color: #fff; }
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

.nav-links {
  display: flex;
  gap: 0.1rem;
  margin-inline: auto;
  list-style: none;
}
.nav-links .nav-link {
  position: relative;
  color: rgba(255, 255, 255, 0.82);
  font-weight: 500;
  font-size: 0.93rem;
  padding: 0.5rem 0.9rem;
  border-radius: 6px;
  transition: color 0.18s ease, background 0.18s ease;
}
.nav-links .nav-link:hover { color: #fff; background: rgba(255, 255, 255, 0.08); }
.nav-links .nav-link.router-link-active,
.nav-links .nav-link.router-link-exact-active { color: #fff; text-decoration: underline; text-underline-offset: 6px; text-decoration-color: var(--brand); text-decoration-thickness: 2px; }
.nav-links .nav-link:focus-visible,
.burger:focus-visible,
.icon-btn:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }

.nav-actions { gap: 0.5rem; align-items: center; }

/* White (primary on black) + outline-white buttons */
.btn-white {
  background: #fff;
  color: #000;
  border: 1px solid #fff;
  font-weight: 600;
}
.btn-white:hover { background: var(--brand); border-color: var(--brand); color: #fff; }
.btn-outline-white {
  background: transparent;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.55);
  font-weight: 600;
}
.btn-outline-white:hover { background: #fff; color: #000; }
.icon-btn { border-radius: 6px; }

/* Burger */
.burger {
  margin-left: auto;
  width: 44px;
  height: 44px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 8px;
  background: transparent;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0;
  transition: background 0.2s ease, border-color 0.2s ease;
}
.burger:hover { background: rgba(255, 255, 255, 0.08); border-color: #fff; }
.burger-line {
  width: 18px;
  height: 2px;
  border-radius: 2px;
  background: #fff;
  transition: transform 0.25s ease, opacity 0.2s ease;
}
.burger-line.open:nth-child(1) { transform: translateY(7px) rotate(45deg); }
.burger-line.open:nth-child(2) { opacity: 0; }
.burger-line.open:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

/* Drawer */
.drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1050;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(3px);
}
.mobile-drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 1055;
  width: min(86vw, 340px);
  background: #000;
  box-shadow: -24px 0 64px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  padding: 1.25rem 1.35rem 1.5rem;
  overflow-y: auto;
  color: #fff;
}
.mobile-drawer .btn-close-white { opacity: 0.9; }
.drawer-links li + li { border-top: 1px solid rgba(255, 255, 255, 0.12); }
.drawer-links a {
  display: flex;
  align-items: center;
  padding: 0.95rem 0.35rem;
  color: #fff;
  font-weight: 600;
  text-decoration: none;
  transition: color 0.15s ease, padding-left 0.15s ease;
}
.drawer-links a i { color: rgba(255, 255, 255, 0.5); font-size: 0.85rem; }
.drawer-links a:hover { color: var(--brand); padding-left: 0.65rem; }
.drawer-links a:focus-visible { outline: 2px solid var(--brand); outline-offset: -2px; border-radius: 8px; }
.drawer-foot { border-top: 1px solid rgba(255, 255, 255, 0.12); color: rgba(255, 255, 255, 0.6) !important; }

/* Transitions */
.drawer-fade-enter-active, .drawer-fade-leave-active { transition: opacity 0.25s ease; }
.drawer-fade-enter-from, .drawer-fade-leave-to { opacity: 0; }
.drawer-slide-enter-active, .drawer-slide-leave-active { transition: transform 0.28s cubic-bezier(0.32, 0.72, 0.24, 1); }
.drawer-slide-enter-from, .drawer-slide-leave-to { transform: translateX(100%); }
@media (prefers-reduced-motion: reduce) {
  .drawer-fade-enter-active, .drawer-fade-leave-active,
  .drawer-slide-enter-active, .drawer-slide-leave-active,
  .burger-line { transition: none; }
}
</style>
