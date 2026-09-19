<template>
  <div>
    <!-- ================= HEADER ================= -->
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4 fade-up">
      <div>
        <div class="section-eyebrow"><i class="bi bi-signpost-2"></i>Network</div>
        <h4 class="fw-bold mb-0">All Routes</h4>
      </div>
      <span class="text-muted small"><i class="bi bi-arrow-repeat me-1"></i>Auto-synced with vendors</span>
    </div>

    <div class="soft-card fade-up">
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 p-3 pb-0">
        <h6 class="fw-bold mb-0"><i class="bi bi-signpost-split me-2 text-brand"></i>Route directory</h6>
        <span class="text-muted small">{{ routes.length }} route{{ routes.length === 1 ? '' : 's' }}</span>
      </div>

      <LoadingSpinner :show="loading" />

      <div v-if="!loading && routes.length === 0" class="p-3">
        <EmptyState icon="bi-signpost-2" title="No routes yet" message="Routes will appear here once vendors publish them." />
      </div>

      <div v-else class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead>
            <tr>
              <th>Route</th>
              <th>Vendor</th>
              <th>Distance</th>
              <th>Duration</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in routes" :key="r.id">
              <td>
                <div class="d-flex align-items-center gap-2">
                  <div class="stat-ico" style="width: 36px; height: 36px; font-size: 1rem; background: var(--secondary-50); color: var(--secondary-700)"><i class="bi bi-bus-front"></i></div>
                  <span class="fw-bold">{{ r.origin_city }} <i class="bi bi-arrow-right text-muted small"></i> {{ r.destination_city }}</span>
                </div>
              </td>
              <td class="small">{{ r.vendor_name }}</td>
              <td class="small">{{ r.distance_km }} km</td>
              <td class="small">{{ r.estimated_duration || '—' }} min</td>
              <td><StatusBadge :status="r.status" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import api from '../../services/api'
import StatusBadge from '../../components/StatusBadge.vue'
import LoadingSpinner from '../../components/LoadingSpinner.vue'
import EmptyState from '../../components/EmptyState.vue'

const routes = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    const { data } = await api.get('/admin/routes')
    routes.value = data.data
  } catch (e) {
    routes.value = []
  } finally {
    loading.value = false
  }
})
</script>
