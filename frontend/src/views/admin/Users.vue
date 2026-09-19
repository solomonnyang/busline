<template>
  <div>
    <!-- ================= HEADER ================= -->
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4 fade-up">
      <div>
        <div class="section-eyebrow"><i class="bi bi-people"></i>People</div>
        <h4 class="fw-bold mb-0">Users</h4>
      </div>
      <div class="d-flex flex-wrap gap-2">
        <div class="position-relative">
          <i class="bi bi-search position-absolute text-muted" style="top: 50%; left: 12px; transform: translateY(-50%)"></i>
          <input
            v-model="query"
            type="text"
            class="form-control ps-5"
            placeholder="Search name, email, phone…"
            style="min-width: 240px"
            aria-label="Search users"
          />
        </div>
        <button class="btn btn-primary" @click="openModal()">
          <i class="bi bi-plus-lg me-1"></i>Add user
        </button>
      </div>
    </div>

    <!-- ================= FILTER CHIPS ================= -->
    <div class="mb-3 d-flex flex-wrap gap-2 fade-up">
      <button
        v-for="f in filters"
        :key="f.value"
        class="btn btn-sm"
        :class="filter === f.value ? 'btn-primary' : 'btn-ghost'"
        @click="filter = f.value"
      >
        {{ f.label }}
        <span class="ms-1 opacity-75">{{ f.count }}</span>
      </button>
    </div>

    <div class="soft-card fade-up">
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 p-3 pb-0">
        <h6 class="fw-bold mb-0"><i class="bi bi-people me-2 text-brand"></i>All accounts</h6>
        <span class="text-muted small">{{ filtered.length }} user{{ filtered.length === 1 ? '' : 's' }}</span>
      </div>

      <LoadingSpinner :show="loading" />

      <div v-if="!loading && filtered.length === 0" class="p-3">
        <EmptyState icon="bi-people" title="No users found" message="Users will appear here once accounts are created." />
      </div>

      <div v-else class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead>
            <tr>
              <th>User</th>
              <th>Contact</th>
              <th>Role</th>
              <th>Status</th>
              <th>Wallet</th>
              <th>Bookings</th>
              <th>Joined</th>
              <th class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in filtered" :key="u.id">
              <td>
                <div class="d-flex align-items-center gap-2">
                  <Avatar :name="u.name" :src="u.avatar" :size="36" :gradient="u.id" />
                  <div class="min-width-0">
                    <div class="fw-bold small text-truncate">{{ u.name }}</div>
                    <div class="text-muted small text-truncate">{{ u.email }}</div>
                  </div>
                </div>
              </td>
              <td class="small text-nowrap">{{ u.phone || '—' }}</td>
              <td>
                <span class="chip" :class="roleChip(u.role_slug)">{{ u.role || u.role_slug || '—' }}</span>
                <div v-if="u.company_name" class="text-muted small text-truncate" style="max-width: 160px">{{ u.company_name }}</div>
              </td>
              <td><StatusBadge :status="u.is_active ? 'active' : 'inactive'" /></td>
              <td class="small text-nowrap">{{ u.wallet_balance != null ? `₦${fmt(u.wallet_balance)}` : '—' }}</td>
              <td class="small">{{ u.bookings_count != null ? u.bookings_count : '—' }}</td>
              <td class="small text-nowrap">{{ fmtDate(u.created_at) }}</td>
              <td class="text-end text-nowrap">
                <button class="btn btn-sm btn-ghost me-1" @click="viewDetail(u)" aria-label="View details">
                  <i class="bi bi-eye"></i>
                </button>
                <button class="btn btn-sm btn-ghost me-1" @click="openModal(u)" aria-label="Edit user">
                  <i class="bi bi-pencil"></i>
                </button>
                <button
                  class="btn btn-sm"
                  :class="u.is_active ? 'btn-outline-danger' : 'btn-outline-success'"
                  :disabled="u.id === auth.user?.id"
                  @click="toggle(u)"
                  aria-label="Toggle user status"
                >
                  <i class="bi" :class="u.is_active ? 'bi-pause-circle' : 'bi-play-circle'"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" @click="remove(u)" aria-label="Delete user">
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
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content scale-in">
          <div class="modal-header">
            <h5 class="modal-title fw-bold"><i class="bi bi-person-plus me-2 text-brand"></i>{{ editing?.id ? 'Edit user' : 'Add user' }}</h5>
            <button class="btn-close" @click="showModal = false"></button>
          </div>
          <div class="modal-body">
            <div v-if="modalError" class="alert alert-danger py-2 small">{{ modalError }}</div>
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label">Full name</label>
                <input v-model="form.name" class="form-control" required />
              </div>
              <div class="col-md-6">
                <label class="form-label">Email</label>
                <input v-model="form.email" type="email" class="form-control" required />
              </div>
              <div class="col-md-6">
                <label class="form-label">Phone</label>
                <input v-model="form.phone" class="form-control" placeholder="Optional" />
              </div>
              <div class="col-md-6">
                <label class="form-label">Role</label>
                <select v-model="form.role_id" class="form-select" @change="onRoleChange">
                  <option :value="null" disabled>Select role…</option>
                  <option v-for="r in roles" :key="r.id" :value="r.id">{{ r.name }}</option>
                </select>
              </div>
              <div v-if="selectedRoleSlug === 'vendor'" class="col-md-12">
                <label class="form-label">Company name</label>
                <input v-model="form.company_name" class="form-control" :required="selectedRoleSlug === 'vendor'" />
              </div>
              <div class="col-md-6">
                <label class="form-label">{{ editing ? 'New password' : 'Password' }}</label>
                <input v-model="form.password" type="password" class="form-control" minlength="6" :required="!editing" placeholder="Min. 6 characters" />
                <div v-if="editing" class="form-text">Leave blank to keep the current password.</div>
              </div>
              <div class="col-md-6">
                <label class="form-label">Status</label>
                <select v-model="form.is_active" class="form-select">
                  <option :value="1">Active</option>
                  <option :value="0">Inactive</option>
                </select>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" @click="showModal = false">Cancel</button>
            <button class="btn btn-primary" :disabled="saving" @click="save">
              <span v-if="saving" class="spinner-border spinner-border-sm"></span>
              <span v-else>{{ editing?.id ? 'Save changes' : 'Add user' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ================= DETAIL MODAL ================= -->
    <div v-if="showDetail" class="modal fade show d-block" tabindex="-1" style="background: rgba(0, 0, 0, 0.5)">
      <div class="modal-dialog modal-xl modal-dialog-centered">
        <div class="modal-content scale-in" style="max-height: 94vh">
          <div class="modal-header">
            <h5 class="modal-title fw-bold"><i class="bi bi-person-badge me-2 text-brand"></i>User details</h5>
            <button class="btn-close" @click="closeDetail"></button>
          </div>
          <div class="modal-body" style="overflow-y: auto">
            <div v-if="detailError" class="alert alert-danger py-2 small">{{ detailError }}</div>

            <!-- Account summary -->
            <div v-if="detail" class="d-flex flex-wrap align-items-center gap-3 mb-4">
              <Avatar :name="detail.user?.name" :src="detail.user?.avatar" :size="56" :gradient="detail.user?.id || 0" />
              <div class="min-width-0">
                <div class="fw-bold fs-5">{{ detail.user?.name }}</div>
                <div class="text-muted small">{{ detail.user?.email }} · {{ detail.user?.phone || 'no phone' }}</div>
                <div class="mt-1 d-flex align-items-center gap-2">
                  <span class="chip" :class="roleChip(detail.user?.role_slug)">{{ detail.user?.role || '—' }}</span>
                  <StatusBadge :status="detail.user?.is_active ? 'active' : 'inactive'" />
                </div>
              </div>
              <div v-if="detail.user?.role_slug === 'customer'" class="ms-auto text-end">
                <div class="text-muted small">Wallet balance</div>
                <div class="fs-4 fw-bold text-success">₦{{ fmt(detail.wallet?.wallet?.balance) }}</div>
                <div class="text-muted small">{{ detail.user?.bookings_count ?? 0 }} booking(s)</div>
              </div>
            </div>

            <!-- Editable details -->
            <div v-if="detail" class="soft-card p-3 mb-3">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <h6 class="fw-bold mb-0"><i class="bi bi-pencil-square me-2 text-brand"></i>{{ detail.user?.role_slug === 'vendor' ? 'Vendor details' : 'Customer details' }}</h6>
                <span class="text-muted small">Joined {{ fmtDate(detail.user?.created_at) }}</span>
              </div>
              <div v-if="detailSaved" class="alert alert-success py-2 small">{{ detailSaved }}</div>
              <div class="row g-3">
                <template v-if="detail.user?.role_slug === 'customer'">
                  <div class="col-md-6">
                    <label class="form-label">Address</label>
                    <input v-model="detailForm.address" class="form-control" />
                  </div>
                  <div class="col-md-3">
                    <label class="form-label">City</label>
                    <input v-model="detailForm.city" class="form-control" />
                  </div>
                  <div class="col-md-3">
                    <label class="form-label">Country</label>
                    <input v-model="detailForm.country" class="form-control" />
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">Date of birth</label>
                    <input v-model="detailForm.date_of_birth" type="date" class="form-control" />
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">Gender</label>
                    <select v-model="detailForm.gender" class="form-select">
                      <option value="">Not set</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                </template>
                <template v-else>
                  <div class="col-md-6">
                    <label class="form-label">Company name</label>
                    <input v-model="detailForm.company_name" class="form-control" />
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">Company email</label>
                    <input v-model="detailForm.company_email" class="form-control" />
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">Company phone</label>
                    <input v-model="detailForm.company_phone" class="form-control" />
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">City</label>
                    <input v-model="detailForm.city" class="form-control" />
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">Country</label>
                    <input v-model="detailForm.country" class="form-control" />
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">Address</label>
                    <input v-model="detailForm.address" class="form-control" />
                  </div>
                  <div class="col-12">
                    <label class="form-label">Description</label>
                    <textarea v-model="detailForm.description" class="form-control" rows="2"></textarea>
                  </div>
                </template>
              </div>
              <div class="mt-3">
                <button class="btn btn-primary btn-sm" :disabled="savingDetails" @click="saveDetails">
                  <span v-if="savingDetails" class="spinner-border spinner-border-sm"></span>
                  <span v-else><i class="bi bi-check-lg me-1"></i>Save details</span>
                </button>
              </div>
            </div>

            <!-- Wallet management -->
            <div v-if="detail && detail.user?.role_slug === 'customer'" class="soft-card p-3">
              <h6 class="fw-bold mb-3"><i class="bi bi-wallet2 me-2 text-brand"></i>Wallet management</h6>
              <div class="row g-3 align-items-end">
                <div class="col-md-3">
                  <label class="form-label">Action</label>
                  <select v-model="walletForm.type" class="form-select">
                    <option value="credit">Credit (add funds)</option>
                    <option value="debit">Debit (deduct)</option>
                  </select>
                </div>
                <div class="col-md-3">
                  <label class="form-label">Amount (₦)</label>
                  <input v-model.number="walletForm.amount" type="number" min="1" step="0.01" class="form-control" placeholder="0.00" />
                </div>
                <div class="col-md-4">
                  <label class="form-label">Note</label>
                  <input v-model="walletForm.note" class="form-control" placeholder="Optional reason" />
                </div>
                <div class="col-md-2">
                  <button class="btn btn-primary w-100" :disabled="savingWallet || !walletForm.amount" @click="adjustWallet">
                    <span v-if="savingWallet" class="spinner-border spinner-border-sm"></span>
                    <span v-else>Apply</span>
                  </button>
                </div>
              </div>
              <div v-if="walletError" class="alert alert-danger py-2 small mt-2">{{ walletError }}</div>
              <div v-if="walletSuccess" class="alert alert-success py-2 small mt-2">{{ walletSuccess }}</div>
              <hr />
              <div class="d-flex justify-content-between align-items-center mb-2">
                <h6 class="fw-bold mb-0">Transaction history</h6>
                <span class="text-muted small">{{ (detail.wallet?.transactions || []).length }} entries</span>
              </div>
              <div v-if="!detail.wallet?.transactions?.length" class="text-muted small py-2">No transactions yet.</div>
              <div v-else class="table-responsive" style="max-height: 300px; overflow-y: auto">
                <table class="table table-sm align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Status</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="t in detail.wallet.transactions" :key="t.id">
                      <td class="small text-nowrap">{{ fmtDateTime(t.created_at) }}</td>
                      <td><span class="chip" :class="t.type === 'credit' ? 'chip chip-success' : 'chip chip-danger'">{{ t.type }}</span></td>
                      <td class="small text-nowrap">{{ t.type === 'credit' ? '+' : '−' }}₦{{ fmt(t.amount) }}</td>
                      <td class="small text-capitalize">{{ t.payment_method || '—' }}</td>
                      <td><StatusBadge :status="t.status" /></td>
                      <td class="small text-truncate" style="max-width: 200px">{{ t.description || '—' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" @click="closeDetail">Close</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import api, { extractError } from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import Avatar from '../../components/Avatar.vue'
import StatusBadge from '../../components/StatusBadge.vue'
import LoadingSpinner from '../../components/LoadingSpinner.vue'
import EmptyState from '../../components/EmptyState.vue'

const auth = useAuthStore()

const users = ref([])
const roles = ref([])
const loading = ref(true)
const showModal = ref(false)
const saving = ref(false)
const editing = ref(null)
const modalError = ref('')

const query = ref('')
const filter = ref('all')

const showDetail = ref(false)
const detail = ref(null)
const detailError = ref('')
const detailSaved = ref('')
const savingDetails = ref(false)
const detailForm = reactive({
  address: '',
  city: '',
  country: '',
  date_of_birth: '',
  gender: '',
  company_name: '',
  company_email: '',
  company_phone: '',
  description: '',
})
const walletForm = reactive({ type: 'credit', amount: null, note: '' })
const savingWallet = ref(false)
const walletError = ref('')
const walletSuccess = ref('')

async function fetchDetail(userId) {
  const { data } = await api.get(`/admin/users/${userId}`)
  detail.value = data.data
  const p = data.data.profile || {}
  Object.assign(detailForm, {
    address: p.address || '',
    city: p.city || '',
    country: p.country || '',
    date_of_birth: p.date_of_birth || '',
    gender: p.gender || '',
    company_name: p.company_name || '',
    company_email: p.company_email || '',
    company_phone: p.company_phone || '',
    description: p.description || '',
  })
}

async function viewDetail(user) {
  showDetail.value = true
  detail.value = null
  detailError.value = ''
  detailSaved.value = ''
  walletError.value = ''
  walletSuccess.value = ''
  Object.assign(walletForm, { type: 'credit', amount: null, note: '' })
  try {
    await fetchDetail(user.id)
  } catch (e) {
    detailError.value = extractError(e).message
  }
}

function closeDetail() {
  showDetail.value = false
  detail.value = null
}

async function saveDetails() {
  if (!detail.value?.user) return
  savingDetails.value = true
  detailSaved.value = ''
  try {
    await api.put(`/admin/users/${detail.value.user.id}/details`, { ...detailForm })
    await fetchDetail(detail.value.user.id)
    detailSaved.value = 'Details saved.'
    await load()
  } catch (e) {
    detailError.value = extractError(e).message
  } finally {
    savingDetails.value = false
  }
}

async function adjustWallet() {
  if (!detail.value?.user || !walletForm.amount) return
  savingWallet.value = true
  walletError.value = ''
  walletSuccess.value = ''
  try {
    await api.post(`/admin/users/${detail.value.user.id}/wallet/adjust`, {
      type: walletForm.type,
      amount: walletForm.amount,
      note: walletForm.note,
    })
    Object.assign(walletForm, { amount: null, note: '' })
    await fetchDetail(detail.value.user.id)
    walletSuccess.value = 'Wallet updated.'
    await load()
  } catch (e) {
    walletError.value = extractError(e).message
  } finally {
    savingWallet.value = false
  }
}

const form = reactive({ name: '', email: '', phone: '', password: '', role_id: null, is_active: 1, company_name: '' })

const filters = computed(() => [
  { label: 'All', value: 'all', count: users.value.length },
  { label: 'Customers', value: 'customer', count: users.value.filter((u) => u.role_slug === 'customer').length },
  { label: 'Vendors', value: 'vendor', count: users.value.filter((u) => u.role_slug === 'vendor').length },
  { label: 'Admins', value: 'super_admin', count: users.value.filter((u) => u.role_slug === 'super_admin').length },
])

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return users.value.filter((u) => {
    if (filter.value !== 'all' && u.role_slug !== filter.value) return false
    if (!q) return true
    return [u.name, u.email, u.phone].some((v) => String(v || '').toLowerCase().includes(q))
  })
})

const selectedRoleSlug = computed(() => roles.value.find((r) => r.id === form.role_id)?.slug || '')

function roleChip(slug) {
  if (slug === 'super_admin') return 'chip chip-danger'
  if (slug === 'vendor') return 'chip chip-warning'
  return 'chip chip-info'
}

function fmt(v) {
  return Number(v || 0).toLocaleString()
}

function fmtDate(value) {
  if (!value) return '—'
  return new Date(String(value).replace(' ', 'T') + 'Z').toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtDateTime(value) {
  if (!value) return '—'
  return new Date(String(value).replace(' ', 'T') + 'Z').toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

async function load() {
  loading.value = true
  try {
    const [usersRes, rolesRes] = await Promise.all([api.get('/admin/users'), api.get('/admin/roles')])
    users.value = usersRes.data.data
    roles.value = rolesRes.data.data
  } catch (e) {
    users.value = []
    roles.value = []
    alert(extractError(e).message)
  } finally {
    loading.value = false
  }
}

function onRoleChange() {
  if (selectedRoleSlug.value !== 'vendor' && editing.value) {
    form.company_name = ''
  }
}

function openModal(user) {
  editing.value = user || null
  modalError.value = ''
  Object.assign(form, {
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    password: '',
    role_id: user?.role_id ?? roles.value.find((r) => r.slug === 'customer')?.id ?? null,
    is_active: user ? user.is_active : 1,
    company_name: user?.company_name || '',
  })
  showModal.value = true
}

async function save() {
  modalError.value = ''
  saving.value = true
  const payload = { ...form }
  if (editing.value && !payload.password) delete payload.password
  try {
    if (editing.value?.id) {
      await api.put(`/admin/users/${editing.value.id}`, payload)
    } else {
      await api.post('/admin/users', payload)
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

async function toggle(user) {
  try {
    await api.put(`/admin/users/${user.id}/toggle`)
    user.is_active = user.is_active ? 0 : 1
  } catch (e) {
    alert(extractError(e).message)
  }
}

async function remove(user) {
  if (!confirm(`Delete user "${user.name}"? This cannot be undone.`)) return
  try {
    await api.delete(`/admin/users/${user.id}`)
    await load()
  } catch (e) {
    alert(extractError(e).message)
  }
}

onMounted(load)
</script>
