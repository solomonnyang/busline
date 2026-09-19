<template>
  <div>
    <!-- ================= HEADER ================= -->
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4 fade-up">
      <div>
        <div class="section-eyebrow"><i class="bi bi-tags"></i>Marketing</div>
        <h4 class="fw-bold mb-0">Offers</h4>
      </div>
      <button class="btn btn-primary" @click="openModal()">
        <i class="bi bi-plus-lg me-1"></i>Add card
      </button>
    </div>

    <div class="soft-card fade-up">
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 p-3 pb-0">
        <h6 class="fw-bold mb-0"><i class="bi bi-megaphone me-2 text-brand"></i>Slider cards</h6>
        <span class="text-muted small">{{ offers.length }} card{{ offers.length === 1 ? '' : 's' }}</span>
      </div>

      <LoadingSpinner :show="loading" />

      <div v-if="!loading && offers.length === 0" class="p-3">
        <EmptyState icon="bi-megaphone" title="No cards yet" message="Cards are what customers see in the Offers slider in the app. Add your first card to design the look." />
      </div>

      <div v-else class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead>
            <tr>
              <th>Card</th>
              <th>Description</th>
              <th>Status</th>
              <th class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="o in offers" :key="o.id">
              <td>
                <div class="d-flex align-items-center gap-2">
                  <span
                    class="offer-chip"
                    :style="{ backgroundColor: o.soft || 'var(--brand-50)', color: o.color || 'var(--brand-700)', borderColor: o.color || 'transparent' }"
                  >
                    <i :class="o.icon ? `bi bi-${iconFor(o.icon)}` : 'bi bi-tag'"></i>
                  </span>
                  <div>
                    <div class="fw-bold">{{ o.title }}</div>
                    <div class="small text-muted">{{ o.code }}</div>
                  </div>
                </div>
              </td>
              <td class="small">{{ o.description || '—' }}</td>
              <td><StatusBadge :status="o.is_active ? 'active' : 'inactive'" /></td>
              <td class="text-end text-nowrap">
                <button class="btn btn-sm btn-ghost me-1" @click="openModal(o)" aria-label="Edit offer">
                  <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" @click="remove(o)" aria-label="Delete offer">
                  <i class="bi bi-trash"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ================= PROGRAM RULES ================= -->
    <div class="soft-card fade-up mt-4">
      <div class="p-3 pb-2 d-flex flex-wrap justify-content-between align-items-center gap-2">
        <h6 class="fw-bold mb-0"><i class="bi bi-sliders me-2 text-brand"></i>Program rules</h6>
        <span class="text-muted small">Loyalty, early-bird and referral rates used by the Offers page.</span>
      </div>

      <div class="p-3 pt-2">
        <div class="row g-3">
          <div class="col-lg-4">
            <div class="rule-group">
              <div class="rule-group-title"><i class="bi bi-stars me-1"></i>Loyalty</div>
              <label class="form-label">Points per paid booking</label>
              <input v-model.number="rules.loyalty.points_per_booking" class="form-control" type="number" min="0" />
              <label class="form-label mt-2">Points value (₦ each)</label>
              <input v-model.number="rules.loyalty.points_value_ngn" class="form-control" type="number" min="0" step="0.01" />
              <label class="form-label mt-2">Minimum redeem points</label>
              <input v-model.number="rules.loyalty.min_points_redeem" class="form-control" type="number" min="1" />
            </div>
          </div>
          <div class="col-lg-4">
            <div class="rule-group">
              <div class="rule-group-title"><i class="bi bi-sunrise-fill me-1"></i>Early bird</div>
              <label class="form-label">Days ahead</label>
              <input v-model.number="rules.early_bird.early_bird_days" class="form-control" type="number" min="0" />
              <label class="form-label mt-2">Discount percent</label>
              <input v-model.number="rules.early_bird.early_bird_percent" class="form-control" type="number" min="0" max="100" step="0.5" />
            </div>
          </div>
          <div class="col-lg-4">
            <div class="rule-group">
              <div class="rule-group-title"><i class="bi bi-gift-fill me-1"></i>Referral</div>
              <label class="form-label">Commission percent</label>
              <input v-model.number="rules.referral.commission_percent" class="form-control" type="number" min="0" max="100" step="0.5" />
              <label class="form-label mt-2">Signup URL (referral link base)</label>
              <input v-model.trim="rules.referral.signup_url" class="form-control" type="url" placeholder="https://busline.ng" />
            </div>
          </div>
        </div>

        <div class="d-flex align-items-center gap-2 mt-3">
          <button class="btn btn-primary" :disabled="savingRules" @click="saveRules">
            <span v-if="savingRules" class="spinner-border spinner-border-sm"></span>
            <span v-else><i class="bi bi-check2 me-1"></i>Save rules</span>
          </button>
          <span v-if="rulesSaved" class="text-success small fw-semibold"><i class="bi bi-check-circle-fill me-1"></i>Rules saved.</span>
          <span v-if="rulesError" class="text-danger small fw-semibold">{{ rulesError }}</span>
        </div>
      </div>
    </div>

    <!-- ================= MODAL ================= -->
    <div v-if="showModal" class="modal fade show d-block" tabindex="-1" style="background: rgba(0, 0, 0, 0.5)">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content scale-in">
          <div class="modal-header">
            <h5 class="modal-title fw-bold"><i class="bi bi-tags me-2 text-brand"></i>{{ editing?.id ? 'Edit card' : 'Add card' }}</h5>
            <button class="btn-close" @click="showModal = false"></button>
          </div>
          <div class="modal-body">
            <div v-if="modalError" class="alert alert-danger py-2 small">{{ modalError }}</div>

            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label">Code</label>
                <input v-model.trim="form.code" class="form-control" placeholder="STUDENT10" maxlength="50" />
              </div>
              <div class="col-md-6">
                <label class="form-label">Title</label>
                <input v-model="form.title" class="form-control" placeholder="Loyalty program" required />
              </div>
              <div class="col-12">
                <label class="form-label">Description</label>
                <input v-model="form.description" class="form-control" placeholder="10% off every seat with your loyalty code." />
              </div>
              <div class="col-md-6">
                <label class="form-label">Icon</label>
                <input v-model="form.icon" class="form-control" placeholder="school-outline / gift-outline" />
                <div class="text-muted mt-1" style="font-size: 0.72rem">
                  <i class="bi bi-info-circle me-1"></i>Ionicons name, e.g. <code>sunny-outline</code>.
                </div>
              </div>
              <div class="col-md-6">
                <label class="form-label">Status</label>
                <select v-model="form.is_active" class="form-select">
                  <option :value="1">Active</option>
                  <option :value="0">Inactive</option>
                </select>
              </div>
              <div class="col-6">
                <label class="form-label">Accent color</label>
                <div class="d-flex align-items-center gap-2">
                  <input v-model="form.color" class="form-control form-control-color" type="color" />
                  <code class="small">{{ form.color }}</code>
                </div>
              </div>
              <div class="col-6">
                <label class="form-label">Soft background</label>
                <div class="d-flex align-items-center gap-2">
                  <input v-model="form.soft" class="form-control form-control-color" type="color" />
                  <code class="small">{{ form.soft }}</code>
                </div>
              </div>
            </div>

            <div class="offer-preview-label mt-3"><i class="bi bi-phone me-1"></i>Slider preview</div>
            <div class="offer-preview-card" :style="previewStyle">
              <span class="offer-preview-ico" :style="{ color: form.color || 'var(--brand-700)' }">
                <i :class="form.icon ? `bi bi-${iconFor(form.icon)}` : 'bi bi-tag'"></i>
              </span>
              <div class="offer-preview-body">
                <div class="offer-preview-title">{{ form.title || 'Offer title' }}</div>
                <div class="offer-preview-text">{{ form.description || 'Offer description' }}</div>
                <div class="offer-preview-foot">
                  <span class="offer-preview-code">{{ form.code || 'CODE' }}</span>
                  <span class="offer-preview-cta">View offer <i class="bi bi-arrow-right ms-1"></i></span>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" @click="showModal = false">Cancel</button>
            <button class="btn btn-primary" :disabled="saving" @click="save">
              <span v-if="saving" class="spinner-border spinner-border-sm"></span>
              <span v-else>{{ editing?.id ? 'Save changes' : 'Add card' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import api, { extractError } from '../../services/api'
import StatusBadge from '../../components/StatusBadge.vue'
import LoadingSpinner from '../../components/LoadingSpinner.vue'
import EmptyState from '../../components/EmptyState.vue'

const offers = ref([])
const loading = ref(true)
const showModal = ref(false)
const saving = ref(false)
const editing = ref(null)
const modalError = ref('')

const rules = reactive({
  loyalty: { points_per_booking: 10, points_value_ngn: 1, min_points_redeem: 10 },
  early_bird: { early_bird_days: 3, early_bird_percent: 15 },
  referral: { commission_percent: 10, signup_url: '' },
})
const savingRules = ref(false)
const rulesSaved = ref(false)
const rulesError = ref('')

const form = reactive({
  code: '',
  title: '',
  description: '',
  icon: '',
  color: '#3B82F6',
  soft: '#E4EEFD',
  is_active: 1,
})

const previewStyle = computed(() => ({
  backgroundColor: form.soft || '#E4EEFD',
  borderColor: form.color || '#3B82F6',
}))

function iconFor(name) {
  const map = {
    'school-outline': 'mortarboard',
    'sunny-outline': 'brightness-high',
    'gift-outline': 'gift',
    'pricetag-outline': 'tags',
    'flash-outline': 'lightning-charge',
    'star-outline': 'star',
    'ticket-outline': 'ticket-perforated',
    'people-outline': 'people',
    'heart-outline': 'heart',
    'wallet-outline': 'wallet2',
  }
  return map[name] || name
}

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/admin/offers')
    offers.value = data.data
  } catch (e) {
    offers.value = []
  } finally {
    loading.value = false
  }
}

function openModal(offer) {
  editing.value = offer || null
  modalError.value = ''
  Object.assign(form, {
    code: offer?.code || '',
    title: offer?.title || '',
    description: offer?.description || '',
    icon: offer?.icon || '',
    color: offer?.color || '#3B82F6',
    soft: offer?.soft || '#E4EEFD',
    is_active: offer ? offer.is_active : 1,
  })
  showModal.value = true
}

async function save() {
  modalError.value = ''
  if (!form.code || !form.title) {
    modalError.value = 'Code and title are required.'
    return
  }
  saving.value = true
  try {
    const payload = { ...form }
    if (editing.value?.id) {
      await api.put(`/admin/offers/${editing.value.id}`, payload)
    } else {
      await api.post('/admin/offers', payload)
    }
    showModal.value = false
    await load()
  } catch (e) {
    const err = extractError(e)
    modalError.value = err.errors ? Object.values(err.errors).join('. ') : err.message
  } finally {
    saving.value = false
  }
}

async function remove(offer) {
  if (!confirm(`Delete offer "${offer.title}"?`)) return
  try {
    await api.delete(`/admin/offers/${offer.id}`)
    await load()
  } catch (e) {
    alert(extractError(e).message)
  }
}

async function loadRules() {
  try {
    const { data } = await api.get('/admin/settings')
    const s = data.data || {}
    Object.assign(rules.loyalty, s.loyalty || rules.loyalty)
    Object.assign(rules.early_bird, s.early_bird || rules.early_bird)
    Object.assign(rules.referral, s.referral || rules.referral)
  } catch {
    // keep defaults
  }
}

async function saveRules() {
  rulesError.value = ''
  rulesSaved.value = false
  savingRules.value = true
  try {
    await Promise.all([
      api.put('/admin/settings', { group: 'loyalty', settings: rules.loyalty }),
      api.put('/admin/settings', { group: 'early_bird', settings: rules.early_bird }),
      api.put('/admin/settings', { group: 'referral', settings: rules.referral }),
    ])
    rulesSaved.value = true
    setTimeout(() => (rulesSaved.value = false), 2500)
  } catch (e) {
    rulesError.value = extractError(e).message
  } finally {
    savingRules.value = false
  }
}

onMounted(() => {
  load()
  loadRules()
})
</script>

<style scoped>
.offer-chip {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  border: 1px solid;
  flex-shrink: 0;
}
.offer-preview-label {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--brand-700, #B45309);
  background: var(--brand-50, #e4eeed);
  border-radius: var(--pill, 999px);
  padding: 0.25rem 0.7rem;
  margin-bottom: 0.55rem;
}
.offer-preview-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: 14px;
  border: 1px solid;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}
.offer-preview-ico {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  background: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15rem;
  flex-shrink: 0;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
}
.offer-preview-body {
  flex: 1;
  min-width: 0;
}
.offer-preview-title {
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--text, #0f172a);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.offer-preview-text {
  font-size: 0.78rem;
  color: var(--muted, #64748b);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.offer-preview-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 8px;
}
.offer-preview-code {
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.6px;
  background: #fff;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: var(--pill, 999px);
  padding: 2px 9px;
  color: var(--text, #0f172a);
}
.offer-preview-cta {
  display: inline-flex;
  align-items: center;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text, #0f172a);
}
.rule-group {
  background: var(--surface-2, #f8fafc);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: var(--radius, 12px);
  padding: 1rem 1rem 1.1rem;
  height: 100%;
}
.rule-group-title {
  font-weight: 800;
  font-size: 0.82rem;
  color: var(--brand-700, #B45309);
  margin-bottom: 0.7rem;
}
.rule-group .form-label { font-size: 0.78rem; font-weight: 600; color: var(--muted, #64748b); margin-bottom: 0.25rem; }
</style>
