<template>
  <div>
    <!-- ================= HEADER ================= -->
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4 fade-up">
      <div>
        <div class="section-eyebrow"><i class="bi bi-buildings"></i>Approval</div>
        <h4 class="fw-bold mb-0">Vendors</h4>
      </div>
      <div class="d-flex flex-wrap gap-2">
        <button v-for="f in filters" :key="f.value" class="btn btn-sm" :class="filter === f.value ? 'btn-primary' : 'btn-ghost'" @click="setFilter(f.value)">
          {{ f.label }}
        </button>
        <button class="btn btn-primary" @click="openModal()">
          <i class="bi bi-plus-lg me-1"></i>Add vendor
        </button>
      </div>
    </div>

    <div class="soft-card fade-up">
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 p-3 pb-0">
        <h6 class="fw-bold mb-0"><i class="bi bi-people me-2 text-brand"></i>Vendor directory</h6>
        <span class="text-muted small">{{ vendors.length }} vendor{{ vendors.length === 1 ? '' : 's' }}</span>
      </div>

      <LoadingSpinner :show="loading" />

      <div v-if="!loading && vendors.length === 0" class="p-3">
        <EmptyState icon="bi-building" title="No vendors found" message="Vendor registrations will appear here once operators sign up." />
      </div>

      <div v-else class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead>
            <tr>
              <th>Company</th>
              <th>Contact</th>
              <th>Terminal</th>
              <th>City</th>
              <th>Status</th>
              <th class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="v in vendors" :key="v.id">
              <td>
                <div class="d-flex align-items-center gap-2">
                  <div class="operator-logo" style="width: 36px; height: 36px; margin: 0; font-size: 0.9rem">{{ (v.company_name || '?').charAt(0) }}</div>
                  <div class="min-width-0">
                    <div class="fw-bold small text-truncate">{{ v.company_name }}</div>
                    <div class="text-muted small text-truncate">{{ v.description || '—' }}</div>
                  </div>
                </div>
              </td>
              <td class="small">
                {{ v.name }}<br />
                <span class="text-muted">{{ v.email }}</span>
              </td>
              <td class="small">
                <div v-if="v.terminals && v.terminals.length">
                  <span v-for="t in v.terminals" :key="t.id" class="terminal-chip"><i class="bi bi-bus-front me-1"></i>{{ t.name }}</span>
                </div>
                <span v-else-if="v.terminal_name"><i class="bi bi-bus-front me-1 text-brand"></i>{{ v.terminal_name }}</span>
                <span v-else class="text-muted">No terminal</span>
              </td>
              <td class="small">{{ v.city || '—' }}</td>
              <td>
                <StatusBadge :status="v.approval_status" />
                <div v-if="v.user_active === 0" class="text-danger small mt-1">Account disabled</div>
              </td>
              <td class="text-end text-nowrap">
                <button class="btn btn-sm btn-ghost me-1" @click="openModal(v)" aria-label="Edit vendor">
                  <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-primary me-1" @click="impersonate(v)" aria-label="Login as vendor">
                  <i class="bi bi-box-arrow-in-right"></i>
                </button>
                <button v-if="v.approval_status === 'pending'" class="btn btn-sm btn-success" @click="setStatus(v, 'approved')">
                  <i class="bi bi-check-lg me-1"></i>Approve
                </button>
                <button v-if="v.approval_status !== 'suspended'" class="btn btn-sm btn-outline-danger" @click="setStatus(v, 'suspended')">
                  <i class="bi bi-pause-circle me-1"></i>Suspend
                </button>
                <button v-if="v.approval_status === 'suspended'" class="btn btn-sm btn-outline-success" @click="setStatus(v, 'approved')">
                  <i class="bi bi-play-circle me-1"></i>Reinstate
                </button>
                <button class="btn btn-sm btn-outline-danger" @click="remove(v)" aria-label="Delete vendor">
                  <i class="bi bi-trash"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ================= MODAL ================= -->
    <div v-if="showModal" class="modal fade show d-block" tabindex="-1" style="background: rgba(0, 0, 0, 0.5)">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content scale-in">
          <div class="modal-header">
            <h5 class="modal-title fw-bold"><i class="bi bi-buildings me-2 text-brand"></i>{{ editing?.id ? 'Edit vendor' : 'Add vendor' }}</h5>
            <button class="btn-close" @click="showModal = false"></button>
          </div>
          <div class="modal-body">
            <div v-if="modalError" class="alert alert-danger py-2 small">{{ modalError }}</div>
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label">Owner name</label>
                <input v-model="form.name" class="form-control" required />
              </div>
              <div class="col-md-6">
                <label class="form-label">Email</label>
                <input v-model="form.email" type="email" class="form-control" required />
              </div>
              <div class="col-md-6" v-if="!editing">
                <label class="form-label">Password</label>
                <input v-model="form.password" type="password" class="form-control" minlength="6" required />
              </div>
              <div class="col-md-6">
                <label class="form-label">Phone</label>
                <input v-model="form.phone" class="form-control" />
              </div>
              <div class="col-md-6">
                <label class="form-label">Company name</label>
                <input v-model="form.company_name" class="form-control" required />
              </div>
              <div class="col-md-6">
                <label class="form-label">Company phone</label>
                <input v-model="form.company_phone" class="form-control" />
              </div>
              <div class="col-12">
                <label class="form-label">Terminals</label>
                <div class="terminal-picker">
                  <label v-for="t in terminals" :key="t.id" class="terminal-option">
                    <input type="checkbox" :value="t.id" v-model="form.terminal_ids" />
                    <span>{{ t.name }} <small class="text-muted">({{ t.city_name }})</small></span>
                  </label>
                </div>
              </div>
              <div class="col-md-6">
                <label class="form-label">Approval status</label>
                <select v-model="form.approval_status" class="form-select">
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div class="col-md-6">
                <label class="form-label">City</label>
                <input v-model="form.city" class="form-control" />
              </div>
              <div class="col-md-6">
                <label class="form-label">Country</label>
                <input v-model="form.country" class="form-control" />
              </div>
              <div class="col-12">
                <label class="form-label">Address</label>
                <input v-model="form.address" class="form-control" />
              </div>
              <div class="col-12">
                <label class="form-label">Description</label>
                <textarea v-model="form.description" class="form-control" rows="2"></textarea>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" @click="showModal = false">Cancel</button>
            <button class="btn btn-primary" :disabled="saving" @click="save">
              <span v-if="saving" class="spinner-border spinner-border-sm"></span>
              <span v-else>{{ editing?.id ? 'Save changes' : 'Add vendor' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import api, { extractError } from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import StatusBadge from '../../components/StatusBadge.vue'
import LoadingSpinner from '../../components/LoadingSpinner.vue'
import EmptyState from '../../components/EmptyState.vue'

const router = useRouter()
const auth = useAuthStore()

const filters = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Suspended', value: 'suspended' },
]

const vendors = ref([])
const terminals = ref([])
const loading = ref(true)
const filter = ref('')
const showModal = ref(false)
const saving = ref(false)
const editing = ref(null)
const modalError = ref('')

const form = reactive({
  name: '',
  email: '',
  password: '',
  phone: '',
  company_name: '',
  company_email: '',
  company_phone: '',
  terminal_ids: [],
  address: '',
  city: '',
  country: '',
  description: '',
  approval_status: 'pending',
})

async function load() {
  loading.value = true
  try {
    const [vendorRes, terminalRes] = await Promise.all([
      api.get('/admin/vendors', { params: filter.value ? { status: filter.value } : {} }),
      api.get('/admin/terminals'),
    ])
    vendors.value = vendorRes.data.data
    terminals.value = terminalRes.data.data
  } catch (e) {
    vendors.value = []
  } finally {
    loading.value = false
  }
}

function setFilter(f) {
  filter.value = f
  load()
}

function openModal(vendor) {
  editing.value = vendor || null
  modalError.value = ''
  Object.assign(form, {
    name: vendor?.name || '',
    email: vendor?.email || '',
    password: '',
    phone: vendor?.phone || '',
    company_name: vendor?.company_name || '',
    company_email: vendor?.company_email || vendor?.email || '',
    company_phone: vendor?.company_phone || '',
    terminal_ids: vendor?.terminal_ids?.length
      ? vendor.terminal_ids.map(Number)
      : (vendor?.terminal_id != null ? [Number(vendor.terminal_id)] : []),
    address: vendor?.address || '',
    city: vendor?.city || '',
    country: vendor?.country || '',
    description: vendor?.description || '',
    approval_status: vendor?.approval_status || 'pending',
  })
  showModal.value = true
}

function buildPayload() {
  const payload = {
    name: form.name,
    email: form.email,
    phone: form.phone,
    company_name: form.company_name,
    company_email: form.company_email,
    company_phone: form.company_phone,
    terminal_ids: form.terminal_ids.map(Number),
    address: form.address,
    city: form.city,
    country: form.country,
    description: form.description,
    approval_status: form.approval_status,
  }
  if (!editing.value?.id) payload.password = form.password
  return payload
}

async function save() {
  modalError.value = ''
  if (!editing.value?.id && !form.password) {
    modalError.value = 'Password is required for new vendors.'
    return
  }
  saving.value = true
  try {
    if (editing.value?.id) {
      await api.put(`/admin/vendors/${editing.value.id}`, buildPayload())
    } else {
      await api.post('/admin/vendors', buildPayload())
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

async function setStatus(vendor, status) {
  try {
    await api.put(`/admin/vendors/${vendor.id}/approve`, { status })
    await load()
  } catch (e) {
    alert(extractError(e).message)
  }
}

async function impersonate(vendor) {
  if (!confirm(`Sign in as ${vendor.company_name}? You can switch back to your admin account afterwards.`)) return
  try {
    await auth.impersonateVendor(vendor.id)
    router.push('/vendor/dashboard')
  } catch (e) {
    alert(extractError(e).message)
  }
}

async function remove(vendor) {
  if (!confirm(`Delete vendor "${vendor.company_name}"? This cannot be undone.`)) return
  try {
    await api.delete(`/admin/vendors/${vendor.id}`)
    await load()
  } catch (e) {
    alert(extractError(e).message)
  }
}

onMounted(load)
</script>

<style scoped>
.terminal-chip {
  display: inline-flex;
  align-items: center;
  background: color-mix(in srgb, var(--brand) 10%, var(--surface));
  color: var(--brand);
  border: 1px solid color-mix(in srgb, var(--brand) 25%, transparent);
  border-radius: var(--pill);
  padding: 0.15rem 0.6rem;
  font-size: 0.78rem;
  font-weight: 600;
  margin: 0 0.25rem 0.25rem 0;
}

.terminal-picker {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.5rem;
  max-height: 190px;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 0.15rem;
}

.terminal-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.88rem;
}

.terminal-option:hover {
  background: var(--surface-2);
}
</style>
