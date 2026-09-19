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

            <h2 class="av-title">Start your<br />journey today.</h2>
            <p class="av-sub">
              Create a free account to book seats instantly — or register your bus company and start selling tickets nationwide.
            </p>

            <ul class="av-points list-unstyled">
              <li><i class="bi bi-person-check"></i>Free to join — ready in minutes</li>
              <li><i class="bi bi-credit-card"></i>Flexible online &amp; terminal payments</li>
              <li><i class="bi bi-ticket-perforated"></i>QR tickets on your phone</li>
            </ul>

            <div class="av-vendor-pitch mt-auto">
              <div class="av-pitch-icon"><i class="bi bi-buildings"></i></div>
              <div>
                <strong>Own a bus company?</strong>
                <span>Switch to Vendor during sign-up to list your trips on BusLine.</span>
              </div>
            </div>
          </div>
        </aside>

        <!-- Form panel -->
        <main class="auth-form-panel">
          <div class="auth-form-inner">

            <div class="text-center text-lg-start mb-4">
              <router-link to="/" class="auth-mobile-logo mb-3 d-lg-none" aria-label="BusLine home">
                <span class="logo-mark"><i class="bi bi-bus-front-fill"></i></span>
              </router-link>
              <h1 class="auth-title">Create your account</h1>
              <p class="auth-subtitle">Join thousands booking safer trips on BusLine.</p>
            </div>

            <!-- Role toggle -->
            <div class="role-toggle mb-4" role="group" aria-label="Account type">
              <button
                type="button"
                :class="{ active: role === 'customer' }"
                :aria-pressed="role === 'customer' ? 'true' : 'false'"
                @click="role = 'customer'"
              >
                <i class="bi bi-person me-1" aria-hidden="true"></i>I'm a traveler
              </button>
              <button
                type="button"
                :class="{ active: role === 'vendor' }"
                :aria-pressed="role === 'vendor' ? 'true' : 'false'"
                @click="role = 'vendor'"
              >
                <i class="bi bi-buildings me-1" aria-hidden="true"></i>I'm an operator
              </button>
            </div>

            <form novalidate @submit.prevent="submit">
              <div v-if="error" ref="alertEl" class="form-alert" role="alert" tabindex="-1">
                <i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i>
                <span>{{ error }}</span>
              </div>
              <div v-if="success" ref="successEl" class="form-alert form-alert-success" role="status" tabindex="-1">
                <i class="bi bi-check-circle-fill" aria-hidden="true"></i>
                <span>{{ success }}</span>
              </div>

              <div class="field mb-3">
                <label for="reg-name">Full name</label>
                <input
                  id="reg-name"
                  ref="nameEl"
                  v-model.trim="form.name"
                  type="text"
                  placeholder="e.g. Ada Obi"
                  autocomplete="name"
                  :class="{ 'is-invalid': touched && fieldErrors.name }"
                  :aria-invalid="touched && fieldErrors.name ? 'true' : undefined"
                  aria-describedby="reg-name-error"
                  @blur="touch.name = true"
                  required
                />
                <p v-if="touched && fieldErrors.name" id="reg-name-error" class="field-error">
                  <i class="bi bi-x-circle-fill" aria-hidden="true"></i>{{ fieldErrors.name }}
                </p>
              </div>

              <div class="row g-3">
                <div class="col-md-6">
                  <div class="field h-100">
                    <label for="reg-email">Email address</label>
                    <input
                      id="reg-email"
                      ref="emailEl"
                      v-model.trim="form.email"
                      type="email"
                      placeholder="you@example.com"
                      autocomplete="email"
                      inputmode="email"
                      :class="{ 'is-invalid': touched && fieldErrors.email }"
                      :aria-invalid="touched && fieldErrors.email ? 'true' : undefined"
                      aria-describedby="reg-email-error"
                      @blur="touch.email = true"
                      required
                    />
                    <p v-if="touched && fieldErrors.email" id="reg-email-error" class="field-error">
                      <i class="bi bi-x-circle-fill" aria-hidden="true"></i>{{ fieldErrors.email }}
                    </p>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="field h-100">
                    <label for="reg-phone">{{ role === 'vendor' ? 'Company phone' : 'Phone' }} <span class="opt">(optional)</span></label>
                    <input
                      id="reg-phone"
                      v-model.trim="form.phone"
                      type="tel"
                      placeholder="+234 800 000 0000"
                      autocomplete="tel"
                      inputmode="tel"
                    />
                  </div>
                </div>
              </div>

              <!-- Vendor fields -->
              <template v-if="role === 'vendor'">
                <div class="vendor-block fade-in">
                  <div class="vb-head"><i class="bi bi-buildings"></i>Company details</div>

                  <div class="field mb-3">
                    <label for="reg-company">Company name</label>
                    <input
                      id="reg-company"
                      ref="companyEl"
                      v-model.trim="form.company_name"
                      type="text"
                      placeholder="e.g. Peace Motors Ltd"
                      autocomplete="organization"
                      :class="{ 'is-invalid': touched && fieldErrors.company_name }"
                      :aria-invalid="touched && fieldErrors.company_name ? 'true' : undefined"
                      aria-describedby="reg-company-error"
                      @blur="touch.company_name = true"
                      required
                    />
                    <p v-if="touched && fieldErrors.company_name" id="reg-company-error" class="field-error">
                      <i class="bi bi-x-circle-fill" aria-hidden="true"></i>{{ fieldErrors.company_name }}
                    </p>
                  </div>

                  <div class="field mb-3">
                    <label id="terminals-label">Terminals you operate from</label>
                    <div v-if="loadingTerminals" class="terminal-loading small text-muted">
                      <span class="spinner-border spinner-border-sm me-2"></span>Loading terminals…
                    </div>
                    <div v-else-if="terminals.length === 0" class="terminal-empty small text-muted">
                      <i class="bi bi-info-circle me-1"></i>No terminals available yet — you can add them later from your dashboard.
                    </div>
                    <div v-else class="terminal-picker" role="group" aria-labelledby="terminals-label">
                      <label v-for="t in terminals" :key="t.id" class="terminal-option">
                        <input type="checkbox" :value="t.id" v-model="form.terminal_ids" />
                        <span class="to-box" aria-hidden="true"><i class="bi bi-check-lg"></i></span>
                        <span>{{ t.name }} <small v-if="t.city_name">— {{ t.city_name }}</small></span>
                      </label>
                    </div>
                  </div>

                  <div class="row g-3">
                    <div class="col-md-6">
                      <div class="field h-100">
                        <label for="reg-city">City</label>
                        <input id="reg-city" v-model.trim="form.city" type="text" autocomplete="address-level2" />
                      </div>
                    </div>
                    <div class="col-md-6">
                      <div class="field h-100">
                        <label for="reg-address">Address</label>
                        <input id="reg-address" v-model.trim="form.address" type="text" autocomplete="street-address" />
                      </div>
                    </div>
                  </div>
                </div>
              </template>

              <!-- Customer referral -->
              <div v-else class="field mb-0 mt-3">
                <label for="reg-referral">Referral code <span class="opt">(optional)</span></label>
                <input
                  id="reg-referral"
                  v-model.trim="referralCode"
                  type="text"
                  placeholder="BL…"
                  maxlength="50"
                  autocomplete="off"
                  :disabled="Boolean(route.query.ref)"
                />
                <p v-if="route.query.ref" class="ref-hint small">
                  <i class="bi bi-gift-fill me-1 text-brand"></i>A friend invited you — your referrer will be linked automatically.
                </p>
              </div>

              <div class="mt-3">
                <div class="field mb-2">
                  <label for="reg-password">Password</label>
                  <div class="password-wrap">
                    <input
                      id="reg-password"
                      v-model="form.password"
                      :type="showPassword ? 'text' : 'password'"
                      placeholder="Create a password"
                      autocomplete="new-password"
                      :class="{ 'is-invalid': touched && fieldErrors.password }"
                      :aria-invalid="touched && fieldErrors.password ? 'true' : undefined"
                      aria-describedby="pw-rules reg-password-error"
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
                  <p v-if="touched && fieldErrors.password" id="reg-password-error" class="field-error">
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

                <div class="field mb-2">
                  <label for="reg-confirm">Confirm password</label>
                  <div class="password-wrap">
                    <input
                      id="reg-confirm"
                      v-model="confirmPassword"
                      :type="showConfirm ? 'text' : 'password'"
                      placeholder="Re-enter your password"
                      autocomplete="new-password"
                      :class="{ 'is-invalid': touchedConfirm && confirmPassword && !passwordsMatch }"
                      :aria-invalid="touchedConfirm && confirmPassword && !passwordsMatch ? 'true' : undefined"
                      aria-describedby="reg-confirm-error"
                      @blur="touchConfirm = true"
                      required
                    />
                    <button
                      type="button"
                      class="pw-toggle"
                      :aria-label="showConfirm ? 'Hide password confirmation' : 'Show password confirmation'"
                      :aria-pressed="showConfirm ? 'true' : 'false'"
                      @click="showConfirm = !showConfirm"
                    >
                      <i :class="showConfirm ? 'bi bi-eye-slash' : 'bi bi-eye'" aria-hidden="true"></i>
                    </button>
                  </div>
                  <p v-if="touchedConfirm && confirmPassword && !passwordsMatch" id="reg-confirm-error" class="field-error">
                    <i class="bi bi-x-circle-fill" aria-hidden="true"></i>Passwords don't match.
                  </p>
                </div>
              </div>

              <!-- Terms -->
              <label class="terms-row" for="terms-check">
                <input id="terms-check" v-model="acceptedTerms" type="checkbox" />
                <span class="rm-box" aria-hidden="true"><i class="bi bi-check-lg"></i></span>
                <span class="small">
                  I agree to the
                  <a href="#" @click.stop>Terms &amp; Conditions</a> and
                  <a href="#" @click.stop>Privacy Policy</a>.
                </span>
              </label>
              <p v-if="touchedTerms && !acceptedTerms" class="field-error ms-sm-5">
                <i class="bi bi-x-circle-fill" aria-hidden="true"></i>Please accept the terms to continue.
              </p>

              <button class="btn btn-primary btn-lg w-100 auth-submit mt-3" type="submit" :disabled="submitting">
                <span v-if="submitting" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                {{ submitting ? 'Creating account…' : 'Create account' }}
              </button>

              <p class="auth-switch text-center mt-4 mb-0 small">
                Already have an account?
                <router-link to="/login">Sign in</router-link>
              </p>
            </form>

          </div>
        </main>

      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api, { extractError } from '../../services/api'
import { useAuthStore } from '../../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const role = ref(route.query.role === 'vendor' ? 'vendor' : 'customer')
const terminals = ref([])
const loadingTerminals = ref(false)
const referralCode = ref(String(route.query.ref || '').trim())

const form = reactive({
  name: '',
  email: '',
  phone: '',
  password: '',
  company_name: '',
  company_phone: '',
  address: '',
  city: '',
  country: '',
  terminal_ids: [],
})
const confirmPassword = ref('')
const acceptedTerms = ref(false)
const touch = reactive({ name: false, email: false, password: false, company_name: false })
const touchConfirm = ref(false)
const touchedTerms = ref(false)
const showPassword = ref(false)
const showConfirm = ref(false)

const error = ref('')
const success = ref('')
const submitting = ref(false)

const nameEl = ref(null)
const emailEl = ref(null)
const companyEl = ref(null)
const alertEl = ref(null)
const successEl = ref(null)

const passwordsMatch = computed(() => form.password === confirmPassword.value)
const pwRules = computed(() => ({
  length: form.password.length >= 6,
  letterNum: /[a-zA-Z]/.test(form.password) && /\d/.test(form.password),
}))

const fieldErrors = computed(() => {
  const e = {}
  if (!form.name || form.name.length < 2) e.name = 'Please enter your full name.'
  if (!form.email) e.email = 'Email address is required.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address.'
  if (!form.password) e.password = 'Password is required.'
  else if (form.password.length < 6) e.password = 'Password must be at least 6 characters.'
  if (role.value === 'vendor' && (!form.company_name || form.company_name.length < 2)) {
    e.company_name = 'Please enter your company name.'
  }
  return e
})

watch(role, () => {
  error.value = ''
})

watch(success, async (val) => {
  if (val) {
    await nextTick()
    successEl.value?.focus({ preventScroll: true })
  }
})

watch(error, async (val) => {
  if (val) {
    await nextTick()
    alertEl.value?.focus({ preventScroll: true })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
})

async function loadTerminals() {
  loadingTerminals.value = true
  try {
    const { data } = await api.get('/terminals')
    terminals.value = (data.data || []).map((t) => ({ id: t.id, name: t.name, city_name: t.city_name || '' }))
  } catch (e) {
    terminals.value = []
  } finally {
    loadingTerminals.value = false
  }
}

function focusFirstInvalid() {
  const order = [nameEl, emailEl, companyEl]
  for (const el of order) {
    if (el.value) {
      el.value.focus()
      return
    }
  }
}

async function submit() {
  Object.keys(touch).forEach((k) => (touch[k] = true))
  touchedTerms.value = true
  error.value = ''

  if (Object.keys(fieldErrors.value).length) {
    focusFirstInvalid()
    return
  }
  if (!passwordsMatch.value) return
  if (!acceptedTerms.value) return

  submitting.value = true
  try {
    if (role.value === 'vendor') {
      await auth.registerVendor({
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone,
        type: 'bus_booking',
        company_name: form.company_name,
        company_phone: form.company_phone || form.phone,
        address: form.address,
        city: form.city,
        country: form.country,
        terminal_ids: form.terminal_ids.map(Number),
      })
      success.value = 'Registration successful. Your account is pending admin approval.'
    } else {
      await auth.registerCustomer({
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone,
        referral_code: referralCode.value || undefined,
      })
      router.push({ name: 'verify-email', query: { email: form.email } })
    }
  } catch (e) {
    const err = extractError(e)
    if (err.errors) {
      error.value = Object.values(err.errors).join('. ')
    } else {
      error.value = err.message
    }
  } finally {
    submitting.value = false
  }
}

loadTerminals()
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
  bottom: 4%;
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
.av-points { display: grid; gap: 0.85rem; }
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
.av-vendor-pitch {
  display: flex;
  align-items: flex-start;
  gap: 0.8rem;
  border-top: 1px solid rgba(255, 255, 255, 0.16);
  padding-top: 1.25rem;
  margin-top: 2rem;
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
.av-vendor-pitch strong { display: block; font-size: 0.98rem; margin-bottom: 0.15rem; }
.av-vendor-pitch span { font-size: 0.85rem; color: color-mix(in srgb, #ffffff 74%, transparent); }

/* ---------- Form panel ---------- */
.auth-form-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.25rem 4rem;
}
.auth-form-inner { width: 100%; max-width: 34rem; }

.auth-mobile-logo { display: flex; width: fit-content; }
.auth-title {
  font-size: clamp(1.65rem, 3vw, 2.05rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  margin-bottom: 0.35rem;
}
.auth-subtitle { color: var(--muted); }
.opt { color: var(--muted); font-weight: 400; }

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
.form-alert-success {
  background: var(--success-50);
  border-color: color-mix(in srgb, var(--success) 36%, transparent);
  color: var(--success-700);
}

/* Role toggle */
.role-toggle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.35rem;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 0.3rem;
}
.role-toggle button {
  border: 0;
  background: transparent;
  border-radius: 11px;
  font-weight: 600;
  font-size: 0.92rem;
  color: var(--muted);
  padding: 0.62rem 0.75rem;
  transition: background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
  min-height: 48px;
}
.role-toggle button:hover { color: var(--text); }
.role-toggle button.active {
  background: var(--surface);
  color: var(--brand-700);
  box-shadow: var(--shadow-sm);
}
.role-toggle button:focus-visible { outline: 2px solid var(--brand); outline-offset: 1px; }

/* Fields */
.field > label {
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 0.4rem;
  display: block;
}
.field input[type='email'],
.field input[type='password'],
.field input[type='text'],
.field input[type='tel'] {
  width: 100%;
  min-height: 50px;
  border: 1.5px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  padding: 0.65rem 0.95rem;
  font-size: 0.97rem;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.field input:hover:not(:disabled) { border-color: var(--brand-100); }
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
.field input:disabled { opacity: 0.7; background: var(--surface-2); }
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

.vendor-block {
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 1rem 1rem 1.25rem;
  background: var(--surface-2);
  margin-top: 0.75rem;
}
.vb-head {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--brand-700);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 1rem;
}
.vb-head i { font-size: 1rem; }

.terminal-picker {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  padding: 0.55rem;
  max-height: 200px;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 0.15rem;
}
.terminal-option {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.42rem 0.5rem;
  border-radius: 9px;
  cursor: pointer;
  font-size: 0.88rem;
  transition: background 0.15s ease;
}
.terminal-option:hover { background: var(--brand-50); }
.terminal-option input { position: absolute; opacity: 0; width: 1px; height: 1px; }
.to-box {
  width: 19px;
  height: 19px;
  border-radius: 6px;
  border: 1.5px solid var(--border);
  background: var(--surface);
  color: transparent;
  font-size: 0.75rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s ease;
  margin-top: 0.05rem;
}
.terminal-option input:checked ~ .to-box {
  background: var(--brand);
  border-color: var(--brand);
  color: #fff;
}
.terminal-option input:focus-visible ~ .to-box {
  outline: 2px solid var(--brand);
  outline-offset: 2px;
}
.terminal-option small { color: var(--muted); }
.terminal-empty {
  border: 1px dashed var(--border);
  border-radius: 12px;
  padding: 0.8rem 1rem;
  background: var(--surface);
}
.terminal-loading { padding: 0.5rem 0; }

.ref-hint { color: var(--muted); margin: 0.4rem 0 0; }
.text-brand { color: var(--brand); }

/* Terms */
.terms-row {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  margin-top: 0.9rem;
  cursor: pointer;
  user-select: none;
}
.terms-row input { position: absolute; opacity: 0; width: 1px; height: 1px; }
.terms-row a { color: var(--brand-700); font-weight: 600; text-decoration: underline; }
.rm-box {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  border: 1.5px solid var(--border);
  background: var(--surface);
  color: transparent;
  font-size: 0.8rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  flex-shrink: 0;
  margin-top: 0.05rem;
}
.terms-row input:checked + .rm-box {
  background: var(--brand);
  border-color: var(--brand);
  color: #fff;
}
.terms-row input:focus-visible + .rm-box {
  outline: 2px solid var(--brand);
  outline-offset: 2px;
}

.auth-submit { font-weight: 700; border-radius: 13px; }
.auth-submit:disabled { opacity: 0.7; }
.auth-switch a { color: var(--brand-700); font-weight: 600; }
.auth-switch a:hover { color: var(--brand); }

.fade-in { animation: fadeIn 0.3s ease both; }
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 767.98px) {
  .auth-form-panel { padding-top: 2rem; }
}
@media (prefers-reduced-motion: reduce) {
  .fade-in { animation: none; }
}
</style>
