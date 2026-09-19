<template>
  <div class="of-page">
    <header class="of-head">
      <h1 class="of-title">Offers &amp; Rewards</h1>
      <p class="of-sub">Earn points on every paid trip, redeem them for wallet credit and share your referral link.</p>
    </header>

    <LoadingSpinner :show="loading" />

    <template v-if="!loading">
      <!-- Balance + redeem -->
      <div class="of-grid">
        <section class="soft-card of-card of-balance">
          <span class="of-eyebrow"><i class="bi bi-stars me-1"></i>Loyalty balance</span>
          <div class="of-balance-num">{{ formatNumber(balance) }} <small>pts</small></div>
          <p class="of-muted small mb-3">Worth {{ currency }}{{ formatNumber(pointsValue) }} today. Redeem in multiples of {{ minPoints }} points.</p>

          <form class="of-redeem" @submit.prevent="redeem">
            <div class="input-group">
              <span class="input-group-text"><i class="bi bi-stars"></i></span>
              <input
                v-model.number="redeemPoints"
                type="number"
                class="form-control"
                :min="minPoints"
                :max="balance"
                :placeholder="`${minPoints} or more`"
                aria-label="Points to redeem"
              />
            </div>
            <button class="of-btn" type="submit" :disabled="redeeming || !redeemable">
              <span v-if="redeeming" class="spinner-border spinner-border-sm"></span>
              <template v-else>Redeem to wallet</template>
            </button>
          </form>
          <p v-if="redeemAmount > 0" class="of-redeem-hint">
            You'll receive {{ currency }}{{ formatNumber(redeemAmount) }} in your wallet.
          </p>
          <p v-if="redeemError" class="of-err"><i class="bi bi-exclamation-circle me-1"></i>{{ redeemError }}</p>
          <p v-if="redeemSuccess" class="of-ok"><i class="bi bi-check-circle-fill me-1"></i>{{ redeemSuccess }}</p>
        </section>

        <section class="soft-card of-card of-referral">
          <span class="of-eyebrow"><i class="bi bi-share-fill me-1"></i>Refer &amp; earn</span>
          <p class="of-muted small mb-2">Give friends a ride — earn {{ currency }}{{ formatNumber(referralValue) }} when they pay for their first trip.</p>
          <div class="of-code-row">
            <code class="of-code">{{ referralCode }}</code>
            <button class="of-copy" type="button" :title="copied ? 'Copied!' : 'Copy code'" @click="copyCode">
              <i :class="copied ? 'bi bi-check2' : 'bi bi-clipboard'"></i>
            </button>
          </div>
          <button class="of-btn of-btn-outline" type="button" @click="shareLink">
            <i class="bi bi-share me-2"></i>Share referral link
          </button>

          <div v-if="referrals.length" class="of-referrals">
            <div class="of-referrals-head">
              <span class="small fw-bold">Your referrals</span>
              <span class="small text-muted">{{ currency }}{{ formatNumber(commissionEarned) }} earned</span>
            </div>
            <div v-for="r in referrals" :key="r.id" class="of-referral-item">
              <span class="of-referral-name">{{ r.referred_name || 'A friend' }}</span>
              <span class="of-status" :class="r.status">
                {{ r.status === 'qualified' ? `Qualified · ${currency}${formatNumber(r.commission_amount)}` : 'Registered' }}
              </span>
            </div>
          </div>
        </section>
      </div>

      <!-- Rules -->
      <section class="soft-card of-card">
        <span class="of-eyebrow"><i class="bi bi-info-circle me-1"></i>How it works</span>
        <div class="of-rules">
          <div class="of-rule">
            <span class="of-rule-ico"><i class="bi bi-stars"></i></span>
            <div>
              <strong>Loyalty points</strong>
              <p class="small text-muted mb-0">Earn {{ rules.loyalty?.points_per_booking || 10 }} points per paid seat booking. Each point is worth {{ currency }}{{ rules.loyalty?.points_value_ngn || 1 }}.</p>
            </div>
          </div>
          <div class="of-rule">
            <span class="of-rule-ico"><i class="bi bi-sunrise-fill"></i></span>
            <div>
              <strong>Early bird discount</strong>
              <p class="small text-muted mb-0">Book at least {{ rules.early_bird?.days || 3 }} days before departure and get {{ rules.early_bird?.discount_percent || 15 }}% off automatically.</p>
            </div>
          </div>
          <div class="of-rule">
            <span class="of-rule-ico"><i class="bi bi-gift-fill"></i></span>
            <div>
              <strong>Referral commission</strong>
              <p class="small text-muted mb-0">Share your link — when a friend makes their first paid booking you earn {{ rules.referral?.commission_percent || 10 }}% of their fare.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- History -->
      <section class="soft-card of-card">
        <span class="of-eyebrow"><i class="bi bi-clock-history me-1"></i>Points history</span>
        <div v-if="history.length === 0" class="of-empty">
          <i class="bi bi-stars"></i>
          <p class="small mb-0">No points yet — book a trip to start earning.</p>
        </div>
        <div v-else class="of-history">
          <div v-for="h in history" :key="h.id" class="of-history-row">
            <span class="of-history-ico" :class="h.type"><i :class="h.type === 'earn' ? 'bi bi-plus-lg' : 'bi bi-dash-lg'"></i></span>
            <div class="of-history-body">
              <strong>{{ h.description }}</strong>
              <small>{{ formatDate(h.created_at) }}</small>
            </div>
            <span class="of-history-pts" :class="h.type">{{ h.points > 0 ? '+' : '' }}{{ h.points }}</span>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import api, { extractError } from '../../services/api'
import LoadingSpinner from '../../components/LoadingSpinner.vue'

const loading = ref(true)
const overview = ref(null)
const redeemPoints = ref(null)
const redeeming = ref(false)
const redeemError = ref('')
const redeemSuccess = ref('')
const copied = ref(false)
const currency = ref('₦')

const balance = computed(() => Number(overview.value?.balance ?? 0))
const history = computed(() => overview.value?.history || [])
const rules = computed(() => overview.value?.rules || {})
const referrals = computed(() => overview.value?.referrals || [])
const referralCode = computed(() => overview.value?.referral_code || '')
const referralLink = computed(() => overview.value?.referral_link || '')
const commissionEarned = computed(() => Number(overview.value?.commission_earned ?? 0))
const minPoints = computed(() => Number(rules.value?.loyalty?.min_points_redeem ?? 10))
const pointsValue = computed(() => Number(rules.value?.loyalty?.points_value_ngn ?? 1))
const referralValue = computed(() => Number(rules.value?.referral?.commission_percent ?? 10))

const redeemable = computed(() => {
  const p = Number(redeemPoints.value || 0)
  return p >= minPoints.value && p <= balance.value
})

const redeemAmount = computed(() =>
  redeemable.value ? Math.round(Number(redeemPoints.value) * pointsValue.value * 100) / 100 : 0
)

function formatNumber(v) {
  return Number(v || 0).toLocaleString()
}

function formatDate(v) {
  if (!v) return '—'
  const d = new Date(String(v).includes('T') ? v : String(v).replace(' ', 'T') + 'Z')
  if (isNaN(d)) return String(v)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/loyalty/overview')
    overview.value = data.data
  } catch (e) {
    redeemError.value = extractError(e).message
  } finally {
    loading.value = false
  }
}

async function redeem() {
  redeemError.value = ''
  redeemSuccess.value = ''
  if (!redeemable.value) return
  redeeming.value = true
  try {
    const { data } = await api.post('/loyalty/redeem', { points: Number(redeemPoints.value) })
    redeemSuccess.value = `${data.message || 'Points redeemed.'}`
    redeemPoints.value = null
    overview.value.balance = data.data.balance
    overview.value.history = [
      {
        id: `new-${Date.now()}`,
        description: `Redeemed ${data.data.redeemed_points} points for ${currency.value}${formatNumber(data.data.amount)}`,
        points: -Number(data.data.redeemed_points),
        type: 'redeem',
        created_at: new Date().toISOString(),
      },
      ...history.value,
    ]
  } catch (e) {
    redeemError.value = extractError(e).message
  } finally {
    redeeming.value = false
  }
}

async function copyCode() {
  try {
    await navigator.clipboard.writeText(referralCode.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    redeemError.value = 'Could not copy. Share the link below instead.'
  }
}

async function shareLink() {
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Join me on BusLine',
        text: `Travel with me on BusLine and get rewarded! Use my referral code ${referralCode.value}.`,
        url: referralLink.value,
      })
    } catch {
      // user dismissed the share sheet
    }
  } else {
    try {
      await navigator.clipboard.writeText(referralLink.value)
      redeemSuccess.value = 'Referral link copied to clipboard!'
    } catch {
      window.open(referralLink.value, '_blank', 'noopener')
    }
  }
}

onMounted(load)
</script>

<style scoped>
.of-page { max-width: 860px; margin: 0 auto; }
.of-head { margin-bottom: 1.25rem; }
.of-title { font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: clamp(1.4rem, 3vw, 1.8rem); color: var(--text); margin-bottom: 0.25rem; letter-spacing: -0.02em; }
.of-sub { color: var(--muted); font-size: 0.92rem; margin: 0; }

.of-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.1rem; margin-bottom: 1.1rem; }
.of-card { padding: 1.35rem 1.4rem; }
.of-eyebrow {
  display: inline-flex;
  align-items: center;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--brand-700);
  background: var(--brand-50);
  border-radius: var(--pill);
  padding: 0.25rem 0.7rem;
  margin-bottom: 0.85rem;
}
.of-balance-num { font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 2.4rem; line-height: 1; color: var(--text); }
.of-balance-num small { font-size: 0.9rem; color: var(--muted); font-weight: 600; }
.of-muted { color: var(--muted); }
.of-redeem { display: flex; gap: 0.55rem; }
.of-redeem .input-group { flex: 1; }
.of-redeem .input-group-text { background: var(--surface-2); color: var(--brand); border-color: var(--border); }
.of-redeem-hint { margin: 0.6rem 0 0; font-size: 0.8rem; font-weight: 600; color: var(--brand-700); }
.of-btn {
  border: 0;
  border-radius: var(--radius);
  padding: 0.6rem 1.1rem;
  font-weight: 800;
  font-size: 0.88rem;
  color: #fff;
  background: linear-gradient(135deg, var(--brand), var(--brand-700));
  box-shadow: var(--shadow-brand);
  transition: all 0.15s ease;
  white-space: nowrap;
}
.of-btn:hover:not(:disabled) { filter: brightness(1.05); }
.of-btn:disabled { opacity: 0.6; cursor: not-allowed; box-shadow: none; }
.of-btn-outline { background: var(--brand-50); color: var(--brand-700); box-shadow: none; border: 1px solid var(--brand); }
.of-btn-outline:hover { background: var(--brand); color: #fff; }
.of-code-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.7rem;
}
.of-code {
  flex: 1;
  font-size: 0.95rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--brand-700);
  background: var(--surface-2);
  border: 1px dashed var(--brand);
  border-radius: var(--radius);
  padding: 0.6rem 0.8rem;
  text-align: center;
}
.of-copy {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  display: grid;
  place-items: center;
}
.of-copy:hover { border-color: var(--brand); color: var(--brand); }
.of-referrals { margin-top: 0.9rem; border-top: 1px dashed var(--border); padding-top: 0.7rem; }
.of-referrals-head { display: flex; justify-content: space-between; margin-bottom: 0.5rem; }
.of-referral-item { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; padding: 0.4rem 0; border-bottom: 1px solid var(--border); }
.of-referral-item:last-child { border-bottom: 0; }
.of-referral-name { font-weight: 600; font-size: 0.85rem; color: var(--text); }
.of-status { font-size: 0.72rem; font-weight: 700; border-radius: var(--pill); padding: 0.2rem 0.6rem; white-space: nowrap; }
.of-status.registered { background: var(--surface-2); color: var(--muted); }
.of-status.qualified { background: var(--success-50, #E7F5EC); color: var(--success-700, #15803d); }

.of-rules { display: grid; gap: 0.85rem; }
.of-rule { display: flex; gap: 0.8rem; align-items: flex-start; }
.of-rule-ico {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 12px;
  background: var(--brand-50);
  color: var(--brand);
  display: grid;
  place-items: center;
  font-size: 1.05rem;
}
.of-rule strong { color: var(--text); font-size: 0.9rem; }

.of-empty { text-align: center; color: var(--muted); padding: 1rem 0; }
.of-empty i { font-size: 1.8rem; color: var(--brand-100); }
.of-history { display: flex; flex-direction: column; }
.of-history-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--border);
}
.of-history-row:last-child { border-bottom: 0; }
.of-history-ico {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 11px;
  display: grid;
  place-items: center;
  font-weight: 800;
}
.of-history-ico.earn { background: var(--success-50, #E7F5EC); color: var(--success-700, #15803d); }
.of-history-ico.redeem { background: var(--brand-50); color: var(--brand-700); }
.of-history-body { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.of-history-body strong { font-size: 0.84rem; color: var(--text); }
.of-history-body small { font-size: 0.72rem; color: var(--muted); }
.of-history-pts { font-weight: 800; font-size: 0.9rem; }
.of-history-pts.earn { color: var(--success-700, #15803d); }
.of-history-pts.redeem { color: var(--brand-700); }

.of-err { color: var(--danger-700); font-size: 0.8rem; margin: 0.55rem 0 0; }
.of-ok { color: var(--success-700, #15803d); font-size: 0.8rem; margin: 0.55rem 0 0; font-weight: 600; }

@media (max-width: 720px) {
  .of-grid { grid-template-columns: 1fr; }
}
</style>
