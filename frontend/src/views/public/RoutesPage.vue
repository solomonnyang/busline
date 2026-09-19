<template>
  <div class="page-catalog">
    <!-- Page header -->
    <header class="catalog-hero">
      <div class="container position-relative">
        <nav aria-label="breadcrumb">
          <ol class="breadcrumb">
            <li class="breadcrumb-item"><router-link to="/">Home</router-link></li>
            <li class="breadcrumb-item active" aria-current="page">Routes</li>
          </ol>
        </nav>
        <h1 class="catalog-title">Explore bus routes</h1>
        <p class="catalog-sub">
          Every route, every operator, one place. Compare prices and travel times across Nigeria.
        </p>
      </div>
    </header>

    <section class="section pt-4">
      <div class="container">

        <!-- Toolbar -->
        <div class="catalog-toolbar soft-card p-3 p-md-4 mb-4">
          <div class="toolbar-search position-relative flex-grow-1">
            <i class="bi bi-search" aria-hidden="true"></i>
            <input
              v-model.trim="query"
              type="search"
              class="form-control"
              placeholder="Search by city or operator — e.g. Lagos, Abuja…"
              aria-label="Search routes"
            />
          </div>
          <label class="visually-hidden" for="sort-routes">Sort routes</label>
          <select id="sort-routes" v-model="sortBy" class="form-select sort-select">
            <option value="popular">Most popular</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
            <option value="duration">Fastest</option>
          </select>
        </div>

        <!-- Result count -->
        <p v-if="!loading" class="result-count small text-muted mb-4" role="status">
          <strong>{{ filteredRoutes.length }}</strong> route{{ filteredRoutes.length === 1 ? '' : 's' }}
          <template v-if="query"> matching “{{ query }}”</template>
        </p>

        <!-- Skeletons -->
        <div v-if="loading" class="row g-4" aria-hidden="true">
          <div v-for="n in 6" :key="n" class="col-sm-6 col-lg-4">
            <div class="skeleton-card"></div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else-if="!filteredRoutes.length" class="empty-state soft-card text-center p-5">
          <div class="empty-icon mx-auto"><i class="bi bi-signpost-split" aria-hidden="true"></i></div>
          <h2 class="fs-5 fw-bold mt-3 mb-1">No routes found</h2>
          <p class="text-muted small mb-0">
            We couldn't find a route matching “{{ query }}”. Try a different city or operator.
          </p>
          <button v-if="query" class="btn btn-ghost mt-3" type="button" @click="query = ''">
            Clear search
          </button>
        </div>

        <!-- Grid -->
        <div v-else class="row g-4">
          <div
            v-for="(route, i) in filteredRoutes"
            :key="route.key"
            class="col-sm-6 col-lg-4 fade-up"
            :class="'delay-' + ((i % 3) + 1)"
          >
            <RouteCard :route="route" :currency="currency" book-link="/customer/dashboard" />
          </div>
        </div>

        <!-- CTA -->
        <div class="cta-band mt-5 p-4 p-lg-5 text-center text-lg-start">
          <div class="d-flex flex-column flex-lg-row align-items-lg-center gap-3 gap-lg-4 justify-content-between">
            <div>
              <h2 class="fs-4 fw-bold font-display mb-1">Can't find your route?</h2>
              <p class="mb-0 cta-sub">New trips are added daily. Search live schedules to see what's departing next.</p>
            </div>
            <router-link to="/customer/dashboard" class="btn btn-light btn-lg flex-shrink-0">
              Search live trips <i class="bi bi-arrow-right ms-1"></i>
            </router-link>
          </div>
        </div>

      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '../../services/api'
import RouteCard from '../../components/RouteCard.vue'
import { buildRoutes } from '../../utils/catalog'

const currency = '₦'
const query = ref('')
const sortBy = ref('popular')
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

const allRoutes = computed(() => buildRoutes(trips.value))

const filteredRoutes = computed(() => {
  let list = allRoutes.value
  const q = query.value.toLowerCase()
  if (q) {
    list = list.filter((r) =>
      [r.origin_city, r.destination_city, r.operator]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    )
  }
  const sorted = [...list]
  if (sortBy.value === 'price-asc') sorted.sort((a, b) => a.price - b.price)
  else if (sortBy.value === 'price-desc') sorted.sort((a, b) => b.price - a.price)
  else if (sortBy.value === 'duration')
    sorted.sort((a, b) => (a.estimated_duration || Infinity) - (b.estimated_duration || Infinity))
  else sorted.sort((a, b) => a.price - b.price)
  return sorted
})
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
.catalog-sub { color: rgba(255, 255, 255, 0.72); max-width: 34rem; margin-bottom: 0; }

.catalog-toolbar {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border-radius: 18px;
}
@media (min-width: 768px) {
  .catalog-toolbar { flex-direction: row; align-items: center; }
}

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
  padding-left: 2.6rem;
  border-radius: 12px;
  border-color: var(--border);
}
.toolbar-search input:focus {
  border-color: var(--brand);
  box-shadow: 0 0 0 3.5px var(--brand-50);
}

.sort-select {
  width: 100%;
  min-height: 50px;
  border-radius: 12px;
  border-color: var(--border);
  font-weight: 600;
  color: var(--text);
  cursor: pointer;
}
.sort-select:focus {
  border-color: var(--brand);
  box-shadow: 0 0 0 3.5px var(--brand-50);
}
@media (min-width: 768px) {
  .sort-select { width: auto; min-width: 190px; }
}

.result-count strong { color: var(--brand-700); }

.skeleton-card {
  height: 208px;
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
