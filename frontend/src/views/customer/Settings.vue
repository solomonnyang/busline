<template>
  <div class="py-2">
    <h5 class="fw-bold mb-4">Settings</h5>

    <div class="st-section-label">Preferences</div>
    <div class="card stat-card">
      <div class="st-row">
        <div class="st-row-ico"><i class="bi bi-bell"></i></div>
        <div class="st-row-body">
          <div class="st-row-label">Notifications</div>
          <div class="st-row-sub">Alerts for departures, delays and booking updates</div>
        </div>
        <div class="form-check form-switch st-switch">
          <input
            id="st-notif"
            class="form-check-input"
            type="checkbox"
            role="switch"
            :checked="notifications"
            :disabled="!loaded"
            @change="toggleNotifications($event.target.checked)"
          />
        </div>
      </div>
      <div class="st-row st-last">
        <div class="st-row-ico"><i class="bi bi-envelope"></i></div>
        <div class="st-row-body">
          <div class="st-row-label">Email receipts</div>
          <div class="st-row-sub">Send a receipt for every completed payment</div>
        </div>
        <div class="form-check form-switch st-switch">
          <input
            id="st-receipts"
            class="form-check-input"
            type="checkbox"
            role="switch"
            :checked="receipts"
            :disabled="!loaded"
            @change="toggleReceipts($event.target.checked)"
          />
        </div>
      </div>
    </div>

    <div class="st-section-label">Security</div>
    <TwoFactorSettings class="mb-2" />

    <div class="st-section-label">App</div>
    <div class="card stat-card">
      <div class="st-row">
        <div class="st-row-ico"><i class="bi bi-cash"></i></div>
        <div class="st-row-body">
          <div class="st-row-label">Currency</div>
          <div class="st-row-sub">Nigeria · Naira (₦)</div>
        </div>
        <i class="bi bi-check-circle-fill st-check"></i>
      </div>
      <button type="button" class="st-row st-btn st-last" @click="clearCache">
        <div class="st-row-ico"><i class="bi bi-trash"></i></div>
        <div class="st-row-body">
          <div class="st-row-label">Clear cache</div>
          <div class="st-row-sub">Reset preferences (keeps you signed in)</div>
        </div>
        <i class="bi bi-chevron-right st-open"></i>
      </button>
    </div>

    <div class="st-about">
      <div class="st-app-icon"><i class="bi bi-bus-front"></i></div>
      <div>
        <div class="st-app-name">BusLine</div>
        <div class="st-app-version">Version 1.0.0</div>
      </div>
    </div>

    <button class="st-logout" type="button" @click="onLogout">
      <i class="bi bi-box-arrow-right me-2"></i>Log out
    </button>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import TwoFactorSettings from '../../components/TwoFactorSettings.vue'

const NOTIF_KEY = 'busline.settings.notifications'
const RECEIPT_KEY = 'busline.settings.emailReceipts'
const CACHE_KEYS = [NOTIF_KEY, RECEIPT_KEY]

const router = useRouter()
const auth = useAuthStore()
const notifications = ref(true)
const receipts = ref(true)
const loaded = ref(false)

onMounted(() => {
  const storedNotif = localStorage.getItem(NOTIF_KEY)
  const storedReceipt = localStorage.getItem(RECEIPT_KEY)
  if (storedNotif != null) notifications.value = storedNotif === '1'
  if (storedReceipt != null) receipts.value = storedReceipt === '1'
  loaded.value = true
})

function persist(key, value) {
  try {
    localStorage.setItem(key, value ? '1' : '0')
  } catch {
    // ignore storage failures
  }
}

function toggleNotifications(value) {
  notifications.value = value
  persist(NOTIF_KEY, value)
}

function toggleReceipts(value) {
  receipts.value = value
  persist(RECEIPT_KEY, value)
}

function clearCache() {
  if (!window.confirm('Clear cache? This resets your app preferences. Your account stays signed in.')) return
  CACHE_KEYS.forEach((k) => localStorage.removeItem(k))
  notifications.value = true
  receipts.value = true
}

function onLogout() {
  if (!window.confirm('Are you sure you want to log out?')) return
  auth.logout()
  router.push('/')
}
</script>

<style scoped>
.st-section-label {
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 1.1rem 0 0.5rem;
  padding: 0 0.25rem;
}
.st-row {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.9rem 1rem;
  border-bottom: 1px solid var(--border);
}
.st-btn {
  width: 100%;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease;
}
.st-btn:hover { background: var(--brand-50); }
.st-last { border-bottom: 0; }
.st-row-ico {
  width: 40px;
  height: 40px;
  border-radius: 13px;
  background: var(--brand-100);
  color: var(--brand);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.st-row-body { flex: 1; min-width: 0; }
.st-row-label { font-size: 0.92rem; font-weight: 700; color: var(--text); }
.st-row-sub { font-size: 0.76rem; color: var(--muted); margin-top: 0.05rem; line-height: 1.35; }
.st-switch { margin: 0; }
.st-switch .form-check-input:checked { background-color: var(--brand); border-color: var(--brand); }
.st-check { color: var(--success); font-size: 1rem; }
.st-open { color: var(--muted); opacity: 0.7; font-size: 0.8rem; }
.st-about {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-top: 1.5rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  padding: 1rem;
}
.st-app-icon {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  background: var(--brand);
  color: #0f172a;
  display: grid;
  place-items: center;
  font-size: 1.2rem;
}
.st-app-name { font-size: 1rem; font-weight: 800; color: var(--text); }
.st-app-version { font-size: 0.76rem; color: var(--muted); }
.st-logout {
  margin-top: 1.5rem;
  width: 100%;
  border: 1px solid var(--danger);
  background: transparent;
  color: var(--danger);
  border-radius: var(--radius-md);
  font-weight: 800;
  font-size: 0.9rem;
  padding: 0.7rem 1rem;
  cursor: pointer;
  transition: all 0.15s ease;
}
.st-logout:hover { background: var(--danger); color: #fff; }
</style>
