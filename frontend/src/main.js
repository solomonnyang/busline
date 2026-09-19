import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { initRipple } from './utils/ripple'
import { useTheme } from './composables/useTheme'

// Bootstrap 5 + icons + custom styles
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './assets/main.css'
import 'bootstrap'

async function boot() {
  const app = createApp(App)
  app.use(createPinia())
  app.use(router)
  app.mount('#app')

  // Global enhancements
  initRipple()
  useTheme().init()

  // Load configurable site content in the background so the page never
  // depends on it to render. Fail-open: any error still leaves the site up
  // with its built-in defaults.
  try {
    const { load } = await import('./composables/useSiteContent')
    await load()
  } catch (e) {
    console.error('Failed to load site content', e)
  }
}

boot()
