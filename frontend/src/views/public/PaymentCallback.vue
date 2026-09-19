<template>
  <section class="hero-section pc-section">
    <div class="blob blob-blue"></div>
    <div class="blob blob-green"></div>
    <div class="blob blob-amber"></div>

    <div class="container position-relative text-center">
      <div class="soft-card pc-card p-4 p-lg-5 mx-auto">
        <LoadingSpinner :show="verifying" text="Verifying payment..." />

        <div v-if="!verifying" class="fade-up">
          <div class="pc-icon mx-auto mb-3" :class="success ? 'pc-icon-success' : 'pc-icon-danger'">
            <i class="bi fs-2" :class="success ? 'bi-check-circle' : 'bi-x-circle'"></i>
          </div>
          <div class="mb-2">
            <StatusBadge :status="success ? 'success' : 'failed'" />
          </div>
          <h5 class="fw-bold mb-2">{{ success ? 'Payment confirmed' : 'Payment verification failed' }}</h5>
          <p class="text-muted mb-4">{{ message }}</p>
          <router-link :to="linkTo" class="btn btn-primary px-4">
            <i class="bi bi-ticket-perforated me-1"></i>View my ticket
          </router-link>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import api, { extractError } from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import LoadingSpinner from '../../components/LoadingSpinner.vue'
import StatusBadge from '../../components/StatusBadge.vue'

const route = useRoute()
const auth = useAuthStore()
const verifying = ref(true)
const success = ref(false)
const message = ref('')
const bookingId = ref(null)
const linkTo = ref('/customer/bookings')

onMounted(async () => {
  const reference = route.query.reference || route.query.trxref
  if (!reference) {
    verifying.value = false
    success.value = false
    message.value = 'No payment reference found.'
    return
  }
  try {
    const { data } = await api.post('/payments/verify', { reference })
    success.value = true
    bookingId.value = data.data.booking?.id || null
    message.value = data.message || 'Your booking has been confirmed.'
    if (bookingId.value) {
      linkTo.value = `/customer/bookings/${bookingId.value}`
    }
  } catch (e) {
    success.value = false
    message.value = extractError(e).message
  } finally {
    verifying.value = false
  }
})
</script>

<style scoped>
.pc-section { padding: 5rem 0 7rem; }
.pc-card {
  max-width: 520px;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
  position: relative;
  z-index: 1;
}
.pc-icon {
  width: 76px;
  height: 76px;
  border-radius: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
}
.pc-icon-success {
  background: color-mix(in srgb, var(--secondary) 12%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--secondary) 30%, transparent);
  color: var(--secondary-700);
}
.pc-icon-danger {
  background: color-mix(in srgb, var(--danger) 12%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--danger) 30%, transparent);
  color: var(--danger-700);
}
</style>
