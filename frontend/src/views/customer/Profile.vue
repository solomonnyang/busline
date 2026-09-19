<template>
  <div class="py-2">
    <h5 class="fw-bold mb-4">Profile</h5>

    <div class="card stat-card p-4">
      <LoadingSpinner :show="loading" />

      <form v-if="!loading" @submit.prevent="submit">
        <div v-if="message" class="alert alert-success py-2 small">{{ message }}</div>
        <div v-if="error" class="alert alert-danger py-2 small">{{ error }}</div>

        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label small text-muted">Full name</label>
            <input v-model="form.name" class="form-control" required />
          </div>
          <div class="col-md-6">
            <label class="form-label small text-muted">Email</label>
            <input :value="user.email" class="form-control" disabled />
          </div>
          <div class="col-md-6">
            <label class="form-label small text-muted">Phone</label>
            <input v-model="form.phone" class="form-control" />
          </div>
          <div class="col-md-6">
            <label class="form-label small text-muted">Date of birth</label>
            <input v-model="form.date_of_birth" type="date" class="form-control" />
          </div>
          <div class="col-md-6">
            <label class="form-label small text-muted">Gender</label>
            <select v-model="form.gender" class="form-select">
              <option value="">Prefer not to say</option>
              <option>male</option>
              <option>female</option>
              <option>other</option>
            </select>
          </div>
          <div class="col-12">
            <label class="form-label small text-muted">Address</label>
            <input v-model="form.address" class="form-control" />
          </div>
          <div class="col-md-6">
            <label class="form-label small text-muted">City</label>
            <input v-model="form.city" class="form-control" />
          </div>
          <div class="col-md-6">
            <label class="form-label small text-muted">Country</label>
            <input v-model="form.country" class="form-control" />
          </div>

          <div class="col-12">
            <hr />
            <label class="form-label small text-muted">New password <span class="text-muted-50">(leave blank to keep current)</span></label>
            <input v-model="form.password" type="password" class="form-control" minlength="6" />
          </div>
        </div>

        <button class="btn btn-primary mt-4" :disabled="saving">
          <span v-if="saving" class="spinner-border spinner-border-sm"></span>
          <span v-else><i class="bi bi-check-circle me-1"></i>Save changes</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import api, { extractError } from '../../services/api'
import LoadingSpinner from '../../components/LoadingSpinner.vue'

const loading = ref(true)
const saving = ref(false)
const message = ref('')
const error = ref('')
const user = ref({})

const form = reactive({
  name: '',
  phone: '',
  address: '',
  city: '',
  country: '',
  date_of_birth: '',
  gender: '',
  password: '',
})

onMounted(async () => {
  try {
    const { data } = await api.get('/profile')
    user.value = data.data.user
    const p = data.data.profile || {}
    form.name = data.data.user.name || ''
    form.phone = data.data.user.phone || ''
    form.address = p.address || ''
    form.city = p.city || ''
    form.country = p.country || ''
    form.date_of_birth = p.date_of_birth || ''
    form.gender = p.gender || ''
  } catch (e) {
    error.value = extractError(e).message
  } finally {
    loading.value = false
  }
})

async function submit() {
  error.value = ''
  message.value = ''
  saving.value = true
  try {
    await api.put('/profile', { ...form })
    message.value = 'Profile updated successfully.'
  } catch (e) {
    const err = extractError(e)
    error.value = err.errors ? Object.values(err.errors).join('. ') : err.message
  } finally {
    saving.value = false
  }
}
</script>
