<template>
  <section class="vr-wrap">
    <div class="container">
      <div class="vr-card">
        <div class="vr-brand">
          <router-link to="/" class="sa-logo">
            <span class="sa-logo-mark"><i class="bi bi-bus-front-fill"></i></span>
            <span class="sa-logo-text">Bus<span class="brand-accent">Line</span></span>
          </router-link>
        </div>

        <h1 class="vr-title">Become a Vendor</h1>
        <p class="vr-subtitle">Tell us a bit about your business and you'll be ready to reach more customers.</p>

        <!-- Step indicator -->
        <div class="steps" role="tablist" aria-label="Registration steps">
          <template v-for="(step, i) in steps" :key="step.key">
            <button
              type="button"
              class="step"
              :class="{
                active: stepIndex === i,
                done: i < stepIndex,
              }"
              :aria-current="stepIndex === i ? 'step' : undefined"
              @click="goTo(i)"
            >
              <span class="step-dot">
                <i v-if="i < stepIndex" class="bi bi-check-lg"></i>
                <template v-else>{{ i + 1 }}</template>
              </span>
              <span class="step-label">{{ step.label }}</span>
            </button>
            <span v-if="i < steps.length - 1" class="step-line" />
          </template>
        </div>

        <div v-if="error" class="sa-alert" role="alert">
          <i class="bi bi-exclamation-triangle-fill"></i><span>{{ error }}</span>
        </div>
        <div v-if="success" class="sa-alert sa-alert-success" role="status">
          <i class="bi bi-check-circle-fill"></i><span>{{ success }} <router-link to="/vendor-login" class="sa-link">Sign in</router-link></span>
        </div>

        <!-- Field steps (1–3) -->
        <form v-if="!success && stepIndex < steps.length - 1" novalidate @submit.prevent="next">
          <!-- STEP 1: About you -->
          <div v-if="stepIndex === 0" class="step-panel">
            <h2 class="panel-title">About you</h2>
            <p class="panel-hint">This is the person who manages the vendor account.</p>
            <div class="row g-3">
              <div class="col-md-6">
                <div class="field"><label for="vr-name">Contact name</label>
                  <input id="vr-name" v-model.trim="form.name" type="text" placeholder="Your full name" autocomplete="name" required /></div>
              </div>
              <div class="col-md-6">
                <div class="field"><label for="vr-email">Email address</label>
                  <input id="vr-email" v-model.trim="form.email" type="email" placeholder="you@example.com" autocomplete="email" required /></div>
              </div>
              <div class="col-md-6">
                <div class="field"><label for="vr-phone">Company phone <span class="opt">(optional)</span></label>
                  <input id="vr-phone" v-model.trim="form.phone" type="tel" placeholder="+234 800 000 0000" autocomplete="tel" /></div>
              </div>
              <div class="col-md-6">
                <div class="field"><label for="vr-company">Company name</label>
                  <input id="vr-company" v-model.trim="form.company_name" type="text" placeholder="e.g. Peace Motors Ltd" autocomplete="organization" required /></div>
              </div>
            </div>
          </div>

          <!-- STEP 2: Your business -->
          <div v-else-if="stepIndex === 1" class="step-panel">
            <h2 class="panel-title">Your business</h2>
            <p class="panel-hint">Help us place your business on the map.</p>
            <div class="field mb-3">
              <label>Terminals you operate from</label>
              <div v-if="loadingTerminals" class="small text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Loading terminals…</div>
              <div v-else-if="terminals.length === 0" class="small text-muted"><i class="bi bi-info-circle me-1"></i>No terminals available yet — you can add them later from your dashboard.</div>
              <div v-else class="terminal-picker">
                <label v-for="t in terminals" :key="t.id" class="terminal-option">
                  <input type="checkbox" :value="t.id" v-model="form.terminal_ids" />
                  <span class="to-box"><i class="bi bi-check-lg"></i></span>
                  <span>{{ t.name }} <small v-if="t.city_name">— {{ t.city_name }}</small></span>
                </label>
              </div>
            </div>
            <div class="row g-3">
              <div class="col-md-6">
                <div class="field"><label for="vr-city">City</label>
                  <input id="vr-city" v-model.trim="form.city" type="text" placeholder="e.g. Lagos" /></div>
              </div>
              <div class="col-md-6">
                <div class="field"><label for="vr-address">Address</label>
                  <input id="vr-address" v-model.trim="form.address" type="text" placeholder="Street address" /></div>
              </div>
            </div>
          </div>

          <!-- STEP 3: Security -->
          <div v-else class="step-panel">
            <h2 class="panel-title">Secure your account</h2>
            <p class="panel-hint">Choose a strong password to keep your business safe.</p>
            <div class="row g-3">
              <div class="col-md-6">
                <div class="field"><label for="vr-password">Password</label>
                  <div class="password-wrap">
                    <input id="vr-password" v-model="form.password" :type="showPassword ? 'text' : 'password'" placeholder="Create a password" autocomplete="new-password" required />
                    <button type="button" class="pw-toggle" @click="showPassword = !showPassword"><i :class="showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i></button>
                  </div>
                </div>
              </div>
              <div class="col-md-6">
                <div class="field"><label for="vr-confirm">Confirm password</label>
                  <input id="vr-confirm" v-model="form.password_confirmation" :type="showPassword ? 'text' : 'password'" placeholder="Repeat password" autocomplete="new-password" required /></div>
              </div>
            </div>

            <label class="vr-terms mt-3">
              <input v-model="acceptedTerms" type="checkbox" />
              <span class="to-box"><i class="bi bi-check-lg"></i></span>
              <span>I agree to the Vendor <a href="#" @click.prevent>Terms of Service</a>.</span>
            </label>
          </div>

          <div class="step-nav">
            <button v-if="stepIndex > 0" type="button" class="btn btn-outline-dark step-btn" @click="stepIndex--">
              <i class="bi bi-arrow-left me-1"></i>Back
            </button>
            <button type="submit" class="btn btn-dark step-btn step-btn-primary" :disabled="submitting">
              <span v-if="submitting" class="spinner-border spinner-border-sm me-2"></span>
              <template v-if="stepIndex === steps.length - 2">Review details</template>
              <template v-else>Continue<i class="bi bi-arrow-right ms-1"></i></template>
            </button>
          </div>
        </form>

        <!-- STEP 4: Review -->
        <div v-else-if="!success" class="step-panel review-panel">
          <h2 class="panel-title">Review your details</h2>
          <p class="panel-hint">Confirm everything looks right before we create your account.</p>

          <div class="review-group">
            <h3 class="review-group-title">Contact</h3>
            <dl class="review-list">
              <div class="review-item"><dt>Name</dt><dd>{{ form.name }}</dd></div>
              <div class="review-item"><dt>Email</dt><dd>{{ form.email }}</dd></div>
              <div class="review-item"><dt>Phone</dt><dd>{{ form.phone || '—' }}</dd></div>
            </dl>
          </div>

          <div class="review-group">
            <h3 class="review-group-title">Business</h3>
            <dl class="review-list">
              <div class="review-item"><dt>Company</dt><dd>{{ form.company_name }}</dd></div>
              <div class="review-item"><dt>Terminals</dt><dd>{{ selectedTerminalNames || 'None selected' }}</dd></div>
              <div class="review-item"><dt>City</dt><dd>{{ form.city || '—' }}</dd></div>
              <div class="review-item"><dt>Address</dt><dd>{{ form.address || '—' }}</dd></div>
            </dl>
          </div>

          <div class="review-note">
            <i class="bi bi-shield-check me-2"></i>You'll be able to review and change any of these details later from your dashboard.
          </div>

          <div class="step-nav">
            <button type="button" class="btn btn-outline-dark step-btn" @click="stepIndex--">
              <i class="bi bi-arrow-left me-1"></i>Back
            </button>
            <button type="button" class="btn btn-dark step-btn step-btn-primary" :disabled="submitting" @click="submit">
              <span v-if="submitting" class="spinner-border spinner-border-sm me-2"></span>
              {{ submitting ? 'Creating account…' : 'Create vendor account' }}
            </button>
          </div>
        </div>

        <div class="vr-footer">
          <span>Already registered?</span>
          <router-link to="/vendor-login" class="sa-link">Vendor sign in</router-link>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import api, { extractError } from '../../services/api'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
const router = useRouter()

const form = reactive({
  name: '', email: '', phone: '', company_name: '',
  terminal_ids: [], city: '', address: '',
  password: '', password_confirmation: '',
})
const steps = [
  { key: 'you', label: 'About you' },
  { key: 'business', label: 'Business' },
  { key: 'security', label: 'Security' },
  { key: 'review', label: 'Review' },
]
const showPassword = ref(false)
const acceptedTerms = ref(false)
const error = ref('')
const success = ref('')
const submitting = ref(false)
const stepIndex = ref(0)
const loadingTerminals = ref(true)
const terminals = ref([])

const selectedTerminalNames = computed(() =>
  terminals.value.filter((t) => form.terminal_ids.includes(t.id)).map((t) => t.name).join(', ')
)

onMounted(async () => {
  try {
    const { data } = await api.get('/terminals')
    terminals.value = (data.data || []).map((t) => ({ id: t.id, name: t.name, city_name: t.city_name || '' }))
  } catch {
    terminals.value = []
  } finally {
    loadingTerminals.value = false
  }
})

function goTo(i) {
  if (i < stepIndex.value) { stepIndex.value = i; return }
  if (i === stepIndex.value + 1 && validateStep(stepIndex.value)) stepIndex.value = i
}

function next() {
  if (validateStep(stepIndex.value)) stepIndex.value++
}

function validateStep(i) {
  error.value = ''
  if (i === 0) {
    if (!form.name || form.name.length < 2) { error.value = 'Please enter your full name.'; return false }
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { error.value = 'Enter a valid email address.'; return false }
    if (!form.company_name || form.company_name.length < 2) { error.value = 'Please enter your company name.'; return false }
    return true
  }
  if (i === 1) return true
  if (i === 2) {
    if (!form.password || form.password.length < 6) { error.value = 'Password must be at least 6 characters.'; return false }
    if (form.password !== form.password_confirmation) { error.value = 'Passwords do not match.'; return false }
    if (!acceptedTerms.value) { error.value = 'Please accept the terms of service.'; return false }
    return true
  }
  return true
}

async function submit() {
  error.value = ''
  submitting.value = true
  try {
    await auth.registerVendor({
      name: form.name,
      email: form.email,
      password: form.password,
      phone: form.phone,
      type: 'bus_booking',
      company_name: form.company_name,
      company_phone: form.phone,
      address: form.address,
      city: form.city,
      country: 'NG',
      terminal_ids: form.terminal_ids.map(Number),
    })
    // The vendor is logged in automatically; send them to their dashboard
    // where they'll see the "pending approval" notice until an admin approves.
    if (auth.isAuthenticated && auth.isVendor) {
      router.push('/vendor/dashboard')
      return
    }
    success.value = 'Registration successful. Your account is pending admin approval.'
  } catch (e) {
    const err = extractError(e)
    error.value = err.errors ? Object.values(err.errors).join('. ') : err.message
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.vr-wrap { padding: 4rem 1.25rem 5rem; background: #fff; }
.vr-card { max-width: 46rem; margin: 0 auto; border: 1px solid #ececec; border-radius: 20px; padding: 2.5rem 2rem; background: #fff; box-shadow: 0 24px 60px rgba(0, 0, 0, 0.06); }
.vr-brand { margin-bottom: 1.5rem; }
.sa-logo { display: inline-flex; align-items: center; gap: 0.6rem; text-decoration: none; }
.sa-logo-mark { width: 42px; height: 42px; border-radius: 12px; background: #000; color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 1.15rem; }
.sa-logo-text { font-weight: 800; font-size: 1.3rem; color: #000; }
.brand-accent { color: #000; }
.vr-title { font-size: 1.8rem; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 0.3rem; }
.vr-subtitle { color: rgba(0, 0, 0, 0.62); margin-bottom: 1.8rem; }

/* Steps */
.steps { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 2rem; flex-wrap: wrap; }
.step {
  display: inline-flex; align-items: center; gap: 0.5rem;
  background: transparent; border: 0; padding: 0.25rem;
  color: rgba(0, 0, 0, 0.45); font-weight: 600; font-size: 0.86rem; cursor: pointer;
}
.step-label { white-space: nowrap; }
.step-dot {
  width: 30px; height: 30px; border-radius: 50%;
  border: 1.5px solid var(--border); color: rgba(0, 0, 0, 0.45);
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 0.82rem; font-weight: 700; flex-shrink: 0; transition: all 0.2s ease; background: #fff;
}
.step.active .step-dot, .step.done .step-dot { background: #000; border-color: #000; color: #fff; }
.step.active { color: #000; }
.step.done { color: rgba(0, 0, 0, 0.7); }
.step-line { flex: 1 1 18px; height: 2px; background: var(--border); min-width: 12px; }

/* Panels */
.step-panel { animation: fadeIn 0.25s ease; }
.panel-title { font-size: 1.25rem; font-weight: 800; letter-spacing: -0.01em; margin-bottom: 0.2rem; }
.panel-hint { color: rgba(0, 0, 0, 0.58); font-size: 0.92rem; margin-bottom: 1.4rem; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

.sa-alert { display: flex; align-items: flex-start; gap: 0.5rem; background: var(--danger-50); border: 1px solid color-mix(in srgb, var(--danger) 32%, transparent); color: var(--danger-700); border-radius: 12px; padding: 0.7rem 0.9rem; font-size: 0.88rem; font-weight: 500; margin-bottom: 1.1rem; }
.sa-alert-success { background: var(--success-bg, #e8f7ef); border-color: color-mix(in srgb, var(--success) 32%, transparent); color: var(--success); }
.sa-link { color: #000; font-weight: 600; }

.field > label { font-size: 0.86rem; font-weight: 600; color: var(--text); margin-bottom: 0.4rem; display: block; }
.opt { color: rgba(0, 0, 0, 0.4); font-weight: 400; }
.field input { width: 100%; min-height: 50px; border: 1.5px solid var(--border); border-radius: 12px; background: var(--surface); padding: 0.65rem 0.95rem; font-size: 0.97rem; }
.field input:focus { outline: none; border-color: #000; box-shadow: 0 0 0 3.5px rgba(0, 0, 0, 0.08); }
.password-wrap { position: relative; }
.password-wrap input { padding-right: 3rem; }
.pw-toggle { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); width: 40px; height: 38px; border: 0; border-radius: 9px; background: transparent; color: var(--muted); display: inline-flex; align-items: center; justify-content: center; }
.pw-toggle:hover { background: var(--surface-2); color: #000; }
.terminal-picker { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
.terminal-option { display: flex; align-items: center; gap: 0.6rem; border: 1.5px solid var(--border); border-radius: 12px; padding: 0.7rem 0.85rem; font-size: 0.9rem; font-weight: 500; cursor: pointer; user-select: none; }
.terminal-option input { position: absolute; opacity: 0; min-height: 0; }
.to-box { width: 20px; height: 20px; flex-shrink: 0; border-radius: 6px; border: 1.5px solid var(--border); display: inline-flex; align-items: center; justify-content: center; color: transparent; font-size: 0.8rem; transition: all 0.15s ease; }
.terminal-option input:checked + .to-box, input:checked + .to-box { background: #000; border-color: #000; color: #fff; }
.vr-terms { display: flex; align-items: center; gap: 0.6rem; font-size: 0.9rem; color: rgba(0, 0, 0, 0.7); cursor: pointer; }
.vr-terms input { position: absolute; opacity: 0; min-height: 0; }
.vr-terms a { color: var(--brand-700); }

/* Review */
.review-panel .panel-hint { margin-bottom: 1.4rem; }
.review-group { border: 1px solid #ececec; border-radius: 14px; padding: 1.1rem 1.2rem; margin-bottom: 1rem; }
.review-group-title { font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: rgba(0, 0, 0, 0.45); margin-bottom: 0.6rem; }
.review-list { margin: 0; }
.review-item { display: flex; justify-content: space-between; gap: 1rem; padding: 0.45rem 0; }
.review-item:not(:last-child) { border-bottom: 1px dashed #ececec; }
.review-item dt { color: rgba(0, 0, 0, 0.5); font-weight: 500; font-size: 0.92rem; }
.review-item dd { margin: 0; font-weight: 600; font-size: 0.92rem; text-align: right; }
.review-note { display: flex; align-items: center; gap: 0.3rem; color: rgba(0, 0, 0, 0.5); font-size: 0.85rem; margin-bottom: 1.2rem; }

/* Nav buttons */
.step-nav { display: flex; justify-content: space-between; gap: 0.8rem; margin-top: 1.8rem; }
.step-btn { border-radius: 12px; font-weight: 700; min-width: 140px; }
.step-btn-primary { justify-content: center; }

.vr-footer { display: flex; justify-content: center; gap: 0.4rem; margin-top: 1.4rem; font-size: 0.9rem; color: rgba(0, 0, 0, 0.6); }

@media (max-width: 575.98px) {
  .terminal-picker { grid-template-columns: 1fr; }
  .step-label { display: none; }
}
</style>