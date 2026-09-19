<template>
  <div>
    <!-- ================= HEADER ================= -->
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4 fade-up">
      <div>
        <div class="section-eyebrow"><i class="bi bi-bus-front"></i>Fleet</div>
        <h4 class="fw-bold mb-0">Bus Categories</h4>
      </div>
      <button class="btn btn-primary" @click="openModal()">
        <i class="bi bi-plus-lg me-1"></i>Add category
      </button>
    </div>

    <div class="soft-card fade-up">
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 p-3 pb-0">
        <h6 class="fw-bold mb-0"><i class="bi bi-collection me-2 text-brand"></i>Category directory</h6>
        <span class="text-muted small">{{ categories.length }} categor{{ categories.length === 1 ? 'y' : 'ies' }}</span>
      </div>

      <LoadingSpinner :show="loading" />

      <div v-if="!loading && categories.length === 0" class="p-3">
        <EmptyState icon="bi-bus-front" title="No bus categories yet" message="Categories define the classes vendors can pick for their buses." />
      </div>

      <div v-else class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead>
            <tr>
              <th>Category</th>
              <th>Description</th>
              <th>Buses</th>
              <th>Status</th>
              <th class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in categories" :key="c.id">
              <td>
                <div class="d-flex align-items-center gap-2">
                  <img v-if="c.image" :src="c.image" :alt="c.name" class="cat-thumb" referrerpolicy="no-referrer" />
                  <div v-else class="stat-ico" style="width: 36px; height: 36px; font-size: 1rem; background: var(--brand-50); color: var(--brand-700)"><i class="bi bi-bus-front"></i></div>
                  <div>
                    <div class="fw-bold">{{ c.name }}</div>
                    <div class="small text-muted text-lowercase">{{ c.slug }}</div>
                  </div>
                </div>
              </td>
              <td class="small">{{ c.description || '—' }}</td>
              <td><span class="badge bg-light text-dark">{{ c.bus_count }}</span></td>
              <td><StatusBadge :status="c.is_active ? 'active' : 'inactive'" /></td>
              <td class="text-end text-nowrap">
                <button class="btn btn-sm btn-ghost me-1" @click="openModal(c)" aria-label="Edit category">
                  <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" @click="remove(c)" aria-label="Delete category">
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
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content scale-in">
          <div class="modal-header">
            <h5 class="modal-title fw-bold"><i class="bi bi-bus-front me-2 text-brand"></i>{{ editing?.id ? 'Edit category' : 'Add category' }}</h5>
            <button class="btn-close" @click="showModal = false"></button>
          </div>
          <div class="modal-body">
            <div v-if="modalError" class="alert alert-danger py-2 small">{{ modalError }}</div>
            <div class="mb-3">
              <label class="form-label">Name</label>
              <input v-model="form.name" class="form-control" required />
            </div>
            <div class="mb-3">
              <label class="form-label">Description</label>
              <input v-model="form.description" class="form-control" />
            </div>
            <div class="mb-3">
              <label class="form-label">Image URL</label>
              <div class="d-flex align-items-start gap-2">
                <div class="position-relative flex-grow-1">
                  <input v-model.trim="form.image" class="form-control" type="url" placeholder="https://example.com/category.jpg" />
                </div>
                <img v-if="imagePreview" :src="imagePreview" :alt="form.name || 'Category preview'" class="cat-preview" referrerpolicy="no-referrer" @error="imageError = true" @load="imageError = false" />
              </div>
              <div class="text-muted mt-1" style="font-size: 0.72rem">
                <i class="bi bi-info-circle me-1"></i>Paste the URL of an image; it is shown on the category and used as a preview.
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
              <span v-else>{{ editing?.id ? 'Save changes' : 'Add category' }}</span>
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

const categories = ref([])
const loading = ref(true)
const showModal = ref(false)
const saving = ref(false)
const editing = ref(null)
const modalError = ref('')

const form = reactive({ name: '', description: '', image: '', is_active: 1 })

const imageError = ref(false)
const imagePreview = computed(() => {
  const v = (form.image || '').trim()
  if (!v || imageError.value) return ''
  return v
})

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/admin/bus-categories')
    categories.value = data.data
  } catch (e) {
    categories.value = []
  } finally {
    loading.value = false
  }
}

function openModal(category) {
  editing.value = category || null
  modalError.value = ''
  imageError.value = false
  Object.assign(form, {
    name: category?.name || '',
    description: category?.description || '',
    image: category?.image || '',
    is_active: category ? category.is_active : 1,
  })
  showModal.value = true
}

async function save() {
  modalError.value = ''
  saving.value = true
  try {
    if (editing.value?.id) {
      await api.put(`/admin/bus-categories/${editing.value.id}`, { ...form })
    } else {
      await api.post('/admin/bus-categories', { ...form })
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

async function remove(category) {
  if (!confirm(`Delete category "${category.name}"?`)) return
  try {
    await api.delete(`/admin/bus-categories/${category.id}`)
    await load()
  } catch (e) {
    alert(extractError(e).message)
  }
}

onMounted(load)
</script>

<style scoped>
.cat-thumb {
  width: 42px;
  height: 42px;
  object-fit: cover;
  border-radius: 10px;
  border: 1px solid var(--border, #e2e8f0);
}
.cat-preview {
  width: 44px;
  height: 44px;
  object-fit: cover;
  border-radius: 10px;
  border: 1px solid var(--border, #e2e8f0);
  flex-shrink: 0;
}
</style>
