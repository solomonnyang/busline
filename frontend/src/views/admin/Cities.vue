<template>
  <div>
    <!-- ================= HEADER ================= -->
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4 fade-up">
      <div>
        <div class="section-eyebrow"><i class="bi bi-geo-alt"></i>Locations</div>
        <h4 class="fw-bold mb-0">Cities</h4>
      </div>
      <button class="btn btn-primary" @click="openModal()">
        <i class="bi bi-plus-lg me-1"></i>Add city
      </button>
    </div>

    <div class="soft-card fade-up">
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 p-3 pb-0">
        <h6 class="fw-bold mb-0"><i class="bi bi-map me-2 text-brand"></i>City directory</h6>
        <span class="text-muted small">{{ cities.length }} cit{{ cities.length === 1 ? 'y' : 'ies' }}</span>
      </div>

      <LoadingSpinner :show="loading" />

      <div v-if="!loading && cities.length === 0" class="p-3">
        <EmptyState icon="bi-geo-alt" title="No cities yet" message="Cities will appear here once they are added." />
      </div>

      <div v-else class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead>
            <tr>
              <th>City</th>
              <th>State</th>
              <th>Status</th>
              <th class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in cities" :key="c.id">
              <td>
                <div class="d-flex align-items-center gap-2">
                  <div class="stat-ico" style="width: 36px; height: 36px; font-size: 1rem; background: var(--brand-50); color: var(--brand-700)"><i class="bi bi-geo-alt"></i></div>
                  <span class="fw-bold">{{ c.name }}</span>
                </div>
              </td>
              <td class="small">{{ c.state || '—' }}</td>
              <td><StatusBadge :status="c.is_active ? 'active' : 'inactive'" /></td>
              <td class="text-end text-nowrap">
                <button class="btn btn-sm btn-ghost me-1" @click="openModal(c)" aria-label="Edit city">
                  <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" @click="remove(c)" aria-label="Delete city">
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
            <h5 class="modal-title fw-bold"><i class="bi bi-geo-alt me-2 text-brand"></i>{{ editing?.id ? 'Edit city' : 'Add city' }}</h5>
            <button class="btn-close" @click="showModal = false"></button>
          </div>
          <div class="modal-body">
            <div v-if="modalError" class="alert alert-danger py-2 small">{{ modalError }}</div>
            <div class="mb-3 position-relative">
              <label class="form-label">City name</label>
              <input
                v-model="form.name"
                class="form-control"
                autocomplete="off"
                placeholder="Start typing to search the map…"
                @focus="showSuggestions = suggestions.length > 0"
                @blur="hideSuggestions"
              />
              <div v-if="showSuggestions && suggestions.length" class="suggestion-drop">
                <button
                  v-for="s in suggestions"
                  :key="s.osm_id"
                  type="button"
                  class="suggestion-item"
                  @mousedown.prevent="pickSuggestion(s)"
                >
                  <span class="fw-semibold small">{{ s.name }}</span>
                  <span class="text-muted small text-truncate">{{ s.display_name }}</span>
                </button>
              </div>
              <div v-if="suggesting" class="text-muted small mt-1">
                <span class="spinner-border spinner-border-sm me-1"></span>Searching the map…
              </div>
              <div v-if="noResults" class="text-muted small mt-1">
                No matches. Click the map below to set the coordinates manually.
              </div>
            </div>
            <div class="mb-3">
              <label class="form-label">State</label>
              <input v-model="form.state" class="form-control" />
            </div>
            <div class="mb-3">
              <label class="form-label">Coordinates <span class="text-muted fw-normal">(auto-set from map)</span></label>
              <CityMapPicker v-model:lat="form.lat" v-model:lng="form.lng" />
            </div>
            <div class="row g-3 mb-3">
              <div class="col-6">
                <label class="form-label">Latitude</label>
                <input v-model.number="form.lat" type="number" class="form-control" step="0.000001" placeholder="e.g. 6.5244" />
              </div>
              <div class="col-6">
                <label class="form-label">Longitude</label>
                <input v-model.number="form.lng" type="number" class="form-control" step="0.000001" placeholder="e.g. 3.3792" />
              </div>
            </div>
            <div>
              <label class="form-label">Status</label>
              <select v-model="form.is_active" class="form-select">
                <option :value="1">Active</option>
                <option :value="0">Inactive</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" @click="showModal = false">Cancel</button>
            <button class="btn btn-primary" :disabled="saving" @click="save">
              <span v-if="saving" class="spinner-border spinner-border-sm"></span>
              <span v-else>{{ editing?.id ? 'Save changes' : 'Add city' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineAsyncComponent, onMounted, reactive, ref, watch } from 'vue'
import api, { extractError } from '../../services/api'
import StatusBadge from '../../components/StatusBadge.vue'
import LoadingSpinner from '../../components/LoadingSpinner.vue'
import EmptyState from '../../components/EmptyState.vue'
const CityMapPicker = defineAsyncComponent(() => import('../../components/CityMapPicker.vue'))

const cities = ref([])
const loading = ref(true)
const showModal = ref(false)
const saving = ref(false)
const editing = ref(null)
const modalError = ref('')

const form = reactive({ name: '', state: '', lat: null, lng: null, is_active: 1 })

const suggestions = ref([])
const suggesting = ref(false)
const noResults = ref(false)
const showSuggestions = ref(false)
let suggestTimer = null
let suggestSeq = 0
let suppressSuggest = false

watch(
  () => form.name,
  (val) => {
    clearTimeout(suggestTimer)
    suggestions.value = []
    noResults.value = false
    if (suppressSuggest) return
    if ((val || '').trim().length < 2) {
      showSuggestions.value = false
      return
    }
    suggestTimer = setTimeout(fetchSuggestions, 350)
  }
)

async function fetchSuggestions() {
  const q = form.name.trim()
  if (q.length < 2) return
  suggesting.value = true
  const seq = ++suggestSeq
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=ng&limit=6&q=${encodeURIComponent(q)}`,
      { headers: { Accept: 'application/json' } }
    )
    if (!res.ok) throw new Error('geocode failed')
    const data = await res.json()
    if (seq !== suggestSeq) return
    suggestions.value = data.map((r) => ({
      osm_id: r.osm_id,
      lat: Number(r.lat),
      lng: Number(r.lon),
      name: r.name || r.display_name.split(',')[0],
      state: r.address?.state || '',
      display_name: r.display_name,
    }))
    showSuggestions.value = suggestions.value.length > 0
    noResults.value = suggestions.value.length === 0
  } catch {
    if (seq === suggestSeq) {
      suggestions.value = []
      noResults.value = false
    }
  } finally {
    if (seq === suggestSeq) suggesting.value = false
  }
}

function pickSuggestion(s) {
  suppressSuggest = true
  form.lat = s.lat
  form.lng = s.lng
  form.name = s.name
  if (!form.state.trim()) form.state = s.state || ''
  suggestions.value = []
  showSuggestions.value = false
  noResults.value = false
  setTimeout(() => {
    suppressSuggest = false
  }, 0)
}

function hideSuggestions() {
  setTimeout(() => {
    showSuggestions.value = false
  }, 150)
}

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/admin/cities')
    cities.value = data.data
  } catch (e) {
    cities.value = []
  } finally {
    loading.value = false
  }
}

function openModal(city) {
  editing.value = city || null
  modalError.value = ''
  Object.assign(form, {
    name: city?.name || '',
    state: city?.state || '',
    lat: city?.lat != null ? Number(city.lat) : null,
    lng: city?.lng != null ? Number(city.lng) : null,
    is_active: city ? city.is_active : 1,
  })
  showModal.value = true
}

async function save() {
  modalError.value = ''
  saving.value = true
  try {
    if (editing.value?.id) {
      await api.put(`/admin/cities/${editing.value.id}`, { ...form })
    } else {
      await api.post('/admin/cities', { ...form })
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

async function remove(city) {
  if (!confirm(`Delete city "${city.name}"?`)) return
  try {
    await api.delete(`/admin/cities/${city.id}`)
    await load()
  } catch (e) {
    alert(extractError(e).message)
  }
}

onMounted(load)
</script>

<style scoped>
.suggestion-drop {
  position: absolute;
  top: calc(100% - 4px);
  left: 0;
  right: 0;
  z-index: 1050;
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
