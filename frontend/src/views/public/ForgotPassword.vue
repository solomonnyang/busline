<template>
  <section class="fp-wrap">
    <div class="container">
      <div class="fp-card">
        <div class="fp-brand">
          <router-link to="/" class="fp-logo">
            <span class="fp-logo-mark"><i class="bi bi-bus-front-fill"></i></span>
            <span class="fp-logo-text">Bus<span class="fp-brand-accent">Line</span></span>
          </router-link>
        </div>

        <h1 class="fp-title">Forgot your password?</h1>
        <p class="fp-subtitle">No worries — we'll email you a secure link to reset it.</p>

        <div v-if="error" class="fp-alert" role="alert" tabindex="-1" ref="alertEl">
          <i class="bi bi-exclamation-triangle-fill"></i><span>{{ error }}</span>
        </div>

        <!-- Step 1: request link -->
        <form v-if="!sent" novalidate @submit.prevent="submit">
          <div class="field mb-4">
            <label for="fp-email">Email address</label>
            <input
              id="fp-email"
              ref="emailEl"
              v-model.trim="form.email"
              type="email"
              placeholder="you@example.com"
              autocomplete="email"
              inputmode="email"
              :class="{ 'is-invalid': touched && fieldErrors.email }"
              :aria-invalid="touched && fieldErrors.email ? 'true' : undefined"
              aria-describedby="fp-email-error"
              @blur="touched = true"
              required
            />
            <p v-if="touched && fieldErrors.email" id="fp-email-error" class="field-error">
              <i class="bi bi-x-circle-fill"></i>{{ fieldErrors.email }}
            </p>
          </div>

          <button class="fp-submit" type="submit" :disabled="submitting">
            <span v-if="submitting" class="spinner-border spinner-border-sm me-2"></span>
            <template v-if="submitting">Sending link…</template>
            <template v-else>Send reset link<i class="bi bi-arrow-right ms-1"></i></template>
          </button>
        </form>

        <!-- Step 2: confirmation -->
        <div v-else class="fp-confirm">
          <div class="fp-sent">
            <span class="fp-sent-icon"><i class="bi bi-envelope-check"></i></span>
            <h2 class="fp-sent-title">Check your inbox</h2>
            <p class="fp-sent-text">
              If an account exists for <strong>{{ form.email }}</strong>, a password reset link is on its way.
            </p>
            <span class="fp-sent-meta"><i class="bi bi-clock"></i>The link expires in 1 hour</span>
          </div>

          <div class="fp-confirm-actions">
            <button class="fp-submit fp-submit-ghost" type="button" :disabled="resending" @click="resend">
              <span v-if="resending" class="spinner-border spinner-border-sm me-2"></span>
              {{ resending ? 'Resending…' : 'Resend link' }}
            </button>
            <router-link to="/vendor-login" class="fp-submit fp-submit-primary">Back to sign in</router-link>
          </div>

          <p v-if="resentNote" class="fp-resent-note" role="status">
            <i class="bi bi-check-circle"></i>{{ resentNote }}
          </p>
        </div>

        <div class="fp-footer">
          <span>Remembered your password?</span>
          <router-link to="/vendor-login" class="fp-link">Back to sign in</router-link>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { extractError } from '../../services/api'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()

const form = reactive({ email: '' })
const touched = ref(false)
const error = ref('')
const submitting = ref(false)
const resending = ref(false)
const sent = ref(false)
const resentNote = ref('')

const emailEl = ref(null)
const alertEl = ref(null)

const fieldErrors = computed(() => {
  const e = {}
  if (!form.email) e.email = 'Email address is required.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address.'
  return e
})

watch(error, async (val) => {
  if (val) {
    await nextTick()
    alertEl.value?.focus({ preventScroll: true })
  }
})

async function submit() {
  touched.value = true
  error.value = ''
  if (fieldErrors.value.email) {
    emailEl.value?.focus()
    return
  }
  submitting.value = true
  try {
    await auth.forgotPassword(form.email)
    sent.value = true
  } catch (e) {
    error.value = extractError(e).message
  } finally {
    submitting.value = false
  }
}

async function resend() {
  resending.value = true
  resentNote.value = ''
  try {
    await auth.forgotPassword(form.email)
    resentNote.value = 'Reset link sent again — check your inbox.'
  } catch (e) {
    sent.value = false
    error.value = extractError(e).message
  } finally {
    resending.value = false
  }
}
</script>

<style scoped>
.fp-wrap { padding: 4rem 1.25rem 5rem; background: #fff; }
.fp-card {
  max-width: 28rem;
  margin: 0 auto;
  border: 1px solid #ececec;
  border-radius: 20px;
  padding: 2.5rem 2rem;
  background: #fff;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.06);
}
.fp-brand { margin-bottom: 1.5rem; }
.fp-logo { display: inline-flex; align-items: center; gap: 0.6rem; text-decoration: none; }
.fp-logo-mark { width: 42px; height: 42px; border-radius: 12px; background: #000; color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 1.15rem; }
.fp-logo-text { font-weight: 800; font-size: 1.3rem; color: #000; }
.fp-brand-accent { color: #000; }

.fp-title { font-size: 1.8rem; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 0.3rem; }
.fp-subtitle { color: rgba(0, 0, 0, 0.62); margin-bottom: 1.8rem; }

.fp-alert {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
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

.field > label { font-size: 0.86rem; font-weight: 600; color: var(--text); margin-bottom: 0.4rem; display: block; }
.field input {
  width: 100%;
  min-height: 50px;
  border: 1.5px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  padding: 0.65rem 0.95rem;
  font-size: 0.97rem;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.field input:focus { outline: none; border-color: #000; box-shadow: 0 0 0 3.5px rgba(0, 0, 0, 0.08); }
.field input.is-invalid { border-color: var(--danger); background: var(--danger-50); }
.field-error { display: flex; align-items: center; gap: 0.35rem; color: var(--danger-700); font-size: 0.8rem; font-weight: 600; margin: 0.4rem 0 0; }
.field-error i { font-size: 0.72rem; }

.fp-submit {
  width: 100%;
  min-height: 50px;
  border: 0;
  border-radius: 12px;
  background: #000;
  color: #fff;
  font-size: 0.98rem;
  font-weight: 700;
  cursor: pointer;
  padding: 0.65rem 1.1rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease;
}
.fp-submit:hover:not(:disabled) { background: #262626; }
.fp-submit:disabled { opacity: 0.7; cursor: not-allowed; }
.fp-submit-ghost {
  background: #fff;
  color: #111;
  border: 1.5px solid #e0e0e0;
}
.fp-submit-ghost:hover:not(:disabled) { background: #f7f7f7; }
.fp-submit-primary { text-decoration: none; }

/* Confirmation */
.fp-confirm { animation: fpFade 0.25s ease; }
.fp-sent {
  border: 1px solid #ececec;
  border-radius: 14px;
  background: #fff;
  padding: 1.8rem 1.5rem;
  text-align: center;
  margin-bottom: 0.9rem;
}
.fp-sent-icon {
  width: 58px;
  height: 58px;
  border-radius: 16px;
  background: #000;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  margin-bottom: 0.9rem;
}
.fp-sent-title { font-size: 1.15rem; font-weight: 800; color: #000; margin-bottom: 0.4rem; }
.fp-sent-text { color: rgba(0, 0, 0, 0.62); font-size: 0.92rem; margin: 0 0 0.8rem; }
.fp-sent-text strong { color: #111; }
.fp-sent-meta { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.84rem; font-weight: 600; color: rgba(0, 0, 0, 0.5); }
.fp-confirm-actions { display: grid; gap: 0.6rem; margin-top: 1rem; }
.fp-resent-note { display: flex; align-items: center; justify-content: center; gap: 0.4rem; color: var(--success-700); font-weight: 600; font-size: 0.88rem; margin: 1rem 0 0; }

.fp-footer { display: flex; justify-content: center; gap: 0.4rem; margin-top: 1.4rem; font-size: 0.9rem; color: rgba(0, 0, 0, 0.6); }
.fp-link { color: #000; font-weight: 600; text-decoration: none; }
.fp-link:hover { text-decoration: underline; }

@keyframes fpFade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .fp-confirm { animation: none; } }
</style>
