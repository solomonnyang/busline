<template>
  <div class="page-catalog">
    <!-- Page header -->
    <header class="catalog-hero">
      <div class="container position-relative">
        <nav aria-label="breadcrumb">
          <ol class="breadcrumb">
            <li class="breadcrumb-item"><router-link to="/">Home</router-link></li>
            <li class="breadcrumb-item active" aria-current="page">Operators</li>
          </ol>
        </nav>
        <h1 class="catalog-title">Our operators</h1>
        <p class="catalog-sub">
          Verified transport companies you can trust — every operator is reviewed before going live on BusLine.
        </p>
      </div>
    </header>

    <section class="section pt-4">
      <div class="container">

        <!-- Stats strip -->
        <div v-if="!loading && operators.length" class="stats-strip soft-card p-4 mb-4">
          <div class="row text-center g-3">
            <div class="col-4">
              <div class="stat-num">{{ operators.length }}</div>
              <div class="stat-label">Operators</div>
            </div>
            <div class="col-4">
              <div class="stat-num">{{ totalRoutes }}</div>
              <div class="stat-label">Routes served</div>
            </div>
            <div class="col-4">
              <div class="stat-num">{{ avgRating }}</div>
              <div class="stat-label">Avg. rating</div>
            </div>
          </div>
        </div>

        <!-- Search -->
        <div v-if="!loading && operators.length" class="toolbar-search position-relative mb-4">
          <i class="bi bi-search" aria-hidden="true"></i>
          <input
            v-model.trim="query"
            type="search"
            class="form-control"
            placeholder="Search operators…"
            aria-label="Search operators"
          />
        </div>

        <!-- Skeletons -->
        <div v-if="loading" class="row g-4" aria-hidden="true">
          <div v-for="n in 8" :key="n" class="col-6 col-md-4 col-lg-3">
            <div class="skeleton-card"></div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else-if="!filteredOperators.length" class="empty-state soft-card text-center p-5">
          <div class="empty-icon mx-auto"><i class="bi bi-bus-front" aria-hidden="true"></i></div>
          <h2 class="fs-5 fw-bold mt-3 mb-1">No operators found</h2>
          <p class="text-muted small mb-0">We couldn't find an operator matching “{{ query }}”.</p>
          <button v-if="query" class="btn btn-ghost mt-3" type="button" @click="query = ''">Clear search</button>
        </div>

        <!-- Grid -->
        <div v-else class="row g-4">
          <div
            v-for="(operator, i) in filteredOperators"
            :key="operator.company_name"
            class="col-6 col-md-4 col-lg-3 fade-up"
            :class="'delay-' + ((i % 3) + 1)"
          >
            <OperatorCard :operator="operator" />
          </div>
        </div>

        <!-- CTA -->
        <div class="cta-band mt-5 p-4 p-lg-5">
          <div class="row align-items-center g-3">
            <div class="col-lg-8">
              <h2 class="fs-4 fw-bold font-display mb-1">Run a transport company?</h2>
              <p class="mb-0 cta-sub">
                Join BusLine to fill empty seats, manage fleets, and get paid securely. Approval takes less than 48 hours.
              </p>
            </div>
            <div class="col-lg-4 text-lg-end">
              <router-link to="/register?role=vendor" class="btn btn-light btn-lg flex-shrink-0">
                Become an operator <i class="bi bi-arrow-right ms-1"></i>
              </router-link>
            </div>
          </div>
        </div>

      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '../../services/api'
import OperatorCard from '../../components/OperatorCard.vue'
import { buildOperators } from '../../utils/catalog'

const query = ref('')
const loading = ref(true)
const trips = ref([])

onMounted(async () => {
  try {
    const res = await api.get('/upcoming-trips')
    trips.value = res.data.data || []
  } catch {
    trips.value = []
  } finally {
    loading.value = false
  }
})

const operators = computed(() => buildOperators(trips.value))

const filteredOperators = computed(() => {
  const q = query.value.toLowerCase()
  if (!q) return operators.value
  return operators.value.filter((op) => String(op.company_name).toLowerCase().includes(q))
})

const totalRoutes = computed(() => new Set(trips.value.map((t) => `${t.origin_city}|${t.destination_city}`)).size)
const avgRating = computed(() =>
  operators.value.length
    ? (operators.value.reduce((sum, op) => sum + Number(op.rating || 0), 0) / operators.value.length).toFixed(1)
    : '—'
)
</script>

<style scoped>
.catalog-hero {
  background:
    radial-gradient(700px 320px at 85% -30%, rgba(255, 255, 255, 0.14), transparent 65%),
    #000;
  border-bottom: 0;
  padding: 2.25rem 0 2rem;
}
.breadcrumb { margin-bottom: 1rem; font-size: 0.84rem; }
.breadcrumb-item a { color: rgba(255, 255, 255, 0.6); text-decoration: none; }
.breadcrumb-item a:hover { color: #fff; }
.breadcrumb-item.active { color: rgba(255, 255, 255, 0.85); font-weight: 600; }

.catalog-title {
  font-size: clamp(1.8rem, 4vw, 2.6rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  margin-bottom: 0.4rem;
  color: #fff;
}
.catalog-sub { color: rgba(255, 255, 255, 0.72); max-width: 36rem; margin-bottom: 0; }

.stats-strip { border-radius: 18px; }
.stat-num {
  font-size: clamp(1.4rem, 3vw, 1.9rem);
  font-weight: 800;
  color: var(--brand-700);
  letter-spacing: -0.02em;
}
.stat-label { font-size: 0.82rem; color: var(--muted); font-weight: 600; }

.toolbar-search i {
  position: absolute;
  left: 0.95rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--muted);
  pointer-events: none;
}
.toolbar-search input {
  min-height: 50px;
  max-width: 26rem;
  padding-left: 2.6rem;
  border-radius: 12px;
  border-color: var(--border);
}
.toolbar-search input:focus {
  border-color: var(--brand);
  box-shadow: 0 0 0 3.5px var(--brand-50);
}

.skeleton-card {
  height: 230px;
  border-radius: 16px;
  background: linear-gradient(100deg, var(--surface-2) 40%, #fff 50%, var(--surface-2) 60%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite linear;
}
@keyframes shimmer {
  to { background-position-x: -200%; }
}

.empty-state { border-radius: 18px; }
.empty-icon {
  width: 64px;
  height: 64px;
  border-radius: 18px;
  background: var(--brand-50);
  color: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
}

.cta-band {
  border-radius: var(--radius-xl);
  background:
    radial-gradient(500px 260px at 90% -20%, rgba(255, 255, 255, 0.14), transparent 60%),
    linear-gradient(135deg, var(--brand-700), var(--brand));
  color: #fff;
}
.cta-sub { color: rgba(255, 255, 255, 0.82); }

@media (prefers-reduced-motion: reduce) {
  .fade-up, .skeleton-card { animation: none; }
}
</style>
