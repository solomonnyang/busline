<template>
  <div>
    <!-- ================= HEADER ================= -->
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4 fade-up">
      <div>
        <div class="section-eyebrow"><i class="bi bi-bus-front-fill"></i>Locations</div>
        <h4 class="fw-bold mb-0">Terminals</h4>
      </div>
      <button class="btn btn-primary" @click="openModal()">
        <i class="bi bi-plus-lg me-1"></i>Add terminal
      </button>
    </div>

    <div class="soft-card fade-up">
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 p-3 pb-0">
        <h6 class="fw-bold mb-0"><i class="bi bi-bus-front me-2 text-brand"></i>Terminal directory</h6>
        <span class="text-muted small">{{ terminals.length }} terminal{{ terminals.length === 1 ? '' : 's' }}</span>
      </div>

      <LoadingSpinner :show="loading" />

      <div v-if="!loading && terminals.length === 0" class="p-3">
        <EmptyState icon="bi-bus-front" title="No terminals yet" message="Terminals will appear here once they are added." />
      </div>

      <div v-else class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead>
            <tr>
              <th>Terminal</th>
              <th>City</th>
              <th>Location</th>
              <th class="text-center">Vendors</th>
              <th>Status</th>
              <th class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in terminals" :key="t.id">
              <td>
                <div class="d-flex align-items-center gap-2">
                  <div class="stat-ico" style="width: 36px; height: 36px; font-size: 1rem; background: var(--brand-50); color: var(--brand-700)"><i class="bi bi-bus-front"></i></div>
                  <div class="min-width-0">
                    <div class="fw-bold small text-truncate">{{ t.name }}</div>
                    <div class="text-muted small text-truncate">{{ t.address || '—' }}</div>
                  </div>
                </div>
              </td>
              <td class="small">
                {{ t.city_name || '—' }}
                <span v-if="t.city_state" class="text-muted">· {{ t.city_state }}</span>
              </td>
              <td class="small text-nowrap">
                <span v-if="t.lat !== null">{{ t.lat }}, {{ t.lng }}</span>
                <span v-else>—</span>
                <div v-if="t.amenities_list.length" class="text-muted">
                  <span v-for="a in t.amenities_list.slice(0, 3)" :key="a" class="me-1"><i class="bi bi-check-circle-fill small"></i> {{ a }}</span>
                </div>
              </td>
              <td class="text-center small">
                <span v-if="t.vendor_count > 0" class="badge rounded-pill text-bg-success">{{ t.vendor_count }}</span>
                <span v-else class="text-muted">0</span>
              </td>
              <td><StatusBadge :status="t.is_active ? 'active' : 'inactive'" /></td>
              <td class="text-end text-nowrap">
                <button class="btn btn-sm btn-ghost me-1" @click="openModal(t)" aria-label="Edit terminal">
                  <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" @click="remove(t)" aria-label="Delete terminal">
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
            <h5 class="modal-title fw-bold"><i class="bi bi-bus-front-fill me-2 text-brand"></i>{{ editing?.id ? 'Edit terminal' : 'Add terminal' }}</h5>
            <button class="btn-close" @click="showModal = false"></button>
          </div>
          <div class="modal-body">
            <div v-if="modalError" class="alert alert-danger py-2 small">{{ modalError }}</div>
            <div class="row g-3">
              <div class="col-md-8">
                <label class="form-label">Terminal name</label>
                <input v-model="form.name" class="form-control" required />
              </div>
              <div class="col-md-4">
                <label class="form-label">City</label>
                <select v-model="form.city_id" class="form-select" required>
                  <option :value="null" disabled>Select city</option>
                  <option v-for="c in cities" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select>
              </div>
              <div class="col-12">
                <label class="form-label">Address</label>
                <input v-model="form.address" class="form-control" />
              </div>
              <div class="col-md-6">
                <label class="form-label">Latitude</label>
                <input v-model="form.lat" type="number" step="any" class="form-control" required />
              </div>
              <div class="col-md-6">
                <label class="form-label">Longitude</label>
                <input v-model="form.lng" type="number" step="any" class="form-control" required />
              </div>
              <div class="col-md-6">
                <label class="form-label">Photo URL</label>
                <input v-model="form.photo_url" class="form-control" />
              </div>
              <div class="col-md-6">
                <label class="form-label">Status</label>
                <select v-model="form.is_active" class="form-select">
                  <option :value="1">Active</option>
                  <option :value="0">Inactive</option>
                </select>
              </div>
              <div class="col-12">
                <label class="form-label">Amenities <span class="text-muted small">(comma separated)</span></label>
                <input v-model="form.amenities" class="form-control" placeholder="Parking, Restrooms, ATM, Wifi" />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" @click="showModal = false">Cancel</button>
            <button class="btn btn-primary" :disabled="saving" @click="save">
              <span v-if="saving" class="spinner-border spinner-border-sm"></span>
              <span v-else>{{ editing?.id ? 'Save changes' : 'Add terminal' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import api, { extractError } from '../../services/api'
import StatusBadge from '../../components/StatusBadge.vue'
import LoadingSpinner from '../../components/LoadingSpinner.vue'
import EmptyState from '../../components/EmptyState.vue'

const terminals = ref([])
const cities = ref([])
const loading = ref(true)
const showModal = ref(false)
const saving = ref(false)
const editing = ref(null)
const modalError = ref('')

const form = reactive({
  name: '',
  city_id: null,
  address: '',
  lat: null,
  lng: null,
  photo_url: '',
  amenities: '',
  is_active: 1,
})

async function load() {
  loading.value = true
  try {
    const [term, cit] = await Promise.all([
      api.get('/admin/terminals'),
      api.get('/admin/cities'),
    ])
    terminals.value = term.data.data
    cities.value = cit.data.data
  } catch (e) {
    terminals.value = []
  } finally {
    loading.value = false
  }
}

function openModal(terminal) {
  editing.value = terminal || null
  modalError.value = ''
  Object.assign(form, {
    name: terminal?.name || '',
    city_id: terminal ? terminal.city_id : null,
    address: terminal?.address || '',
    lat: terminal ? terminal.lat : null,
    lng: terminal ? terminal.lng : null,
    photo_url: terminal?.photo_url || '',
    amenities: (terminal?.amenities_list || []).join(', '),
    is_active: terminal ? Number(terminal.is_active) : 1,
  })
  showModal.value = true
}

function buildPayload() {
  return {
    name: form.name,
    city_id: form.city_id,
    address: form.address,
    lat: form.lat,
    lng: form.lng,
    photo_url: form.photo_url,
    amenities: form.amenities,
    is_active: Number(form.is_active),
  }
}

async function save() {
  modalError.value = ''
  if (!form.city_id) {
    modalError.value = 'Please select a city.'
    return
  }
  saving.value = true
  try {
    if (editing.value?.id) {
      await api.put(`/admin/terminals/${editing.value.id}`, buildPayload())
    } else {
      await api.post('/admin/terminals', buildPayload())
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

async function remove(terminal) {
  if (!confirm(`Delete terminal "${terminal.name}"?`)) return
  try {
    await api.delete(`/admin/terminals/${terminal.id}`)
    await load()
  } catch (e) {
    alert(extractError(e).message)
  }
}

onMounted(load)
</script>
