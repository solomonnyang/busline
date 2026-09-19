<template>
  <section class="auth-page">
    <div class="container-fluid px-0">
      <div class="auth-split">

        <!-- Visual panel -->
        <aside class="auth-visual d-none d-lg-flex" aria-hidden="true">
          <div class="av-ring av-ring-1"></div>
          <div class="av-ring av-ring-2"></div>
          <div class="av-bus"><i class="bi bi-bus-front"></i></div>

          <div class="av-content">
            <router-link to="/" class="av-logo mb-5" tabindex="-1" @click.prevent>
              <span class="logo-mark"><i class="bi bi-bus-front-fill"></i></span>
              Bus<span class="brand-accent">Line</span>
            </router-link>

            <h2 class="av-title">Your seat is<br />waiting for you.</h2>
            <p class="av-sub">
              Sign in to manage bookings, pick your favourite seat, and board with a digital QR ticket.
            </p>

            <ul class="av-points list-unstyled">
              <li><i class="bi bi-shield-check"></i>Bank-grade secure payments</li>
              <li><i class="bi bi-grid-3x3-gap"></i>Live seat maps on every trip</li>
              <li><i class="bi bi-qr-code"></i>Instant QR tickets — no printing</li>
            </ul>

            <div class="av-stats">
              <div class="av-stat">
                <strong>12k+</strong>
                <span>Travelers</span>
              </div>
              <div class="av-stat">
                <strong>40+</strong>
                <span>Operators</span>
              </div>
              <div class="av-stat">
                <strong>4.9<i class="bi bi-star-fill"></i></strong>
                <span>Average rating</span>
              </div>
            </div>

            <figure class="av-quote mt-auto mb-0">
              <blockquote>“BusLine makes my weekly Lagos–Abuja trips effortless.”</blockquote>
              <figcaption>
                <Avatar name="Chinedu Eze" :size="34" :gradient="9" />
                <span><strong>Chinedu E.</strong> · Business traveler</span>
              </figcaption>
            </figure>
          </div>
        </aside>

        <!-- Form panel -->
        <main class="auth-form-panel">
          <div class="auth-form-inner">

            <div class="text-center text-lg-start mb-4">
              <router-link to="/" class="auth-mobile-logo mx-auto ms-lg-0 me-lg-auto mb-3 d-lg-none" aria-label="BusLine home">
                <span class="logo-mark"><i class="bi bi-bus-front-fill"></i></span>
              </router-link>
              <h1 class="auth-title">Welcome back</h1>
              <p class="auth-subtitle">Sign in to continue to BusLine.</p>
            </div>

            <!-- Step 1: credentials -->
            <form v-if="!twoFactorStep" novalidate @submit.prevent="submit">
              <div
                v-if="error"
                ref="alertEl"
                class="form-alert"
                role="alert"
                tabindex="-1"
              >
                <i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i>
                <span>{{ error }}</span>
              </div>

              <div class="field mb-3">
                <label for="login-email">Email address</label>
                <input
                  id="login-email"
                  ref="emailEl"
                  v-model.trim="form.email"
                  type="email"
                  placeholder="you@example.com"
                  autocomplete="email"
                  inputmode="email"
                  :class="{ 'is-invalid': touched && fieldErrors.email }"
                  :aria-invalid="touched && fieldErrors.email ? 'true' : undefined"
                  aria-describedby="login-email-error"
                  @blur="touch.email = true"
                  required
                />
                <p v-if="touched && fieldErrors.email" id="login-email-error" class="field-error">
                  <i class="bi bi-x-circle-fill" aria-hidden="true"></i>{{ fieldErrors.email }}
                </p>
              </div>

              <div class="field mb-2">
                <label for="login-password">Password</label>
                <div class="password-wrap">
                  <input
                    id="login-password"
                    v-model="form.password"
                    :type="showPassword ? 'text' : 'password'"
                    placeholder="Enter your password"
                    autocomplete="current-password"
                    :class="{ 'is-invalid': touched && fieldErrors.password }"
                    :aria-invalid="touched && fieldErrors.password ? 'true' : undefined"
                    aria-describedby="login-password-error"
                    @blur="touch.password = true"
                    required
                  />
                  <button
                    type="button"
                    class="pw-toggle"
                    :aria-label="showPassword ? 'Hide password' : 'Show password'"
                    :aria-pressed="showPassword ? 'true' : 'false'"
                    @click="showPassword = !showPassword"
                  >
                    <i :class="showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'" aria-hidden="true"></i>
                  </button>
                </div>
                <p v-if="touched && fieldErrors.password" id="login-password-error" class="field-error">
                  <i class="bi bi-x-circle-fill" aria-hidden="true"></i>{{ fieldErrors.password }}
                </p>
              </div>

              <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
                <label class="remember-me" for="remember-check">
                  <input id="remember-check" v-model="rememberMe" type="checkbox" />
                  <span class="rm-box" aria-hidden="true"><i class="bi bi-check-lg"></i></span>
                  Remember this device
                </label>
                <router-link to="/forgot-password" class="forgot-link">Forgot password?</router-link>
              </div>

              <button class="btn btn-primary btn-lg w-100 auth-submit" type="submit" :disabled="submitting">
                <span v-if="submitting" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                {{ submitting ? 'Signing in…' : 'Sign in' }}
              </button>

              <p class="auth-switch text-center mt-4 mb-0 small">
                New here?
                <router-link to="/register">Create an account</router-link>
              </p>
            </form>

            <!-- Step 2: two-factor -->
            <form v-else novalidate @submit.prevent="submitTwoFactor" class="fade-in">
              <div class="twofa-head text-center mb-4">
                <div class="twofa-icon mx-auto"><i class="bi bi-shield-lock" aria-hidden="true"></i></div>
                <h6 class="fw-bold mb-1">Two-step verification</h6>
                <p class="text-muted small mb-0">Enter the 6-digit code from your Google Authenticator app.</p>
              </div>

              <div v-if="error" ref="alertEl" class="form-alert" role="alert" tabindex="-1">
                <i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i>
                <span>{{ error }}</span>
              </div>

              <div class="field mb-4">
                <label for="tfa-code">Authenticator code</label>
                <input
                  id="tfa-code"
                  ref="codeInput"
                  v-model="form.code"
                  class="code-input"
                  placeholder="••••••"
                  inputmode="numeric"
                  maxlength="6"
                  autocomplete="one-time-code"
                  required
                />
              </div>

              <button class="btn btn-primary btn-lg w-100 auth-submit" type="submit" :disabled="submitting">
                <span v-if="submitting" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                {{ submitting ? 'Verifying…' : 'Verify & sign in' }}
              </button>

              <button type="button" class="btn btn-link w-100 mt-2 text-decoration-none back-link" :disabled="submitting" @click="backToLogin">
                <i class="bi bi-arrow-left me-1" aria-hidden="true"></i>Back to sign in
              </button>
            </form>

          </div>
        </main>

      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { extractError } from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import Avatar from '../../components/Avatar.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const REMEMBER_KEY = 'busline.remember_email'

const form = reactive({ email: '', password: '', code: '' })
const touch = reactive({ email: false, password: false })
const rememberMe = ref(false)
const error = ref('')
const submitting = ref(false)
const showPassword = ref(false)
const twoFactorStep = ref(false)
const tfaToken = ref('')

const emailEl = ref(null)
const alertEl = ref(null)
const codeInput = ref(null)

const fieldErrors = computed(() => {
  const e = {}
  if (!form.email) e.email = 'Email address is required.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address.'
  if (!form.password) e.password = 'Password is required.'
  return e
})

watch(twoFactorStep, async (isTwoFa) => {
  if (!isTwoFa) return
  await nextTick()
  codeInput.value?.focus({ preventScroll: true })
})

watch(error, async (val) => {
  if (val) {
    await nextTick()
    alertEl.value?.focus({ preventScroll: true })
  }
})

onMounted(() => {
  const savedEmail = localStorage.getItem(REMEMBER_KEY)
  if (savedEmail) {
    form.email = savedEmail
    rememberMe.value = true
    touch.email = true
    touch.password = true
    emailEl.value?.focus({ preventScroll: true })
  }
})

function persistRemember() {
  if (rememberMe.value) localStorage.setItem(REMEMBER_KEY, form.email)
  else localStorage.removeItem(REMEMBER_KEY)
}

function redirectToHome() {
  const target =
    route.query.redirect ||
    (auth.isAdmin
      ? '/admin/dashboard'
      : auth.isVendor || auth.isStaff
        ? '/vendor/dashboard'
        : '/customer/dashboard')
  router.push(target)
}

async function submit() {
  touch.email = true
  touch.password = true
  error.value = ''
  if (fieldErrors.value.email) {
    emailEl.value?.focus()
    return
  }
  if (fieldErrors.value.password) return

  submitting.value = true
  try {
    const result = await auth.login(form.email, form.password)
    persistRemember()
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
    redirectToHome()
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
    await auth.verifyTwoFactor(tfaToken.value, form.code.trim())
    redirectToHome()
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
</script>

<style scoped>
.auth-page {
  min-height: calc(100vh - 68px);
  background: var(--bg);
}
.auth-split {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-height: calc(100vh - 68px);
}
@media (min-width: 992px) {
  .auth-split { grid-template-columns: minmax(0, 46%) minmax(0, 54%); }
}

/* ---------- Visual panel ---------- */
.auth-visual {
  position: relative;
  overflow: hidden;
  padding: 3rem;
  color: #fff;
  background:
    radial-gradient(760px 480px at 88% -12%, rgba(14, 147, 132, 0.35), transparent 60%),
    radial-gradient(600px 420px at -10% 108%, rgba(255, 255, 255, 0.06), transparent 58%),
    #000;
}
.av-ring {
  position: absolute;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.12);
  pointer-events: none;
}
.av-ring-1 { width: 380px; height: 380px; top: -150px; right: -120px; }
.av-ring-2 { width: 260px; height: 260px; bottom: -110px; left: -70px; border-color: rgba(255, 255, 255, 0.08); }
.av-bus {
  position: absolute;
  right: -30px;
  bottom: 6%;
  font-size: 13rem;
  line-height: 1;
  color: rgba(255, 255, 255, 0.06);
  pointer-events: none;
}
.av-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  max-width: 30rem;
}
.av-logo {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  font-weight: 800;
  font-size: 1.35rem;
  color: #fff;
  pointer-events: none;
}
.brand-accent { color: var(--brand); }
.logo-mark {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: var(--brand);
  border: 1px solid rgba(255, 255, 255, 0.28);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.av-title {
  font-weight: 800;
  font-size: clamp(1.9rem, 3vw, 2.6rem);
  line-height: 1.15;
  letter-spacing: -0.02em;
  margin-bottom: 1rem;
}
.av-sub {
  color: color-mix(in srgb, #ffffff 82%, transparent);
  font-size: 1.02rem;
  margin-bottom: 1.75rem;
}
.av-points { display: grid; gap: 0.85rem; margin-bottom: 2rem; }
.av-points li {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  font-weight: 500;
  font-size: 0.95rem;
}
.av-points li i {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.22);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.av-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  padding-top: 1.25rem;
  border-top: 1px solid rgba(255, 255, 255, 0.16);
}
.av-stat strong {
  display: block;
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.01em;
}
.av-stat strong i { font-size: 0.8rem; color: var(--accent); margin-left: 0.15rem; }
.av-stat span {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: color-mix(in srgb, #ffffff 66%, transparent);
}
.av-quote {
  border-top: 1px solid rgba(255, 255, 255, 0.16);
  padding-top: 1.25rem;
  margin-top: 2rem;
}
.av-quote blockquote {
  font-size: 0.95rem;
  line-height: 1.55;
  color: color-mix(in srgb, #ffffff 90%, transparent);
  margin-bottom: 0.75rem;
}
.av-quote figcaption {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  font-size: 0.83rem;
  color: color-mix(in srgb, #ffffff 72%, transparent);
}
.av-quote figcaption strong { color: #fff; }

/* ---------- Form panel ---------- */
.auth-form-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.25rem 4rem;
}
.auth-form-inner { width: 100%; max-width: 27rem; }

.auth-mobile-logo { display: flex; width: fit-content; }
.auth-title {
  font-size: clamp(1.65rem, 3vw, 2.15rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  margin-bottom: 0.35rem;
}
.auth-subtitle { color: var(--muted); }

.form-alert {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  background: var(--danger-50);
  border: 1px solid color-mix(in srgb, var(--danger) 32%, transparent);
  color: var(--danger-700);
  border-radius: 12px;
  padding: 0.7rem 0.9rem;
  font-size: 0.88rem;
  font-weight: 500;
  margin-bottom: 1.1rem;
  outline-offset: 3px;
}
.form-alert i { margin-top: 0.1rem; }

.field > label {
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 0.4rem;
  display: block;
}
.field input[type='email'],
.field input[type='password'],
.field input[type='text'] {
  width: 100%;
  min-height: 50px;
  border: 1.5px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  padding: 0.65rem 0.95rem;
  font-size: 0.97rem;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.field input:hover { border-color: var(--brand-100); }
.field input:focus {
  outline: none;
  border-color: var(--brand);
  box-shadow: 0 0 0 3.5px var(--brand-50);
}
.field input.is-invalid {
  border-color: var(--danger);
  background: var(--danger-50);
}
.field input.is-invalid:focus { box-shadow: 0 0 0 3.5px rgba(214, 69, 69, 0.16); }
.field-error {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--danger-700);
  font-size: 0.8rem;
  font-weight: 600;
  margin: 0.4rem 0 0;
}
.field-error i { font-size: 0.72rem; }

.password-wrap { position: relative; }
.password-wrap input { padding-right: 3rem; }
.pw-toggle {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 38px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease, color 0.15s ease;
}
.pw-toggle:hover { background: var(--surface-2); color: var(--brand-700); }
.pw-toggle:focus-visible { outline: 2px solid var(--brand); outline-offset: 1px; }

.remember-me {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--text);
  cursor: pointer;
  user-select: none;
}
.remember-me input {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
}
.rm-box {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  border: 1.5px solid var(--border);
  background: var(--surface);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: transparent;
  font-size: 0.8rem;
  transition: all 0.15s ease;
  flex-shrink: 0;
}
.remember-me input:checked + .rm-box {
  background: var(--brand);
  border-color: var(--brand);
  color: #fff;
}
.remember-me input:focus-visible + .rm-box {
  outline: 2px solid var(--brand);
  outline-offset: 2px;
}
.forgot-link {
  font-size: 0.87rem;
  font-weight: 600;
  color: var(--brand-700);
  text-decoration: none;
}
.forgot-link:hover { color: var(--brand); text-decoration: underline; }
.forgot-link:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; border-radius: 4px; }

.auth-submit { font-weight: 700; border-radius: 13px; }
.auth-submit:disabled { opacity: 0.7; }

.auth-switch a,
.back-link {
  color: var(--brand-700);
  font-weight: 600;
}
.auth-switch a:hover { color: var(--brand); }
.back-link { color: var(--muted); font-size: 0.9rem; }
.back-link:hover { color: var(--brand); }

.twofa-icon {
  width: 62px;
  height: 62px;
  border-radius: 18px;
  background: linear-gradient(135deg, var(--brand), var(--brand-700));
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
  margin-bottom: 0.9rem;
  box-shadow: var(--shadow-brand);
}
.code-input {
  width: 100%;
  min-height: 56px;
  border: 1.5px solid var(--border);
  border-radius: 12px;
  text-align: center;
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: 0.5em;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.code-input:focus {
  outline: none;
  border-color: var(--brand);
  box-shadow: 0 0 0 3.5px var(--brand-50);
}

@media (max-width: 991.98px) {
  .auth-page { background: var(--bg); }
  .auth-form-panel { padding-top: 2rem; }
}
</style>
