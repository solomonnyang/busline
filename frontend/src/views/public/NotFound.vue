<template>
  <section class="hero-section nf-section">
    <div class="blob blob-blue"></div>
    <div class="blob blob-green"></div>
    <div class="blob blob-amber"></div>

    <div class="container position-relative text-center">
      <div class="soft-card nf-card p-4 p-lg-5 mx-auto fade-up">
        <div class="nf-icon mx-auto mb-4">
          <i class="bi bi-signpost-split"></i>
        </div>
        <div class="display-1 fw-bolder font-display text-brand mb-2">404</div>
        <p class="text-muted mb-4">The page you are looking for does not exist.</p>
        <div class="d-flex flex-wrap justify-content-center gap-2">
          <router-link to="/" class="btn btn-primary px-4">
            <i class="bi bi-house me-1"></i>Back to home
          </router-link>
          <router-link :to="dashboardLink" class="btn btn-ghost px-4">
            <i class="bi bi-speedometer2 me-1"></i>Go to dashboard
          </router-link>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()

const dashboardLink = computed(() =>
  auth.isAdmin
    ? '/admin/dashboard'
    : auth.isVendor || auth.isStaff
      ? '/vendor/dashboard'
      : '/customer/dashboard'
)
</script>

<style scoped>
.nf-section { padding: 5rem 0 7rem; }
.nf-card {
  max-width: 560px;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
  position: relative;
  z-index: 1;
}
.nf-icon {
  width: 88px;
  height: 88px;
  border-radius: 24px;
  background: linear-gradient(135deg, var(--brand-50), var(--secondary-50));
  border: 1px solid var(--border);
  color: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.2rem;
  box-shadow: var(--shadow-sm);
}
</style>
