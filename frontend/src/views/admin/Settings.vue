<template>
  <div>
    <!-- ================= HEADER ================= -->
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4 fade-up">
      <div>
        <div class="section-eyebrow"><i class="bi bi-sliders"></i>Preferences</div>
        <h4 class="fw-bold mb-0">Settings</h4>
      </div>
    </div>

    <LoadingSpinner :show="loading" />

    <form v-if="!loading" @submit.prevent="save" class="fade-up">
      <div v-if="message" class="alert alert-success py-2 small">{{ message }}</div>
      <div v-if="error" class="alert alert-danger py-2 small">{{ error }}</div>

      <div class="row g-4">
        <!-- General -->
        <div class="col-lg-6">
          <div class="soft-card p-4 h-100">
            <div class="d-flex align-items-center gap-3 mb-4">
              <div class="stat-ico" style="background: var(--brand-50); color: var(--brand-700)"><i class="bi bi-gear"></i></div>
              <div>
                <h6 class="fw-bold mb-0">General</h6>
                <div class="text-muted small">Core site identity</div>
              </div>
            </div>
            <div class="mb-3">
              <label class="form-label">Site name</label>
              <input v-model="settings.general.site_name" class="form-control" />
            </div>
            <div class="row g-3">
              <div class="col-6">
                <label class="form-label">Currency</label>
                <input v-model="settings.general.currency" class="form-control" />
              </div>
              <div class="col-6">
                <label class="form-label">Currency symbol</label>
                <input v-model="settings.general.currency_symbol" class="form-control" />
              </div>
            </div>
            <div class="mt-3">
              <label class="form-label">Booking prefix</label>
              <input v-model="settings.general.booking_prefix" class="form-control" />
            </div>
          </div>
        </div>

        <!-- Payment -->
        <div class="col-lg-6">
          <div class="soft-card p-4 h-100">
            <div class="d-flex align-items-center gap-3 mb-4">
              <div class="stat-ico" style="background: var(--secondary-50); color: var(--secondary-700)"><i class="bi bi-credit-card"></i></div>
              <div>
                <h6 class="fw-bold mb-0">Payment</h6>
                <div class="text-muted small">Gateway configuration</div>
              </div>
            </div>
            <div class="mb-3">
              <label class="form-label">Paystack public key</label>
              <input v-model="settings.payment.paystack_public_key" class="form-control" />
            </div>
            <div class="mb-3">
              <label class="form-label">Paystack secret key</label>
              <input v-model="settings.payment.paystack_secret_key" type="password" class="form-control" autocomplete="new-password" placeholder="Leave blank to keep current secret" />
              <div class="form-text">Stored server-side only. Leave blank to keep the current key.</div>
            </div>
            <div>
              <label class="form-label">Default payment method</label>
              <select v-model="settings.payment.default_method" class="form-select">
                <option value="cash">Cash</option>
                <option value="paystack">Paystack</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Booking -->
        <div class="col-lg-6">
          <div class="soft-card p-4 h-100">
            <div class="d-flex align-items-center gap-3 mb-4">
              <div class="stat-ico" style="background: var(--accent-50); color: var(--accent-700)"><i class="bi bi-calendar-check"></i></div>
              <div>
                <h6 class="fw-bold mb-0">Booking</h6>
                <div class="text-muted small">Seating and check-in rules</div>
              </div>
            </div>
            <div class="mb-3">
              <label class="form-label">Max seats per booking</label>
              <input v-model.number="settings.booking.max_seats_per_booking" type="number" class="form-control" min="1" />
            </div>
            <div>
              <label class="form-label">Allow check-in before (hours)</label>
              <input v-model.number="settings.booking.allow_checkin_before_hours" type="number" class="form-control" min="0" />
            </div>
          </div>
        </div>
      </div>

      <div class="d-flex justify-content-end mt-4">
        <button class="btn btn-primary" :disabled="saving">
          <span v-if="saving" class="spinner-border spinner-border-sm"></span>
          <span v-else><i class="bi bi-check-circle me-1"></i>Save settings</span>
        </button>
      </div>

      <!-- Site content (marketing website) -->
      <div class="mt-5">
        <div class="section-eyebrow mb-3"><i class="bi bi-globe2"></i>Website content</div>
        <div class="soft-card p-4">
          <div class="text-muted small mb-4">These fields power the public marketing website (hero, app links, about, vendor, contact). Structured lists are edited as JSON.</div>

          <div class="row g-3">
            <div class="col-md-4">
              <label class="form-label">Brand name</label>
              <input v-model="site.brand_name" class="form-control" />
            </div>
            <div class="col-md-8">
              <label class="form-label">Brand tagline</label>
              <input v-model="site.brand_tagline" class="form-control" />
            </div>
            <div class="col-md-6">
              <label class="form-label">App download page URL</label>
              <input v-model="site.app_download_page_url" class="form-control" />
            </div>
            <div class="col-md-6">
              <label class="form-label">Hero image URL</label>
              <input v-model="site.hero_image" class="form-control" />
            </div>
            <div class="col-12">
              <label class="form-label">Hero title</label>
              <input v-model="site.hero_title" class="form-control" />
            </div>
            <div class="col-12">
              <label class="form-label">Hero subtitle</label>
              <textarea v-model="site.hero_subtitle" class="form-control" rows="2"></textarea>
            </div>
            <div class="col-md-6">
              <label class="form-label">Hero primary CTA</label>
              <input v-model="site.hero_primary_cta" class="form-control" />
            </div>
            <div class="col-md-6">
              <label class="form-label">Hero secondary CTA</label>
              <input v-model="site.hero_secondary_cta" class="form-control" />
            </div>
            <div class="col-md-6">
              <label class="form-label">App title</label>
              <input v-model="site.app_title" class="form-control" />
            </div>
            <div class="col-md-6">
              <label class="form-label">App subtitle</label>
              <input v-model="site.app_subtitle" class="form-control" />
            </div>
            <div class="col-md-4">
              <label class="form-label">App Store (iOS) URL</label>
              <input v-model="site.app_ios_url" class="form-control" />
            </div>
            <div class="col-md-4">
              <label class="form-label">Google Play (Android) URL</label>
              <input v-model="site.app_android_url" class="form-control" />
            </div>
            <div class="col-md-4">
              <label class="form-label">App QR image URL</label>
              <input v-model="site.app_qr_image" class="form-control" />
            </div>
          </div>

          <div class="row g-3 mt-1">
            <div class="col-md-6">
              <label class="form-label">App features <span class="text-muted small">(JSON array)</span></label>
              <textarea v-model="site.app_features" class="form-control font-monospace small" rows="3"></textarea>
            </div>
            <div class="col-md-6">
              <label class="form-label">How it works <span class="text-muted small">(JSON array of {title,text})</span></label>
              <textarea v-model="site.how_it_works" class="form-control font-monospace small" rows="3"></textarea>
            </div>
            <div class="col-md-6">
              <label class="form-label">Services <span class="text-muted small">(JSON array of {title,text,image})</span></label>
              <textarea v-model="site.services" class="form-control font-monospace small" rows="3"></textarea>
            </div>
            <div class="col-md-6">
              <label class="form-label">Vendor benefits <span class="text-muted small">(JSON array)</span></label>
              <textarea v-model="site.vendor_benefits" class="form-control font-monospace small" rows="3"></textarea>
            </div>
            <div class="col-md-6">
              <label class="form-label">Vendor title</label>
              <input v-model="site.vendor_title" class="form-control" />
            </div>
            <div class="col-md-6">
              <label class="form-label">Vendor subtitle</label>
              <input v-model="site.vendor_subtitle" class="form-control" />
            </div>
            <div class="col-md-6">
              <label class="form-label">About title</label>
              <input v-model="site.about_title" class="form-control" />
            </div>
            <div class="col-md-6">
              <label class="form-label">About body</label>
              <textarea v-model="site.about_body" class="form-control" rows="2"></textarea>
            </div>
            <div class="col-12">
              <label class="form-label">Stats <span class="text-muted small">(JSON array of {label,value,suffix})</span></label>
              <textarea v-model="site.stats" class="form-control font-monospace small" rows="3"></textarea>
            </div>
            <div class="col-12">
              <label class="form-label">Testimonials <span class="text-muted small">(JSON array of {name,role,text,avatar})</span></label>
              <textarea v-model="site.testimonials" class="form-control font-monospace small" rows="3"></textarea>
            </div>
            <div class="col-12">
              <label class="form-label">FAQs <span class="text-muted small">(JSON array of {q,a})</span></label>
              <textarea v-model="site.faqs" class="form-control font-monospace small" rows="4"></textarea>
            </div>
            <div class="col-md-4">
              <label class="form-label">Contact phone</label>
              <input v-model="site.contact_phone" class="form-control" />
            </div>
            <div class="col-md-4">
              <label class="form-label">Contact email</label>
              <input v-model="site.contact_email" class="form-control" />
            </div>
            <div class="col-md-4">
              <label class="form-label">Contact address</label>
              <input v-model="site.contact_address" class="form-control" />
            </div>
            <div class="col-12">
              <label class="form-label">Contact social <span class="text-muted small">(JSON object e.g. {"facebook":"","instagram":""})</span></label>
              <textarea v-model="site.contact_social" class="form-control font-monospace small" rows="2"></textarea>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-5">
        <div class="section-eyebrow mb-3"><i class="bi bi-shield-lock"></i>Account security</div>
        <TwoFactorSettings />
      </div>
    </form>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import api, { extractError } from '../../services/api'
import LoadingSpinner from '../../components/LoadingSpinner.vue'
import TwoFactorSettings from '../../components/TwoFactorSettings.vue'

const loading = ref(true)
const saving = ref(false)
const message = ref('')
const error = ref('')

const settings = reactive({
  general: {},
  payment: {},
  booking: {},
})

const site = reactive({})

const JSON_FIELDS = ['app_features', 'how_it_works', 'services', 'vendor_benefits', 'stats', 'testimonials', 'faqs', 'contact_social']

function stringifyField(value) {
  return Array.isArray(value) || value && typeof value === 'object' ? JSON.stringify(value, null, 2) : value ?? ''
}

onMounted(async () => {
  try {
    const { data } = await api.get('/admin/settings')
    settings.general = { ...(data.data.general || {}) }
    settings.payment = { ...(data.data.payment || {}) }
    settings.booking = { ...(data.data.booking || {}) }

    const sc = data.data.site || {}
    for (const key of Object.keys(sc)) {
      site[key] = JSON_FIELDS.includes(key) ? stringifyField(sc[key]) : sc[key]
    }
  } catch (e) {
    error.value = extractError(e).message
  } finally {
    loading.value = false
  }
})

async function save() {
  error.value = ''
  message.value = ''
  saving.value = true
  try {
    for (const group of Object.keys(settings)) {
      if (Object.keys(settings[group]).length) {
        await api.put('/admin/settings', { group, settings: settings[group] })
      }
    }

    const sitePayload = {}
    for (const key of Object.keys(site)) {
      if (JSON_FIELDS.includes(key)) {
        const parsed = parseJsonField(site[key], key)
        if (error.value) return
        if (parsed === undefined) continue
        sitePayload[key] = parsed
      } else {
        sitePayload[key] = site[key]
      }
    }
    if (Object.keys(sitePayload).length) {
      await api.put('/admin/settings', { group: 'site', settings: sitePayload })
    }

    message.value = 'Settings saved successfully.'
  } catch (e) {
    const err = extractError(e)
    error.value = err.errors ? Object.values(err.errors).join('. ') : err.message
  } finally {
    saving.value = false
  }
}

function parseJsonField(raw, key) {
  if (typeof raw !== 'string' || raw.trim() === '') return undefined
  try {
    return JSON.parse(raw)
  } catch (e) {
    error.value = `"${key}" must be valid JSON.`
    return undefined
  }
}
</script>
