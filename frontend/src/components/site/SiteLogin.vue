<template>
  <section class="sa-card-wrap">
    <div class="container">
      <div class="sa-card">
        <div class="sa-brand">
          <router-link to="/" class="sa-logo">
            <span class="sa-logo-mark"><i class="bi bi-bus-front-fill"></i></span>
            <span class="sa-logo-text">Bus<span class="brand-accent">Line</span></span>
          </router-link>
        </div>

        <h1 class="sa-title">{{ title }}</h1>
        <p class="sa-subtitle">{{ subtitle }}</p>

        <form v-if="!twoFactorStep" novalidate @submit.prevent="submit">
          <div v-if="error" class="sa-alert" role="alert">
            <i class="bi bi-exclamation-triangle-fill"></i><span>{{ error }}</span>
          </div>

          <div class="field mb-3">
            <label for="sa-email">Email address</label>
            <input
              id="sa-email"
              v-model.trim="form.email"
              type="email"
              placeholder="you@example.com"
              autocomplete="email"
              inputmode="email"
              required
            />
          </div>

          <div class="field mb-3">
            <label for="sa-password">Password</label>
            <div class="password-wrap">
              <input
                id="sa-password"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Enter your password"
                autocomplete="current-password"
                required
              />
              <button type="button" class="pw-toggle" :aria-label="showPassword ? 'Hide password' : 'Show password'" @click="showPassword = !showPassword">
                <i :class="showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
              </button>
            </div>
            <router-link to="/forgot-password" class="forgot-link">Forgot password?</router-link>
          </div>

          <button class="btn btn-dark btn-lg w-100 sa-submit" type="submit" :disabled="submitting">
            <span v-if="submitting" class="spinner-border spinner-border-sm me-2"></span>
            {{ submitting ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>

        <form v-else novalidate @submit.prevent="submitTwoFactor">
          <div v-if="error" class="sa-alert" role="alert">
            <i class="bi bi-exclamation-triangle-fill"></i><span>{{ error }}</span>
          </div>
          <div class="field mb-3">
            <label for="sa-code">Authenticator code</label>
            <input id="sa-code" v-model.trim="form.code" class="code-input" placeholder="••••••" inputmode="numeric" maxlength="6" autocomplete="one-time-code" required />
          </div>
          <button class="btn btn-dark btn-lg w-100 sa-submit" type="submit" :disabled="submitting">
            <span v-if="submitting" class="spinner-border spinner-border-sm me-2"></span>
            {{ submitting ? 'Verifying…' : 'Verify & sign in' }}
          </button>
          <button type="button" class="btn btn-link w-100 mt-2 text-decoration-none back-link" @click="backToLogin">
            <i class="bi bi-arrow-left me-1"></i>Back to sign in
          </button>
        </form>

        <div v-if="variant === 'vendor'" class="sa-footer">
          <span>Don't have a business account?</span>
          <router-link to="/vendor-register" class="sa-link">Become a Vendor</router-link>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { extractError } from '../../services/api'
import { useAuthStore } from '../../stores/auth'

const props = defineProps({
  variant: { type: String, default: 'vendor' }, // 'vendor' | 'admin'
})

const router = useRouter()
const auth = useAuthStore()

const isAdmin = props.variant === 'admin'
const title = isAdmin ? 'Admin sign in' : 'Vendor sign in'
const subtitle = isAdmin
  ? 'Sign in to manage the BusLine platform.'
  : 'Sign in to manage your services, bookings and revenue.'

const form = reactive({ email: '', password: '', code: '' })
const error = ref('')
const submitting = ref(false)
const showPassword = ref(false)
const twoFactorStep = ref(false)
const tfaToken = ref('')

async function submit() {
  error.value = ''
  if (!form.email || !form.password) {
    error.value = 'Please enter your email and password.'
    return
  }
  submitting.value = true
  try {
    const result = await auth.login(form.email, form.password)
    if (result?.requires_verification) {
      router.push({ name: 'verify-email', query: { email: result.email } })
      return
    }
    if (result?.requires_2fa) {
      tfaToken.value = result.tfa_token
      twoFactorStep.value = true
      error.value = ''
      return
    }
    // The public site is for vendors and admins. Customers use the mobile app
    // for booking, so reject customer accounts here and drop their session.
    if (result?.user?.role_slug === 'customer') {
      auth.logout()
      error.value = 'Customer accounts can only sign in through the BusLine app.'
      return
    }
    redirect()
  } catch (e) {
    error.value = extractError(e).message
  } finally {
    submitting.value = false
  }
}

async function submitTwoFactor() {
  error.value = ''
  submitting.value = true
  try {
    const result = await auth.verifyTwoFactor(tfaToken.value, form.code.trim())
    if (result?.user?.role_slug === 'customer') {
      auth.logout()
      error.value = 'Customer accounts can only sign in through the BusLine app.'
      twoFactorStep.value = false
      return
    }
    redirect()
  } catch (e) {
    error.value = extractError(e).message
  } finally {
    submitting.value = false
  }
}

function backToLogin() {
  twoFactorStep.value = false
  tfaToken.value = ''
  form.code = ''
  error.value = ''
}

function redirect() {
  const target = isAdmin ? '/admin/dashboard' : (auth.role === 'super_admin' ? '/admin/dashboard' : '/vendor/dashboard')
  router.push(target)
}
</script>

<style scoped>
.sa-card-wrap { padding: 4rem 1.25rem 5rem; background: #fff; }
.sa-card {
  max-width: 26rem;
  margin: 0 auto;
  border: 1px solid #ececec;
  border-radius: 20px;
  padding: 2.5rem 2rem;
  background: #fff;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.06);
}
.sa-brand { margin-bottom: 1.5rem; }
.sa-logo { display: inline-flex; align-items: center; gap: 0.6rem; text-decoration: none; }
.sa-logo-mark { width: 42px; height: 42px; border-radius: 12px; background: var(--brand); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 1.15rem; }
.sa-logo-text { font-weight: 800; font-size: 1.3rem; color: #000; }
.brand-accent { color: var(--brand); }
.sa-title { font-size: 1.7rem; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 0.3rem; }
.sa-subtitle { color: rgba(0, 0, 0, 0.6); margin-bottom: 1.6rem; }
.sa-alert { display: flex; align-items: flex-start; gap: 0.5rem; background: var(--danger-50); border: 1px solid color-mix(in srgb, var(--danger) 32%, transparent); color: var(--danger-700); border-radius: 12px; padding: 0.7rem 0.9rem; font-size: 0.88rem; font-weight: 500; margin-bottom: 1.1rem; }
.field > label { font-size: 0.86rem; font-weight: 600; color: var(--text); margin-bottom: 0.4rem; display: block; }
.forgot-link { display: inline-block; font-size: 0.84rem; font-weight: 600; color: var(--brand-700); text-decoration: none; margin-top: 0.55rem; }
.forgot-link:hover { color: var(--brand); text-decoration: underline; }
.field input { width: 100%; min-height: 50px; border: 1.5px solid var(--border); border-radius: 12px; background: var(--surface); padding: 0.65rem 0.95rem; font-size: 0.97rem; }
.field input:focus { outline: none; border-color: var(--brand); box-shadow: 0 0 0 3.5px var(--brand-50); }
.password-wrap { position: relative; }
.password-wrap input { padding-right: 3rem; }
.pw-toggle { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); width: 40px; height: 38px; border: 0; border-radius: 9px; background: transparent; color: var(--muted); display: inline-flex; align-items: center; justify-content: center; }
.pw-toggle:hover { background: var(--surface-2); color: var(--brand-700); }
.sa-submit { border-radius: 13px; font-weight: 700; }
.code-input { width: 100%; min-height: 56px; border: 1.5px solid var(--border); border-radius: 12px; text-align: center; font-size: 1.35rem; font-weight: 700; letter-spacing: 0.5em; }
.code-input:focus { outline: none; border-color: var(--brand); box-shadow: 0 0 0 3.5px var(--brand-50); }
.back-link { color: var(--muted); font-size: 0.9rem; }
.back-link:hover { color: var(--brand); }
.sa-footer { display: flex; justify-content: center; gap: 0.4rem; margin-top: 1.4rem; font-size: 0.9rem; color: rgba(0, 0, 0, 0.6); }
.sa-link { color: var(--brand-700); font-weight: 600; text-decoration: none; }
.sa-link:hover { color: var(--brand); }
</style>