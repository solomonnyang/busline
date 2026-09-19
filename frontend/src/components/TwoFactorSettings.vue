<template>
  <div class="soft-card p-4 h-100">
    <div class="d-flex align-items-center gap-3 mb-3">
      <div class="stat-ico" :style="{ background: 'var(--brand-50)', color: 'var(--brand-700)' }">
        <i class="bi bi-shield-lock"></i>
      </div>
      <div>
        <h6 class="fw-bold mb-0">Two-factor authentication</h6>
        <div class="text-muted small">Protect your account with Google Authenticator</div>
      </div>
      <span
        v-if="loaded"
        class="ms-auto badge rounded-pill px-3"
        :class="enabled ? 'bg-success' : 'bg-secondary'"
      >
        {{ enabled ? 'On' : 'Off' }}
      </span>
    </div>

    <LoadingSpinner :show="loading" />

    <div v-if="error" class="alert alert-danger py-2 small">{{ error }}</div>
    <div v-if="message" class="alert alert-success py-2 small">
      <i class="bi bi-check-circle me-1"></i>{{ message }}
    </div>

    <!-- ============ Disabled: setup flow ============ -->
    <div v-if="loaded && !enabled && !setup">
      <p class="text-muted small mb-3">
        Add an extra layer of security. After enabling, you'll need a verification code from the
        Google Authenticator app to sign in.
      </p>
      <button class="btn btn-primary" :disabled="busy" @click="startSetup">
        <i class="bi bi-qr-code me-2"></i>Set up authenticator app
      </button>
    </div>

    <div v-else-if="loaded && !enabled && setup">
      <div class="text-center mb-3">
        <img :src="setup.qr_data_uri" alt="Scan this QR code" class="tfa-qr" />
      </div>
      <p class="text-muted small mb-2 text-center">
        Scan the QR code with <strong>Google Authenticator</strong>, or enter this key manually:
      </p>
      <div class="tfa-secret mb-3">
        <code>{{ setup.secret }}</code>
        <button class="btn btn-sm btn-ghost" type="button" title="Copy secret" @click="copySecret">
          <i class="bi bi-clipboard"></i>
        </button>
      </div>
      <form @submit.prevent="confirmEnable">
        <div class="mb-3">
          <label class="form-label">6-digit code from the app</label>
          <input
            v-model="form.code"
            class="form-control text-center tracking-wide"
            placeholder="••••••"
            inputmode="numeric"
            maxlength="6"
            required
          />
        </div>
        <div class="mb-3">
          <label class="form-label">Your password</label>
          <input v-model="form.password" type="password" class="form-control" placeholder="Confirm with your password" required />
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-primary flex-fill" :disabled="busy">
            <span v-if="busy" class="spinner-border spinner-border-sm"></span>
            <span v-else><i class="bi bi-shield-check me-1"></i>Enable 2FA</span>
          </button>
          <button class="btn btn-light" type="button" :disabled="busy" @click="cancelSetup">Cancel</button>
        </div>
      </form>
    </div>

    <!-- ============ Enabled: manage flow ============ -->
    <div v-else-if="loaded && enabled">
      <p class="text-muted small mb-3">
        Two-factor authentication is active for your account. Save your backup codes in a safe
        place — each code can be used once to sign in if you lose your phone.
      </p>

      <div class="d-flex flex-wrap gap-2 mb-3">
        <button class="btn btn-outline-primary" :disabled="busy" @click="regenerate">
          <i class="bi bi-arrow-repeat me-1"></i>New backup codes
          <span class="badge bg-brand-50 ms-1">{{ backupCodesLeft }} left</span>
        </button>
        <button class="btn btn-outline-danger" :disabled="busy" @click="startDisable">
          <i class="bi bi-shield-slash me-1"></i>Disable 2FA
        </button>
      </div>

      <form v-if="showDisable" class="tfa-box p-3 mb-2" @submit.prevent="confirmDisable">
        <div class="row g-2 align-items-end">
          <div class="col-md-4">
            <label class="form-label small mb-1">Current code</label>
            <input v-model="form.code" class="form-control" placeholder="••••••" inputmode="numeric" maxlength="6" required />
          </div>
          <div class="col-md-5">
            <label class="form-label small mb-1">Password</label>
            <input v-model="form.password" type="password" class="form-control" placeholder="Confirm your password" required />
          </div>
          <div class="col-md-3 d-flex gap-2">
            <button class="btn btn-danger flex-fill" :disabled="busy">Disable</button>
            <button class="btn btn-light" type="button" @click="showDisable = false">Cancel</button>
          </div>
        </div>
      </form>
    </div>

    <!-- ============ Backup codes (one-time display) ============ -->
    <div v-if="backupCodes.length" class="tfa-box p-3 mt-2 fade-in">
      <div class="alert alert-warning py-2 small mb-2">
        <i class="bi bi-exclamation-triangle me-1"></i>
        Save these codes now. They won't be shown again.
      </div>
      <div class="tfa-codes">
        <code v-for="c in backupCodes" :key="c">{{ c }}</code>
      </div>
      <button class="btn btn-sm btn-primary mt-2" type="button" @click="dismissCodes">
        <i class="bi bi-check2 me-1"></i>I've saved these codes
      </button>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import api, { extractError } from '../services/api'
import LoadingSpinner from './LoadingSpinner.vue'

const auth = useAuthStore()

const loading = ref(true)
const busy = ref(false)
const loaded = ref(false)
const enabled = ref(false)
const backupCodesLeft = ref(0)
const setup = ref(null)
const backupCodes = ref([])
const showDisable = ref(false)
const error = ref('')
const message = ref('')

const form = reactive({ code: '', password: '' })

async function refreshStatus() {
  const { data } = await api.get('/2fa')
  enabled.value = !!data.data.enabled
  backupCodesLeft.value = data.data.backup_codes_left || 0
  loaded.value = true
}

onMounted(async () => {
  try {
    await refreshStatus()
  } catch (e) {
    error.value = extractError(e).message
    loaded.value = true
  } finally {
    loading.value = false
  }
})

async function startSetup() {
  error.value = ''
  message.value = ''
  busy.value = true
  try {
    const { data } = await api.post('/2fa/setup')
    setup.value = data.data
  } catch (e) {
    error.value = extractError(e).message
  } finally {
    busy.value = false
  }
}

function cancelSetup() {
  setup.value = null
  form.code = ''
  form.password = ''
}

function copySecret() {
  if (!setup.value?.secret) return
  try {
    navigator.clipboard?.writeText(setup.value.secret)
    message.value = 'Secret copied.'
  } catch {
    // ignore
  }
}

async function confirmEnable() {
  error.value = ''
  message.value = ''
  busy.value = true
  try {
    const { data } = await api.post('/2fa/enable', { code: form.code.trim(), password: form.password })
    backupCodes.value = data.data.backup_codes || []
    enabled.value = true
    backupCodesLeft.value = backupCodes.value.length
    setup.value = null
    form.code = ''
    form.password = ''
    message.value = 'Two-factor authentication enabled.'
    await auth.fetchProfile()
  } catch (e) {
    error.value = extractError(e).message
  } finally {
    busy.value = false
  }
}

async function regenerate() {
  error.value = ''
  message.value = ''
  const password = window.prompt('Enter your password to generate new backup codes.')
  if (!password) return
  busy.value = true
  try {
    const { data } = await api.post('/2fa/backup-codes', { password })
    backupCodes.value = data.data.backup_codes || []
    backupCodesLeft.value = backupCodes.value.length
    message.value = 'New backup codes generated.'
  } catch (e) {
    error.value = extractError(e).message
  } finally {
    busy.value = false
  }
}

function startDisable() {
  showDisable.value = true
  form.code = ''
  form.password = ''
}

async function confirmDisable() {
  error.value = ''
  message.value = ''
  busy.value = true
  try {
    const { data } = await api.post('/2fa/disable', { code: form.code.trim(), password: form.password })
    enabled.value = !!data.data.enabled
    backupCodesLeft.value = 0
    showDisable.value = false
    backupCodes.value = []
    message.value = 'Two-factor authentication disabled.'
    await auth.fetchProfile()
  } catch (e) {
    error.value = extractError(e).message
  } finally {
    busy.value = false
  }
}

function dismissCodes() {
  backupCodes.value = []
  message.value = ''
}
</script>

<style scoped>
.tfa-qr {
  width: 180px;
  height: 180px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  padding: 8px;
  background: #fff;
}
.tfa-secret {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: var(--surface);
  border: 1px dashed var(--border);
  border-radius: var(--radius-md);
  padding: 0.6rem 0.8rem;
}
.tfa-secret code { font-size: 0.85rem; letter-spacing: 0.08em; color: var(--text); }
.tfa-box {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}
.tfa-codes {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 0.5rem;
}
.tfa-codes code {
  background: var(--surface-alt, var(--muted-50));
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0.5rem;
  text-align: center;
  letter-spacing: 0.1em;
  font-size: 0.8rem;
}
.tracking-wide { letter-spacing: 0.4em; text-align: center; }
</style>
