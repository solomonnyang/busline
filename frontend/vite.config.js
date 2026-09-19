import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Dev server proxies /api to the CodeIgniter 4 backend.
export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('/vue/') || id.includes('@vue') || id.includes('vue-router') || id.includes('pinia')) return 'vue-vendor'
            if (id.includes('/axios/')) return 'app-vendor'
            if (id.includes('/bootstrap/')) return 'bootstrap'
            if (id.includes('/leaflet/')) return 'leaflet'
            return 'vendor'
          }
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
