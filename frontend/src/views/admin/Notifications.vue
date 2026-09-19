<template>
  <div>
    <!-- ================= HEADER ================= -->
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4 fade-up">
      <div>
        <div class="section-eyebrow"><i class="bi bi-bell"></i>Communication</div>
        <h4 class="fw-bold mb-0">Push Notifications</h4>
      </div>
    </div>

    <div class="row g-4">
      <!-- ================= COMPOSE ================= -->
      <div class="col-lg-7">
        <div class="soft-card fade-up">
          <div class="d-flex align-items-center gap-2 mb-3">
            <div class="stat-ico" style="width: 40px; height: 40px; font-size: 1.15rem; background: var(--brand-50); color: var(--brand-700)">
              <i class="bi bi-send"></i>
            </div>
            <div>
              <h6 class="fw-bold mb-0">Compose &amp; send</h6>
              <span class="text-muted small">Deliver a push notification and mirror it into users' in-app inboxes.</span>
            </div>
          </div>

          <div v-if="formError" class="alert alert-danger py-2 small">{{ formError }}</div>
          <div v-if="successMessage" class="alert alert-success py-2 small">
            <i class="bi bi-check-circle me-1"></i>{{ successMessage }}
          </div>

          <div class="mb-3">
            <label class="form-label">
              Audience
              <span class="badge bg-brand-soft text-brand ms-1">{{ audienceLabel }}</span>
            </label>
            <select v-model="form.audience" class="form-select">
              <option value="all_customers">All customers</option>
              <option value="all_vendors">All vendors</option>
              <option value="all_users">All users (customers + vendors + staff)</option>
              <option value="specific_users">Specific users…</option>
            </select>
          </div>

          <div v-if="form.audience === 'specific_users'" class="mb-3">
            <label class="form-label">Select users</label>
            <div class="chips-wrap mb-2">
              <span
                v-for="u in selectedUsers"
                :key="u.id"
                class="chip"
              >
                {{ u.name }}
                <button type="button" class="chip-x" @click="toggleUser(u)">&times;</button>
              </span>
              <span v-if="selectedUsers.length === 0" class="text-muted small">No users selected yet.</span>
            </div>
            <input
              v-model="userSearch"
              class="form-control mb-2"
              placeholder="Search users by name or email…"
              @input="searchUsers"
            />
            <div v-if="userSuggestions.length" class="suggestion-drop">
              <button
                v-for="u in userSuggestions"
                :key="u.id"
                type="button"
                class="suggestion-item"
                @mousedown.prevent="toggleUser(u)"
              >
                <span class="fw-semibold small">{{ u.name }}</span>
                <span class="text-muted small text-truncate">{{ u.email }} · {{ u.role_name }}</span>
              </button>
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label">Title</label>
            <input v-model="form.title" class="form-control" maxlength="150" placeholder="e.g. New routes this weekend" />
          </div>

          <div class="mb-3">
            <label class="form-label">Message</label>
            <textarea
              v-model="form.message"
              class="form-control"
              rows="4"
              maxlength="1000"
              placeholder="Write the message users will receive…"
            ></textarea>
            <div class="text-end text-muted small mt-1">{{ form.message.length }}/1000</div>
          </div>

          <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <span class="text-muted small">
              Recipients: <strong>{{ form.audience === 'specific_users' ? selectedUsers.length : audienceLabel }}</strong>
            </span>
            <button class="btn btn-primary" :disabled="sending || !canSend" @click="send">
              <span v-if="sending" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-send me-1"></i>Send notification
            </button>
          </div>
        </div>
      </div>

      <!-- ================= STATS / INFO ================= -->
      <div class="col-lg-5">
        <div class="soft-card fade-up">
          <h6 class="fw-bold mb-3"><i class="bi bi-phone me-2 text-brand"></i>Registered devices</h6>
          <div class="row g-3 text-center">
            <div class="col-6">
              <div class="p-3 rounded-3" style="background: var(--surface-2, #f1f5f9)">
                <div class="fs-3 fw-bold text-brand">{{ stats?.active_tokens || 0 }}</div>
                <div class="text-muted small">Active push tokens</div>
              </div>
            </div>
            <div class="col-6">
              <div class="p-3 rounded-3" style="background: var(--surface-2, #f1f5f9)">
                <div class="fs-3 fw-bold">{{ stats?.registered_devices || 0 }}</div>
                <div class="text-muted small">Registered devices</div>
              </div>
            </div>
          </div>

          <div class="alert alert-info small mt-3 mb-0">
            <i class="bi bi-info-circle me-1"></i>
            Push notifications are delivered through the <strong>Expo Push</strong> service to devices that have signed in and
            granted notification permission. Sent messages are also stored in each user's in-app notifications so they remain
            visible even if the device is offline.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import api, { extractError } from '../../services/api'

const form = reactive({ audience: 'all_customers', title: '', message: '', user_ids: [] })
const sending = ref(false)
const formError = ref('')
const successMessage = ref('')
const stats = ref({ active_tokens: 0, registered_devices: 0 })

const selectedUsers = ref([])
const userSuggestions = ref([])
const userSearch = ref('')
let userSearchTimer = null

const audienceLabels = {
  all_customers: 'All customers',
  all_vendors: 'All vendors',
  all_users: 'All users',
  specific_users: 'Specific users',
}
const audienceLabel = computed(() => audienceLabels[form.audience])

const canSend = computed(() => {
  if (!form.title.trim() || !form.message.trim()) return false
  if (form.audience === 'specific_users') return selectedUsers.value.length > 0
  return true
})

async function loadStats() {
  try {
    const { data } = await api.get('/admin/notifications/stats')
    stats.value = data.data
  } catch {
    stats.value = { active_tokens: 0, registered_devices: 0 }
  }
}

async function searchUsers() {
  clearTimeout(userSearchTimer)
  const q = userSearch.value.trim()
  if (q.length < 2) {
    userSuggestions.value = []
    return
  }
  userSearchTimer = setTimeout(async () => {
    try {
      const { data } = await api.get(`/admin/users?search=${encodeURIComponent(q)}`)
      const all = data.data || []
      const selectedIds = new Set(selectedUsers.value.map((u) => u.id))
      userSuggestions.value = all.filter((u) => !selectedIds.has(u.id)).slice(0, 8)
    } catch {
      userSuggestions.value = []
    }
  }, 300)
}

function toggleUser(u) {
  const i = selectedUsers.value.findIndex((x) => x.id === u.id)
  if (i >= 0) {
    selectedUsers.value.splice(i, 1)
  } else {
    selectedUsers.value.push({ id: u.id, name: u.name, email: u.email, role_name: u.role_name })
  }
  userSuggestions.value = userSuggestions.value.filter((x) => x.id !== u.id)
}

async function send() {
  formError.value = ''
  successMessage.value = ''
  sending.value = true
  try {
    const payload = {
      title: form.title.trim(),
      message: form.message.trim(),
      audience: form.audience,
    }
    if (form.audience === 'specific_users') {
      payload.user_ids = selectedUsers.value.map((u) => u.id)
    }
    const { data } = await api.post('/admin/notifications/send', payload)
    const recipients = data.data?.recipients ?? selectedUsers.value.length
    successMessage.value = `Notification sent to ${recipients} recipient${recipients === 1 ? '' : 's'}.`
    form.title = ''
    form.message = ''
    selectedUsers.value = []
    userSuggestions.value = []
    userSearch.value = ''
    await loadStats()
  } catch (e) {
    const err = extractError(e)
    formError.value = err.errors ? Object.values(err.errors).join('. ') : err.message
  } finally {
    sending.value = false
  }
}

onMounted(loadStats)
</script>

<style scoped>
.chips-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: var(--brand-50, #e6f7f4);
  color: var(--brand-700, #0d6e63);
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
}
.chip-x {
  border: 0;
  background: transparent;
  color: inherit;
  line-height: 1;
  font-size: 1rem;
  cursor: pointer;
  padding: 0;
}
.suggestion-drop {
  position: absolute;
  z-index: 1050;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: #fff;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(2, 6, 23, 0.12);
  overflow: hidden;
}
.suggestion-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
  padding: 8px 12px;
  border: 0;
  border-bottom: 1px solid var(--surface-2, #f1f5f9);
  background: transparent;
  text-align: left;
  cursor: pointer;
}
.suggestion-item:last-child {
  border-bottom: 0;
}
.suggestion-item:hover {
  background: var(--brand-50, #e6f7f4);
}
</style>
