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

            <h2 class="av-title">Choose a new<br />password.</h2>
            <p class="av-sub">
              Pick a strong, unique password to keep your BusLine account secure.
            </p>

            <ul class="av-points list-unstyled">
              <li><i class="bi bi-shield-check"></i>Encrypted and never shared</li>
              <li><i class="bi bi-key"></i>Use at least 6 characters</li>
              <li><i class="bi bi-lightning-charge"></i>You'll be signed in and ready to book right after</li>
            </ul>

            <div class="av-quote mt-auto">
              <div class="av-pitch-icon"><i class="bi bi-lock-heart"></i></div>
              <div>
                <strong>Secure reset</strong>
                <span>This link can only be used once — after resetting, it expires automatically.</span>
              </div>
            </div>
          </div>
        </aside>

        <!-- Form panel -->
        <main class="auth-form-panel">
          <div class="auth-form-inner">

            <!-- Invalid / missing token -->
            <div v-if="invalidToken" class="fade-in text-center">
              <div class="sent-card">
                <div class="sent-icon sent-icon-danger mx-auto"><i class="bi bi-link-slash" aria-hidden="true"></i></div>
                <h1 class="fw-bold fs-4 mb-2">Link expired or invalid</h1>
                <p class="text-muted small mb-0">
                  This password reset link is invalid or has already been used. Request a fresh one and try again.
                </p>
              </div>
              <router-link to="/forgot-password" class="btn btn-primary btn-lg w-100 mt-3 auth-submit">
                Request a new link
              </router-link>
              <p class="auth-switch text-center mt-3 mb-0 small">
                Remembered your password?
                <router-link to="/login">Back to sign in</router-link>
              </p>
            </div>

            <!-- Success -->
            <div v-else-if="done" class="fade-in text-center">
              <div class="sent-card">
                <div class="sent-icon mx-auto"><i class="bi bi-shield-check" aria-hidden="true"></i></div>
                <h6 class="fw-bold mb-2">Password updated</h6>
                <p class="text-muted small mb-0">You can now sign in with your new password.</p>
              </div>
              <router-link to="/login" class="btn btn-primary btn-lg w-100 mt-3 auth-submit">
                <i class="bi bi-box-arrow-in-right me-2" aria-hidden="true"></i>Sign in
              </router-link>
            </div>

            <!-- Form -->
            <template v-else>
              <div class="text-center text-lg-start mb-4">
                <router-link to="/" class="auth-mobile-logo mb-3 d-lg-none" aria-label="BusLine home">
                  <span class="logo-mark"><i class="bi bi-bus-front-fill"></i></span>
                </router-link>
                <h1 class="auth-title">Set a new password</h1>
                <p class="auth-subtitle">Almost done — choose something you haven't used before.</p>
              </div>

              <form novalidate @submit.prevent="submit">
                <div v-if="error" ref="alertEl" class="form-alert" role="alert" tabindex="-1">
                  <i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i>
                  <span>{{ error }}</span>
                </div>

                <div class="field mb-3">
                  <label for="rp-email">Email address</label>
                  <input
                    id="rp-email"
                    ref="emailEl"
                    v-model.trim="form.email"
                    type="email"
                    placeholder="you@example.com"
                    autocomplete="email"
                    inputmode="email"
                    :class="{ 'is-invalid': touched.email && fieldErrors.email }"
                    :aria-invalid="touched.email && fieldErrors.email ? 'true' : undefined"
                    aria-describedby="rp-email-error"
                    @blur="touch('email')"
                    required
                  />
                  <p v-if="touched.email && fieldErrors.email" id="rp-email-error" class="field-error">
                    <i class="bi bi-x-circle-fill" aria-hidden="true"></i>{{ fieldErrors.email }}
                  </p>
                </div>

                <div class="field mb-3">
                  <label for="rp-password">New password</label>
                  <div class="password-wrap">
                    <input
                      id="rp-password"
                      ref="passwordEl"
                      v-model="form.password"
                      :type="showPassword ? 'text' : 'password'"
                      placeholder="Create a new password"
                      autocomplete="new-password"
                      :class="{ 'is-invalid': touched.password && fieldErrors.password }"
                      :aria-invalid="touched.password && fieldErrors.password ? 'true' : undefined"
                      aria-describedby="pw-rules rp-password-error"
                      @blur="touch('password')"
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
                  <p v-if="touched.password && fieldErrors.password" id="rp-password-error" class="field-error">
                    <i class="bi bi-x-circle-fill" aria-hidden="true"></i>{{ fieldErrors.password }}
                  </p>
                  <ul id="pw-rules" class="pw-rules" aria-live="polite">
                    <li :class="{ ok: pwRules.length }">
                      <i :class="pwRules.length ? 'bi bi-check-circle-fill' : 'bi bi-circle'" aria-hidden="true"></i>
                      At least 6 characters
                    </li>
                    <li :class="{ ok: pwRules.letterNum }">
                      <i :class="pwRules.letterNum ? 'bi bi-check-circle-fill' : 'bi bi-circle'" aria-hidden="true"></i>
                      Letters and numbers <em>(recommended)</em>
                    </li>
                  </ul>
                </div>

                <div class="field mb-4">
                  <label for="rp-confirm">Confirm new password</label>
                  <div class="password-wrap">
                    <input
                      id="rp-confirm"
                      ref="confirmEl"
                      v-model="form.confirm"
                      :type="showConfirm ? 'text' : 'password'"
                      placeholder="Re-enter your new password"
                      autocomplete="new-password"
                      :class="{ 'is-invalid': touched.confirm && fieldErrors.confirm }"
                      :aria-invalid="touched.confirm && fieldErrors.confirm ? 'true' : undefined"
                      aria-describedby="rp-confirm-error"
                      @blur="touch('confirm')"
                      required
                    />
                    <button
                      type="button"
                      class="pw-toggle"
                      :aria-label="showConfirm ? 'Hide confirm password' : 'Show confirm password'"
                      :aria-pressed="showConfirm ? 'true' : 'false'"
                      @click="showConfirm = !showConfirm"
                    >
                      <i :class="showConfirm ? 'bi bi-eye-slash' : 'bi bi-eye'" aria-hidden="true"></i>
                    </button>
                  </div>
                  <p v-if="touched.confirm && fieldErrors.confirm" id="rp-confirm-error" class="field-error">
                    <i class="bi bi-x-circle-fill" aria-hidden="true"></i>{{ fieldErrors.confirm }}
                  </p>
                </div>

                <button class="btn btn-primary btn-lg w-100 auth-submit" type="submit" :disabled="submitting">
                  <span v-if="submitting" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                  {{ submitting ? 'Updating…' : 'Update password' }}
                </button>

                <p class="auth-switch text-center mt-4 mb-0 small">
                  Didn't request this?
                  <router-link to="/login">Back to sign in</router-link>
                </p>
              </form>
            </template>

          </div>
        </main>

      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { extractError } from '../../services/api'
import { useAuthStore } from '../../stores/auth'

const route = useRoute()
const auth = useAuthStore()

const invalidToken = computed(() => !route.query.token)

const form = reactive({
  email: String(route.query.email || ''),
  token: String(route.query.token || ''),
  password: '',
  confirm: '',
})
const touched = reactive({ email: false, password: false, confirm: false })
const showPassword = ref(false)
const showConfirm = ref(false)
const error = ref('')
const submitting = ref(false)
const done = ref(false)

const emailEl = ref(null)
const passwordEl = ref(null)
const confirmEl = ref(null)
const alertEl = ref(null)

const pwRules = computed(() => ({
  length: form.password.length >= 6,
  letterNum: /[a-zA-Z]/.test(form.password) && /\d/.test(form.password),
}))

const fieldErrors = computed(() => {
  const e = {}
  if (!form.email) e.email = 'Email address is required.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address.'
  if (!form.password) e.password = 'New password is required.'
  else if (form.password.length < 6) e.password = 'Password must be at least 6 characters.'
  if (!form.confirm) e.confirm = 'Please confirm your new password.'
  else if (form.confirm !== form.password) e.confirm = 'Passwords do not match.'
  return e
})

watch(error, async (val) => {
  if (val) {
    await nextTick()
    alertEl.value?.focus({ preventScroll: true })
  }
})

function touch(name) {
  touched[name] = true
}

function focusFirstInvalid() {
  if (fieldErrors.value.email) return emailEl.value?.focus()
  if (fieldErrors.value.password) return passwordEl.value?.focus()
  if (fieldErrors.value.confirm) return confirmEl.value?.focus()
}

async function submit() {
  touched.email = touched.password = touched.confirm = true
  error.value = ''
  if (Object.keys(fieldErrors.value).length) {
    focusFirstInvalid()
    return
  }
  submitting.value = true
  try {
    await auth.resetPassword(form.email, form.token, form.password)
    done.value = true
  } catch (e) {
    error.value = extractError(e).message
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.auth-page { min-height: calc(100vh - 68px); background: var(--bg); }
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
    radial-gradient(760px 480px at 88% -12%, rgba(0, 0, 0, 0.35), transparent 60%),
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
  bottom: 5%;
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
.av-quote {
  display: flex;
  align-items: flex-start;
  gap: 0.8rem;
  border-top: 1px solid rgba(255, 255, 255, 0.16);
  padding-top: 1.25rem;
}
.av-pitch-icon {
  width: 44px;
  height: 44px;
  border-radius: 13px;
  background: var(--accent);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  flex-shrink: 0;
}
.av-quote strong { display: block; font-size: 0.98rem; margin-bottom: 0.15rem; }
.av-quote span { font-size: 0.85rem; color: color-mix(in srgb, #ffffff 74%, transparent); }

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
.password-wrap input {
  width: 100%;
  min-height: 50px;
  border: 1.5px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  padding: 0.65rem 0.95rem;
  font-size: 0.97rem;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.password-wrap input { padding-right: 3rem; }
.field input[type='email']:hover,
.password-wrap input:hover { border-color: var(--brand-100); }
.field input[type='email']:focus,
.password-wrap input:focus {
  outline: none;
  border-color: var(--brand);
  box-shadow: 0 0 0 3.5px var(--brand-50);
}
.field input.is-invalid { border-color: var(--danger); background: var(--danger-50); }
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

.pw-rules {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 1.1rem;
  padding: 0;
  margin: 0.55rem 0 0;
}
.pw-rules li {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.79rem;
  color: var(--muted);
  transition: color 0.15s ease;
}
.pw-rules li em { font-style: normal; opacity: 0.75; }
.pw-rules li i { font-size: 0.78rem; }
.pw-rules li.ok { color: var(--success-700); }

.auth-submit { font-weight: 700; border-radius: 13px; }
.auth-submit:disabled { opacity: 0.7; }

.sent-card {
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface);
  padding: 2rem 1.5rem;
}
.sent-icon {
  width: 64px;
  height: 64px;
  border-radius: 18px;
  background: linear-gradient(135deg, var(--brand), var(--brand-700));
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
  margin-bottom: 1rem;
  box-shadow: var(--shadow-brand);
}
.sent-icon-danger {
  background: linear-gradient(135deg, var(--danger), var(--danger-700));
  box-shadow: 0 8px 24px rgba(214, 69, 69, 0.3);
}

.auth-switch a { color: var(--brand-700); font-weight: 600; }
.auth-switch a:hover { color: var(--brand); }

.fade-in { animation: fadeIn 0.3s ease both; }
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 991.98px) {
  .auth-form-panel { padding-top: 2rem; }
}
@media (prefers-reduced-motion: reduce) {
  .fade-in { animation: none; }
}
</style>
