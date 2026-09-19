<template>
  <section class="auth-section">
    <div class="blob blob-blue"></div>
    <div class="blob blob-green"></div>
    <div class="blob blob-amber"></div>

    <div class="container position-relative">
      <div class="row g-4 g-lg-5 align-items-center justify-content-center auth-row">

        <!-- Brand panel -->
        <div class="col-lg-6 d-none d-lg-block fade-up">
          <div class="auth-brand-panel p-4 p-xl-5">
            <div class="auth-brand-icon mb-4"><i class="bi bi-envelope-check"></i></div>
            <span class="auth-panel-eyebrow"><i class="bi bi-patch-check"></i>Account activation</span>
            <h2 class="display-5 fw-bold font-display mb-3 auth-brand-title">
              Confirm your email, <span class="auth-brand-grad">start travelling</span>
            </h2>
            <p class="auth-brand-sub mb-0">
              Enter the 6-digit code we emailed you (or open the link from your inbox) to activate your BusLine account.
            </p>
          </div>
        </div>

        <!-- Form panel -->
        <div class="col-md-9 col-lg-5 fade-up delay-1">
          <div class="soft-card auth-card p-4 p-lg-5">
            <div class="text-center mb-4">
              <div class="auth-mobile-logo mx-auto mb-3 d-lg-none"><i class="bi bi-envelope-check"></i></div>
              <span class="section-eyebrow"><i class="bi bi-bus-front"></i>BusLine account</span>
              <h1 class="section-title fs-2 mb-1">Verify your email</h1>
              <p class="text-muted small mb-0">Enter the 6-digit code sent to your inbox.</p>
            </div>

            <form v-if="!verified" @submit.prevent="submit">
              <div v-if="error" class="alert alert-danger py-2 small fade-in">{{ error }}</div>
              <div v-if="info" class="alert alert-success py-2 small fade-in">{{ info }}</div>

              <div class="mb-3">
                <label class="form-label">Email address</label>
                <div class="input-group">
                  <span class="input-group-text"><i class="bi bi-envelope"></i></span>
                  <input v-model="form.email" type="email" class="form-control" placeholder="you@example.com" required />
                </div>
              </div>

              <div class="mb-4">
                <label class="form-label">Verification code</label>
                <div class="input-group">
                  <span class="input-group-text"><i class="bi bi-key"></i></span>
                  <input
                    v-model="form.code"
                    class="form-control form-control-lg text-center tracking-wide"
                    placeholder="••••••"
                    inputmode="numeric"
                    maxlength="6"
                    autocomplete="one-time-code"
                    required
                  />
                </div>
              </div>

              <button class="btn btn-primary btn-lg w-100" :disabled="submitting">
                <span v-if="submitting" class="spinner-border spinner-border-sm"></span>
                <span v-else><i class="bi bi-shield-check me-2"></i>Verify account</span>
              </button>

              <button
                type="button"
                class="btn btn-link w-100 mt-2 text-decoration-none"
                :disabled="submitting || resending"
                @click="resend"
              >
                <span v-if="resending" class="spinner-border spinner-border-sm spinner-border-sm"></span>
                <span v-else><i class="bi bi-arrow-repeat me-1"></i>Resend code</span>
              </button>
            </form>

            <div v-else class="text-center fade-in">
              <div class="auth-2fa-icon mx-auto mb-3"><i class="bi bi-patch-check"></i></div>
              <h6 class="fw-bold mb-1">Email verified</h6>
              <p class="text-muted small mb-0">
                Your account is active. You can now sign in and start booking.
              </p>
              <router-link to="/login" class="btn btn-primary btn-lg w-100 mt-4">Go to sign in</router-link>
            </div>

            <div class="text-center mt-4 small">
              <span class="text-muted">No code yet?</span>
              <button type="button" class="btn btn-link p-0 align-baseline ms-1 fw-semibold text-decoration-none" @click="resend">Resend it</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { extractError } from '../../services/api'
import { useAuthStore } from '../../stores/auth'

const route = useRoute()
const auth = useAuthStore()

const form = reactive({
  email: String(route.query.email || ''),
  code: String(route.query.code || ''),
})
const error = ref('')
const info = ref('')
const submitting = ref(false)
const resending = ref(false)
const verified = ref(false)

async function submit() {
  error.value = ''
  info.value = ''
  if (!form.email.trim() || form.code.trim().length !== 6) {
    error.value = 'Enter your email and the 6-digit verification code.'
    return
  }
  submitting.value = true
  try {
    await auth.verifyEmail(form.email.trim(), form.code.trim())
    verified.value = true
  } catch (e) {
    error.value = extractError(e).message
  } finally {
    submitting.value = false
  }
}

async function resend() {
  error.value = ''
  info.value = ''
  if (!form.email.trim()) {
    error.value = 'Enter your email address first.'
    return
  }
  resending.value = true
  try {
    await auth.resendVerification(form.email.trim())
    info.value = 'A new code has been sent to your inbox.'
  } catch (e) {
    error.value = extractError(e).message
  } finally {
    resending.value = false
  }
}

onMounted(() => {
  if (route.query.code) {
    submit()
  }
})
</script>

<style scoped>
.auth-section {
  position: relative;
  overflow: hidden;
  padding: 5.5rem 0 6.5rem;
  min-height: calc(100vh - 160px);
  display: flex;
  align-items: center;
  background:
    radial-gradient(1000px 620px at 88% -12%, rgba(0, 0, 0, 0.4), transparent 62%),
    radial-gradient(820px 540px at -8% 8%, rgba(255, 255, 255, 0.05), transparent 55%),
    #000;
}
.auth-section::after {
  content: '';
  position: absolute;
  inset: -20%;
  background:
    radial-gradient(620px 320px at 22% 18%, rgba(255, 255, 255, 0.07), transparent 60%),
    radial-gradient(620px 320px at 78% 62%, rgba(255, 255, 255, 0.05), transparent 60%);
  filter: blur(22px);
  animation: auth-mesh 16s ease-in-out infinite;
  pointer-events: none;
}
@keyframes auth-mesh {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  50% { transform: translate3d(2%, -3%, 0) scale(1.08); }
}
.auth-row { min-height: calc(100vh - 240px); width: 100%; }

.auth-section .blob-blue { background: rgba(0, 0, 0, 0.55); opacity: 0.55; }
.auth-section .blob-green { background: rgba(199, 121, 43, 0.5); opacity: 0.5; }
.auth-section .blob-amber { background: rgba(255, 255, 255, 0.14); opacity: 0.5; }

.auth-card {
  border-radius: var(--radius-xl);
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(24px) saturate(160%);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.65);
  box-shadow: 0 32px 64px -24px rgba(3, 40, 36, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.8);
}
.tracking-wide { letter-spacing: 0.5em; }

.auth-mobile-logo {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: linear-gradient(135deg, var(--brand), var(--brand-500));
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  box-shadow: var(--shadow-brand);
}

.auth-2fa-icon {
  width: 64px;
  height: 64px;
  border-radius: 20px;
  background: linear-gradient(135deg, var(--brand), var(--brand-700));
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.7rem;
  box-shadow: var(--shadow-brand);
}

.auth-brand-panel {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-xl);
  color: #fff;
  background:
    radial-gradient(600px 280px at 90% -15%, rgba(0, 0, 0, 0.4), transparent 60%),
    #000;
  box-shadow: var(--shadow-lg);
}
.auth-brand-panel::before {
  content: '';
  position: absolute;
  width: 280px;
  height: 280px;
  border-radius: 50%;
  background: color-mix(in srgb, #ffffff 12%, transparent);
  filter: blur(70px);
  bottom: -80px;
  left: -60px;
  pointer-events: none;
}

.auth-brand-icon {
  width: 64px;
  height: 64px;
  border-radius: 18px;
  background: color-mix(in srgb, #ffffff 16%, transparent);
  border: 1px solid color-mix(in srgb, #ffffff 28%, transparent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.7rem;
  backdrop-filter: blur(6px);
}

.auth-panel-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: color-mix(in srgb, #ffffff 16%, transparent);
  border: 1px solid color-mix(in srgb, #ffffff 24%, transparent);
  color: #fff;
  font-weight: 600;
  font-size: 0.78rem;
  padding: 0.3rem 0.8rem;
  border-radius: var(--pill);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 1rem;
}

.auth-brand-title { color: #fff; }
.auth-brand-grad {
  background: linear-gradient(120deg, #ffffff, var(--secondary-50));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}
.auth-brand-sub { color: color-mix(in srgb, #ffffff 85%, transparent); font-size: 1.05rem; }
</style>
