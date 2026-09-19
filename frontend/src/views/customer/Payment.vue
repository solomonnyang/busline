<template>
  <div class="py-2">
    <h5 class="fw-bold mb-4">Payment</h5>

    <LoadingSpinner :show="loading" />

    <div v-if="message" class="alert alert-success py-2 small">{{ message }}</div>
    <div v-if="pageError" class="alert alert-danger py-2 small">{{ pageError }}</div>

    <div v-if="!loading" class="pay-card">
      <div class="pay-top">
        <div class="pay-wallet-ico"><i class="bi bi-wallet2"></i></div>
        <div class="pay-balance-body">
          <div class="pay-label">Wallet balance</div>
          <div class="pay-value">{{ currency }}{{ formatPrice(wallet?.wallet?.balance) }}</div>
        </div>
        <button class="pay-topup-btn" type="button" :class="{ open: topupOpen }" @click="toggleTopup">
          <i :class="topupOpen ? 'bi bi-x-lg' : 'bi bi-plus-lg'"></i>{{ topupOpen ? 'Close' : 'Top up' }}
        </button>
      </div>

      <div v-if="topupOpen" class="pay-panel">
        <div class="pay-panel-title">How much do you want to add?</div>
        <div class="pay-presets">
          <button
            v-for="value in TOPUP_PRESETS"
            :key="value"
            type="button"
            class="pay-chip"
            :class="{ active: selectedAmount === value }"
            @click="preset(value)"
          >
            {{ currency }}{{ formatPrice(value) }}
          </button>
        </div>
        <div class="pay-custom">
          <span class="pay-custom-prefix">{{ currency }}</span>
          <input
            v-model="customAmount"
            type="text"
            inputmode="numeric"
            class="pay-custom-input"
            placeholder="Custom amount"
            aria-label="Custom amount"
            @input="onCustomInput"
          />
        </div>
        <div v-if="topupError" class="pay-error">{{ topupError }}</div>
        <button class="pay-go" type="button" :disabled="topupBusy" @click="startTopup">
          <span v-if="topupBusy" class="spinner-border spinner-border-sm"></span>
          <span v-else>
            <i class="bi bi-lock me-1"></i>Pay {{ selectedAmount ? `${currency}${formatPrice(selectedAmount)}` : '' }}
          </span>
        </button>
        <div class="pay-hint">Secure in-app payment via Paystack. Min ₦100.</div>
      </div>

      <div class="pay-activity">
        <div class="pay-activity-title">Wallet activity</div>
        <div v-if="transactions.length === 0" class="pay-empty">No activity yet. Top up to get started.</div>
        <div v-for="tx in transactions" :key="tx.id" class="pay-tx">
          <div class="pay-tx-ico" :class="tx.type === 'credit' ? 'is-credit' : 'is-debit'">
            <i :class="tx.type === 'credit' ? 'bi bi-arrow-down' : 'bi bi-arrow-up'"></i>
          </div>
          <div class="pay-tx-body">
            <div class="pay-tx-desc">{{ tx.description || 'Wallet transaction' }}</div>
            <div class="pay-tx-date">{{ formatDateTime(tx.paid_at || tx.created_at) }}</div>
          </div>
          <div class="pay-tx-right">
            <div class="pay-tx-amount" :class="tx.type === 'credit' ? 'is-credit' : 'is-debit'">
              {{ tx.type === 'credit' ? '+' : '−' }}{{ currency }}{{ formatPrice(tx.amount) }}
            </div>
            <StatusBadge :status="tx.status" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import api, { extractError } from '../../services/api'
import LoadingSpinner from '../../components/LoadingSpinner.vue'
import StatusBadge from '../../components/StatusBadge.vue'

const route = useRoute()
const loading = ref(true)
const wallet = ref(null)
const pageError = ref('')
const message = ref('')
const topupOpen = ref(false)
const topupAmount = ref(null)
const customAmount = ref('')
const topupBusy = ref(false)
const topupError = ref('')
const currency = ref('₦')

const TOPUP_PRESETS = [1000, 2000, 5000, 10000]

const selectedAmount = computed(() => (customAmount ? Number(customAmount) : topupAmount.value || 0))
const transactions = computed(() => wallet.value?.transactions || [])

function preset(value) {
  topupAmount.value = value
  customAmount.value = ''
}

function onCustomInput(e) {
  customAmount.value = e.target.value.replace(/[^0-9]/g, '')
  if (e.target.value) topupAmount.value = null
}

function toggleTopup() {
  topupOpen.value = !topupOpen.value
  topupError.value = ''
}

async function loadWallet() {
  try {
    const { data } = await api.get('/wallet')
    wallet.value = data.data
  } catch (e) {
    pageError.value = extractError(e).message
  }
}

async function verifyIfReturning() {
  const reference = route.query.reference || route.query.trxref
  if (!reference) return
  try {
    await api.post('/wallet/topup/verify', { reference })
    message.value = 'Your wallet has been topped up successfully.'
  } catch (e) {
    pageError.value = extractError(e).message
  }
}

async function startTopup() {
  topupError.value = ''
  if (!selectedAmount.value || selectedAmount.value < 100) {
    topupError.value = 'Enter an amount of at least ₦100.'
    return
  }
  topupBusy.value = true
  try {
    const callbackUrl = `${window.location.origin}/customer/payment`
    const { data } = await api.post('/wallet/topup', { amount: selectedAmount.value, callback_url: callbackUrl })
    if (data.data?.authorization_url) {
      window.location.href = data.data.authorization_url
      return
    }
    topupError.value = 'Payment link unavailable. Please try again.'
  } catch (e) {
    topupError.value = extractError(e).message
  } finally {
    topupBusy.value = false
  }
}

function formatPrice(v) {
  return Number(v || 0).toLocaleString()
}

function formatDateTime(v) {
  if (!v) return '—'
  const d = new Date(String(v).replace(' ', 'T') + 'Z')
  if (isNaN(d)) return String(v)
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

onMounted(async () => {
  await verifyIfReturning()
  await loadWallet()
  loading.value = false
})
</script>

<style scoped>
.pay-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1.25rem;
  box-shadow: var(--shadow-sm);
}
.pay-top {
  display: flex;
  align-items: center;
  gap: 0.9rem;
}
.pay-wallet-ico {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  background: var(--brand-100);
  color: var(--brand);
  display: grid;
  place-items: center;
  font-size: 1.4rem;
  flex-shrink: 0;
}
.pay-balance-body { flex: 1; min-width: 0; }
.pay-label { font-size: 0.72rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; }
.pay-value { font-family: var(--font-display); font-size: 1.6rem; font-weight: 800; color: var(--text); line-height: 1.2; }
.pay-topup-btn {
  border: 0;
  border-radius: var(--radius-sm);
  background: var(--brand);
  color: #0f172a;
  font-weight: 800;
  font-size: 0.82rem;
  padding: 0.5rem 0.9rem;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  cursor: pointer;
  transition: all 0.15s ease;
}
.pay-topup-btn.open { background: var(--danger); color: #fff; }
.pay-panel {
  margin-top: 1rem;
  padding: 1rem;
  border: 1px dashed var(--border);
  border-radius: var(--radius-md);
  background: var(--surface-alt);
}
.pay-panel-title { font-size: 0.85rem; font-weight: 700; color: var(--text); margin-bottom: 0.7rem; }
.pay-presets { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.pay-chip {
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: 999px;
  padding: 0.45rem 0.95rem;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text);
  cursor: pointer;
  transition: all 0.15s ease;
}
.pay-chip.active { background: var(--brand); border-color: var(--brand); color: #0f172a; }
.pay-custom {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin: 0.75rem 0;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  padding: 0 0.7rem;
}
.pay-custom-prefix { color: var(--muted); font-weight: 700; }
.pay-custom-input {
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  padding: 0.6rem 0;
  font-size: 0.95rem;
  color: var(--text);
}
.pay-custom-input:focus { border: 0; box-shadow: none; }
.pay-error { color: var(--danger); font-size: 0.78rem; margin: 0.3rem 0 0.6rem; }
.pay-go {
  border: 0;
  border-radius: var(--radius-sm);
  background: var(--brand);
  color: #0f172a;
  font-weight: 800;
  font-size: 0.9rem;
  padding: 0.7rem 1rem;
  width: 100%;
  cursor: pointer;
  transition: all 0.15s ease;
}
.pay-go:hover:not(:disabled) { transform: translateY(-1px); }
.pay-go:disabled { opacity: 0.6; cursor: not-allowed; }
.pay-hint { font-size: 0.72rem; color: var(--muted); text-align: center; margin-top: 0.6rem; }
.pay-activity { margin-top: 1.25rem; }
.pay-activity-title {
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
  margin-bottom: 0.6rem;
}
.pay-empty { font-size: 0.85rem; color: var(--muted); padding: 0.5rem 0; }
.pay-tx {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.7rem 0;
  border-top: 1px solid var(--border);
}
.pay-tx-ico {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.pay-tx-ico.is-credit { background: var(--success-50); color: var(--success-700); }
.pay-tx-ico.is-debit { background: var(--danger-50); color: var(--danger-700); }
.pay-tx-body { flex: 1; min-width: 0; }
.pay-tx-desc { font-size: 0.86rem; font-weight: 600; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pay-tx-date { font-size: 0.74rem; color: var(--muted); }
.pay-tx-right { display: flex; flex-direction: column; align-items: flex-end; gap: 0.2rem; }
.pay-tx-amount { font-weight: 800; font-size: 0.88rem; }
.pay-tx-amount.is-credit { color: var(--success-700); }
.pay-tx-amount.is-debit { color: var(--danger-700); }
</style>
