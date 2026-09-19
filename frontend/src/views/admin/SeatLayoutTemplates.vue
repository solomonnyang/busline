<template>
  <div>
    <!-- ================= HEADER ================= -->
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4 fade-up">
      <div>
        <div class="section-eyebrow"><i class="bi bi-grid-3x3-gap"></i>Fleet</div>
        <h4 class="fw-bold mb-0">Seat Layout Templates</h4>
      </div>
      <button class="btn btn-primary" @click="openModal()">
        <i class="bi bi-plus-lg me-1"></i>Add template
      </button>
    </div>

    <div class="soft-card fade-up">
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 p-3 pb-0">
        <h6 class="fw-bold mb-0"><i class="bi bi-diagram-3 me-2 text-brand"></i>Arrangement presets</h6>
        <span class="text-muted small">{{ templates.length }} template{{ templates.length === 1 ? '' : 's' }}</span>
      </div>

      <LoadingSpinner :show="loading" />

      <div v-if="!loading && templates.length === 0" class="p-3">
        <EmptyState icon="bi-grid-3x3-gap" title="No templates yet" message="Templates let vendors apply a seat arrangement in one click." />
      </div>

      <div v-else class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead>
            <tr>
              <th>Template</th>
              <th>Category</th>
              <th>Layout</th>
              <th>Status</th>
              <th class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in templates" :key="t.id">
              <td>
                <div class="fw-bold">{{ t.name }}</div>
                <div class="small text-muted">{{ t.description || '—' }}</div>
              </td>
              <td>
                <span v-if="t.category_name" class="badge text-uppercase chip chip-info">{{ t.category_name }}</span>
                <span v-else class="text-muted small">Any</span>
              </td>
              <td>
                <template v-if="isGridLayout(t.columns)">
                  <div class="mini-grid">
                    <div v-for="(r, ri) in t.columns.rows.slice(0, 3)" :key="ri" class="mini-row">
                      <span
                        v-for="(c, ci) in r"
                        :key="ci"
                        class="mini-cell"
                        :class="{
                          'mini-gap': c === null || c === '',
                          'mini-cell-driver': c === 'DRIVER',
                        }"
                      >
                        <i v-if="c === 'DRIVER'" class="bi bi-person-fill"></i>
                        <template v-else>{{ c === null || c === '' ? '' : c }}</template>
                      </span>
                    </div>
                    <div class="mini-more">{{ gridRowCount(t.columns) }} rows · {{ gridSeats(t.columns) }} seats</div>
                  </div>
                </template>
                <div v-else class="d-flex gap-1">
                  <span v-for="col in t.columns" :key="col" class="seat-col-chip" :title="'Column ' + col">{{ col }}</span>
                </div>
              </td>
              <td><StatusBadge :status="t.is_active ? 'active' : 'inactive'" /></td>
              <td class="text-end text-nowrap">
                <button class="btn btn-sm btn-ghost me-1" @click="openModal(t)" aria-label="Edit template">
                  <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" @click="remove(t)" aria-label="Delete template">
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
      <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content scale-in">
          <div class="modal-header">
            <h5 class="modal-title fw-bold"><i class="bi bi-diagram-3 me-2 text-brand"></i>{{ editing?.id ? 'Edit template' : 'Add template' }}</h5>
            <button class="btn-close" @click="showModal = false"></button>
          </div>
          <div class="modal-body">
            <div v-if="modalError" class="alert alert-danger py-2 small">{{ modalError }}</div>
            <div class="mb-3">
              <label class="form-label">Name</label>
              <input v-model="form.name" class="form-control" required />
            </div>
            <div class="mb-3">
              <label class="form-label">Category</label>
              <select v-model="form.category_id" class="form-select">
                <option :value="null">Any category</option>
                <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
            <div class="mb-3">
              <label class="form-label">Seat grid</label>
              <div class="d-flex flex-wrap align-items-center gap-3 mb-2">
                <div class="d-flex align-items-center gap-2">
                  <label class="small text-muted text-nowrap">Rows</label>
                  <input v-model.number="builder.rows" type="number" min="1" max="20" class="form-control form-control-sm" style="width: 72px" />
                </div>
                <div class="d-flex align-items-center gap-2">
                  <label class="small text-muted text-nowrap">Seats per row</label>
                  <input v-model.number="builder.cols" type="number" min="1" max="8" class="form-control form-control-sm" style="width: 72px" />
                </div>
                <button type="button" class="btn btn-sm btn-outline-primary" :disabled="!builder.grid.length" @click="fillPattern">
                  <i class="bi bi-arrow-repeat me-1"></i>Repeat row 1
                </button>
                <button type="button" class="btn btn-sm btn-outline-danger" :disabled="!builder.grid.length" @click="clearGrid">
                  <i class="bi bi-eraser me-1"></i>Clear
                </button>
                <span class="small text-muted fw-semibold">{{ builderSeatCount }} seats</span>
              </div>

              <div class="d-flex align-items-center gap-2 flex-wrap mb-2">
                <span class="small text-muted me-1">Seats:</span>
                <button
                  v-for="l in palette"
                  :key="l"
                  type="button"
                  class="palette-chip"
                  :class="{ active: tool === l }"
                  draggable="true"
                  :title="'Place seat ' + l + ' (drag or select + click)'"
                  @dragstart="onDragStart($event, l)"
                  @click="tool = l"
                >{{ l }}</button>
                <button
                  type="button"
                  class="palette-chip palette-aisle"
                  :class="{ active: tool === 'AISLE' }"
                  :title="'Mark an aisle gap (no seat)'"
                  @click="tool = 'AISLE'"
                ><i class="bi bi-bezier2 me-1"></i>Aisle</button>
                <button
                  type="button"
                  class="palette-chip palette-driver"
                  :class="{ active: tool === 'DRIVER' }"
                  draggable="true"
                  :title="'Mark the driver seat (one per template)'"
                  @dragstart="onDragStart($event, 'DRIVER')"
                  @click="tool = 'DRIVER'"
                ><i class="bi bi-person-fill me-1"></i>Driver</button>
                <button
                  type="button"
                  class="palette-chip palette-eraser"
                  :class="{ active: tool === '' }"
                  :title="'Clear a cell'"
                  @click="tool = ''"
                ><i class="bi bi-eraser"></i></button>
              </div>

              <div class="grid-canvas">
                <div class="grid-front">
                  <span class="grid-front-lbl">FRONT</span>
                </div>
                <template v-for="(row, ri) in builder.grid" :key="ri">
                  <div class="grid-row">
                    <span class="grid-row-lbl">{{ ri + 1 }}</span>
                    <div
                      v-for="(cell, ci) in row"
                      :key="ci"
                      class="grid-cell"
                      :class="{
                        'cell-seat': isLetter(cell),
                        'cell-aisle': cell === 'AISLE',
                        'cell-driver': cell === 'DRIVER',
                        'cell-empty': cell === '',
                      }"
                      :title="cellTitle(cell)"
                      @click="applyTool(ri, ci)"
                      @dragover.prevent
                      @drop="onDrop($event, ri, ci)"
                    >
                      <span v-if="isLetter(cell)" class="cell-lbl">{{ cell }}</span>
                      <span v-else-if="cell === 'AISLE'" class="cell-aisle-mark"></span>
                      <i v-else-if="cell === 'DRIVER'" class="bi bi-person-fill cell-driver-mark"></i>
                    </div>
                  </div>
                </template>
              </div>
              <div class="form-text">
                Drag a seat letter onto the grid, or pick a tool and click cells. Row 1 is the front of the bus; the
                aisle tool marks a corridor gap where no seat is generated.
              </div>
            </div>
            <div class="mb-3">
              <label class="form-label">Description</label>
              <input v-model="form.description" class="form-control" />
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
            <button class="btn btn-primary" :disabled="saving || builderSeatCount === 0" @click="save">
              <span v-if="saving" class="spinner-border spinner-border-sm"></span>
              <span v-else>{{ editing?.id ? 'Save changes' : 'Add template' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import api, { extractError } from '../../services/api'
import StatusBadge from '../../components/StatusBadge.vue'
import LoadingSpinner from '../../components/LoadingSpinner.vue'
import EmptyState from '../../components/EmptyState.vue'

const templates = ref([])
const categories = ref([])
const loading = ref(true)
const showModal = ref(false)
const saving = ref(false)
const editing = ref(null)
const modalError = ref('')

const palette = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
const tool = ref('A')

const form = reactive({ name: '', category_id: null, description: '', is_active: 1 })

// The grid being edited: rows x cols cells, each '' (empty), 'AISLE', or a letter.
const builder = reactive({ rows: 10, cols: 5, grid: [] })

function isLetter(cell) {
  return typeof cell === 'string' && cell !== '' && cell !== 'AISLE' && cell !== 'DRIVER'
}

function cellTitle(cell) {
  if (cell === 'AISLE') return 'Aisle gap — click to change'
  if (cell === 'DRIVER') return 'Driver seat — click to change'
  if (isLetter(cell)) return `Seat ${cell} — click to clear`
  return 'Empty slot — click to place the selected seat'
}

const builderSeatCount = computed(() =>
  builder.grid.reduce((n, row) => n + row.filter((c) => isLetter(c)).length, 0)
)

function resizeGrid() {
  const rows = Math.min(20, Math.max(1, Number(builder.rows) || 1))
  const cols = Math.min(8, Math.max(1, Number(builder.cols) || 1))
  builder.rows = rows
  builder.cols = cols
  const next = []
  for (let ri = 0; ri < rows; ri++) {
    const row = []
    for (let ci = 0; ci < cols; ci++) {
      row.push(builder.grid[ri]?.[ci] ?? '')
    }
    next.push(row)
  }
  builder.grid = next
}

watch([() => builder.rows, () => builder.cols], resizeGrid)

function applyTool(ri, ci) {
  const row = builder.grid[ri]
  if (!row || ci >= row.length) return
  if (tool.value === 'AISLE') row[ci] = 'AISLE'
  else if (tool.value === '') row[ci] = ''
  else if (tool.value === 'DRIVER') {
    builder.grid.forEach((r) => {
      for (let i = 0; i < r.length; i++) if (r[i] === 'DRIVER') r[i] = ''
    })
    row[ci] = 'DRIVER'
  } else row[ci] = tool.value
}

function onDragStart(e, letter) {
  e.dataTransfer.setData('text/plain', letter)
  e.dataTransfer.effectAllowed = 'copy'
  tool.value = letter
}

function onDrop(e, ri, ci) {
  e.preventDefault()
  const letter = e.dataTransfer.getData('text/plain')
  if (letter) applyTool(ri, ci)
}

function fillPattern() {
  if (!builder.grid.length) return
  const pattern = [...builder.grid[0]]
  builder.grid = builder.grid.map(() => [...pattern])
}

function clearGrid() {
  builder.grid = builder.grid.map((row) => row.map(() => ''))
}

function loadLayoutIntoBuilder(columns) {
  if (Array.isArray(columns)) {
    // Legacy flat columns → insert an aisle before the second half.
    const mid = Math.ceil(columns.length / 2)
    const row = []
    columns.forEach((c, i) => {
      if (i === mid) row.push('AISLE')
      row.push(String(c).toUpperCase())
    })
    builder.rows = 10
    builder.cols = row.length
    builder.grid = Array.from({ length: 10 }, () => [...row])
    return
  }
  if (columns && Array.isArray(columns.rows)) {
    const g = columns.rows.map((r) =>
      (Array.isArray(r) ? r : []).map((cell) =>
        cell === null ? 'AISLE' : cell === '' ? '' : String(cell).toUpperCase()
      )
    )
    builder.rows = Math.max(1, g.length)
    builder.cols = Math.max(1, ...g.map((r) => r.length))
    builder.grid = g
    return
  }
  // Default 2+2 grid.
  const row = ['A', 'B', 'AISLE', 'C', 'D']
  builder.rows = 10
  builder.cols = 5
  builder.grid = Array.from({ length: 10 }, () => [...row])
}

async function load() {
  loading.value = true
  try {
    const [tmplRes, catRes] = await Promise.all([
      api.get('/admin/seat-layout-templates'),
      api.get('/admin/bus-categories'),
    ])
    templates.value = tmplRes.data.data
    categories.value = catRes.data.data
  } catch (e) {
    templates.value = []
  } finally {
    loading.value = false
  }
}

function openModal(template) {
  editing.value = template || null
  modalError.value = ''
  tool.value = 'A'
  Object.assign(form, {
    name: template?.name || '',
    category_id: template?.category_id != null ? Number(template.category_id) : null,
    description: template?.description || '',
    is_active: template ? template.is_active : 1,
  })
  loadLayoutIntoBuilder(template?.columns)
  showModal.value = true
}

async function save() {
  modalError.value = ''
  saving.value = true
  try {
    const payload = {
      name: form.name,
      category_id: form.category_id,
      description: form.description,
      columns: {
        rows: builder.grid.map((row) =>
          row.map((c) => (c === 'AISLE' ? null : c === '' ? '' : String(c).toUpperCase()))
        ),
      },
      is_active: form.is_active,
    }
    if (editing.value?.id) {
      await api.put(`/admin/seat-layout-templates/${editing.value.id}`, payload)
    } else {
      await api.post('/admin/seat-layout-templates', payload)
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

async function remove(template) {
  if (!confirm(`Delete template "${template.name}"?`)) return
  try {
    await api.delete(`/admin/seat-layout-templates/${template.id}`)
    await load()
  } catch (e) {
    alert(extractError(e).message)
  }
}

function isGridLayout(columns) {
  return columns && Array.isArray(columns.rows)
}

function gridRowCount(columns) {
  return isGridLayout(columns) ? columns.rows.length : 0
}

function gridSeats(columns) {
  if (!isGridLayout(columns)) return Array.isArray(columns) ? columns.length : 0
  return columns.rows.reduce(
    (n, r) => n + (Array.isArray(r) ? r.filter((c) => c !== null && c !== '' && c !== 'DRIVER').length : 0),
    0
  )
}

onMounted(load)
</script>

<style scoped>
.seat-col-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background: var(--brand-50, #FDF1DE);
  color: var(--brand-700, #B45309);
  font-size: 0.75rem;
  font-weight: 700;
  border: 1px solid var(--brand-200, #F5D794);
}

.mini-grid {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.mini-cell-driver {
  background: var(--brand-50, #FDF1DE);
  border-color: var(--brand, #F59E0B);
  border-style: solid;
  color: var(--brand, #F59E0B);
  font-size: 0.6rem;
}
.mini-row {
  display: flex;
  gap: 3px;
}
.mini-cell {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  background: var(--brand-50, #FDF1DE);
  border: 1px solid var(--brand-200, #F5D794);
  display: inline-grid;
  place-items: center;
  font-size: 0.55rem;
  font-weight: 700;
  color: var(--brand-700, #B45309);
}
.mini-gap {
  background: transparent;
  border-color: transparent;
}
.mini-more {
  font-size: 0.68rem;
  color: var(--muted, #64748b);
  margin-top: 2px;
}

.palette-chip {
  min-width: 34px;
  height: 34px;
  padding: 0 0.6rem;
  border-radius: 9px;
  border: 1.5px solid var(--border, #e2e8f0);
  background: #fff;
  font-weight: 700;
  font-size: 0.78rem;
  color: var(--text, #0f172a);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  transition: all 0.12s ease;
}
.palette-chip:hover {
  border-color: var(--brand, #F59E0B);
}
.palette-chip.active {
  border-color: var(--brand, #F59E0B);
  background: var(--brand-50, #FDF1DE);
  color: var(--brand-700, #B45309);
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.18);
}
.palette-chip.palette-aisle {
  color: #64748b;
}
.palette-chip.palette-driver {
  color: var(--brand, #F59E0B);
}
.palette-chip.palette-eraser {
  color: var(--danger, #dc3545);
}

.grid-canvas {
  display: inline-flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  background: #f8fafc;
  border: 1px dashed var(--border, #cbd5e1);
  border-radius: 12px;
  width: 100%;
  overflow-x: auto;
}
.grid-front {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-bottom: 8px;
  margin-bottom: 4px;
  border-bottom: 2px dashed var(--border, #cbd5e1);
}
.grid-front-lbl {
  font-size: 0.6rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: #94a3b8;
}
.grid-row {
  display: flex;
  gap: 4px;
  justify-content: center;
  align-items: center;
}
.grid-row-lbl {
  width: 16px;
  text-align: center;
  font-size: 0.62rem;
  font-weight: 800;
  color: #94a3b8;
  flex-shrink: 0;
}
.grid-cell {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  cursor: pointer;
  user-select: none;
  transition: all 0.12s ease;
}
.cell-empty {
  border: 1.5px dashed #cbd5e1;
  background: #fff;
}
.cell-empty:hover {
  border-color: var(--brand, #F59E0B);
  background: var(--brand-50, #FDF1DE);
}
.cell-seat {
  background: var(--brand-50, #FDF1DE);
  color: var(--brand-700, #B45309);
  border: 1.5px solid var(--brand-200, #F5D794);
}
.cell-seat:hover {
  background: var(--brand-100, #FBE9C2);
}
.cell-aisle {
  border: 1.5px dashed #94a3b8;
  background: repeating-linear-gradient(45deg, #eef2f7, #eef2f7 4px, #dde3ea 4px, #dde3ea 5px);
}
.cell-driver {
  background: var(--brand-50, #FDF1DE);
  border: 1.5px solid var(--brand, #F59E0B);
  color: var(--brand, #F59E0B);
}
.cell-driver-mark {
  font-size: 0.95rem;
  line-height: 1;
}
.cell-driver:hover {
  background: var(--brand-100, #FBE9C2);
}
.cell-lbl {
  font-size: 0.74rem;
  font-weight: 800;
}
</style>
