<template>
  <div class="bus-seatmap">
    <div class="bus-shell">
      <!-- Front of the bus -->
      <div class="bus-front">
        <span class="bus-front-lbl">FRONT</span>
      </div>

      <!-- Cabin with seats -->
      <div class="bus-cabin">
        <div class="bus-window left"></div>
        <div class="bus-seats">
          <template v-if="renderedGrid.length">
            <div v-for="row in renderedGrid" :key="row.label" class="bus-row">
              <span class="bus-row-lbl">{{ row.label }}</span>
              <template v-for="cell in row.cells" :key="cell.key">
                <div v-if="cell.driver" class="bus-driver-seat" title="Driver">
                  <span class="bus-driver-wheel"><i class="bi bi-person-fill"></i></span>
                  <span class="bus-driver-lbl">Driver</span>
                </div>
                <div v-else-if="cell.gap" class="bus-aisle"></div>
                <button
                  v-else
                  type="button"
                  class="bus-seat"
                  :class="{
                    avail: !cell.seat.reserved && !selectedIds.includes(cell.seat.id),
                    selected: selectedIds.includes(cell.seat.id),
                    booked: cell.seat.reserved,
                  }"
                  :disabled="cell.seat.reserved"
                  :title="`Seat ${cell.seat.seat_number}${cell.seat.reserved ? ' (booked)' : ''}`"
                  @click="toggle(cell.seat)"
                >
                  {{ cell.seat.seat_number }}
                </button>
              </template>
            </div>
          </template>
          <template v-else>
            <div v-for="row in rowGroups" :key="row" class="bus-row">
              <span class="bus-row-lbl">{{ row }}</span>
              <template v-for="seat in seatsInRow(row)" :key="seat.id">
                <div class="bus-aisle" v-if="aisleAfter(seat)"></div>
                <button
                  type="button"
                  class="bus-seat"
                  :class="{
                    avail: !seat.reserved && !selectedIds.includes(seat.id),
                    selected: selectedIds.includes(seat.id),
                    booked: seat.reserved,
                  }"
                  :disabled="seat.reserved"
                  :title="`Seat ${seat.seat_number}${seat.reserved ? ' (booked)' : ''}`"
                  @click="toggle(seat)"
                >
                  {{ seat.seat_number }}
                </button>
              </template>
            </div>
          </template>
        </div>
        <div class="bus-window right"></div>
      </div>

      <!-- Rear of the bus -->
      <div class="bus-rear">
        <span>REAR</span>
      </div>
    </div>

    <div class="bus-legend">
      <span><i class="bus-dot avail"></i>Available</span>
      <span><i class="bus-dot selected"></i>Selected</span>
      <span><i class="bus-dot booked"></i>Booked</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  seats: { type: Array, default: () => [] },
  modelValue: { type: Array, default: () => [] },
  max: { type: Number, default: 10 },
  replaceSource: { type: Array, default: () => [] },
  layout: { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue'])

const selectedIds = computed(() => props.modelValue)

// Explicit multi-row grid from the bus layout, e.g. { rows: [["A","B",null,"C","D"], ...] }.
// null/'' marks an aisle gap or empty slot; a label maps to a physical seat.
const gridRows = computed(() => {
  const l = props.layout
  if (l && Array.isArray(l.rows)) return l.rows
  return null
})

function seatAt(row, column) {
  return props.seats.find((s) => Number(s.seat_row) === row && String(s.seat_column) === String(column)) || null
}

const renderedGrid = computed(() => {
  if (!gridRows.value) return []
  return gridRows.value.map((cells, ri) => ({
    label: ri + 1,
    cells: cells.map((cell, ci) => {
      const driver = typeof cell === 'string' && cell.toUpperCase() === 'DRIVER'
      const gap = !driver && (cell === null || cell === '')
      return { key: ci, driver, gap, seat: driver || gap ? null : seatAt(ri + 1, cell) }
    }),
  }))
})

const columnOrder = computed(() => {
  return [...new Set(props.seats.map((s) => String(s.seat_column)))]
    .sort((a, b) => a.localeCompare(b))
})

const rowGroups = computed(() => {
  const rows = [...new Set(props.seats.map((s) => Number(s.seat_row)))]
  return rows.sort((a, b) => a - b)
})

function seatsInRow(row) {
  return props.seats
    .filter((s) => Number(s.seat_row) === row)
    .sort((a, b) => String(a.seat_column).localeCompare(String(b.seat_column)))
}

// Insert an aisle at the middle column split (2+2 → between B and C).
function aisleAfter(seat) {
  const idx = columnOrder.value.indexOf(String(seat.seat_column))
  return idx === Math.floor(columnOrder.value.length / 2) - 1
}

function toggle(seat) {
  if (seat.reserved) return
  const idx = selectedIds.value.indexOf(seat.id)
  if (idx >= 0) {
    emit('update:modelValue', selectedIds.value.filter((id) => id !== seat.id))
    return
  }
  const originalsSelected = selectedIds.value.filter((id) => props.replaceSource.includes(id))
  if (originalsSelected.length > 0) {
    emit('update:modelValue', [...selectedIds.value.filter((id) => id !== originalsSelected[0]), seat.id])
  } else if (selectedIds.value.length < props.max) {
    emit('update:modelValue', [...selectedIds.value, seat.id])
  }
}
</script>

<style scoped>
.bus-seatmap {
  padding: 0.25rem 0;
}

/* Bus body shell */
.bus-shell {
  max-width: 430px;
  margin: 0 auto;
  background: linear-gradient(180deg, var(--surface) 0%, var(--surface) 40%, var(--surface-3) 100%);
  border: 1.5px solid var(--border);
  border-radius: 26px 26px 32px 32px;
  padding: 0.7rem 0.6rem 0.5rem;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.7),
    0 12px 30px rgba(14, 147, 132, 0.14);
  position: relative;
}

/* Front section */
.bus-front {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  padding-bottom: 0.6rem;
  margin-bottom: 0.65rem;
  border-bottom: 2px dashed var(--brand-100);
}
.bus-driver-seat {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 0.15rem;
  width: 42px;
  height: 46px;
  padding-bottom: 0.3rem;
  background: var(--surface);
  border: 1.5px dashed var(--muted-light);
  border-radius: 12px;
  color: var(--text);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
  flex-shrink: 0;
}
.bus-driver-seat::before {
  content: '';
  position: absolute;
  top: 3px;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 6px;
  border-radius: 999px;
  background: var(--border);
}
.bus-driver-wheel {
  color: var(--brand);
  font-size: 1rem;
  line-height: 1;
}
.bus-driver-lbl {
  font-size: 0.55rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: var(--muted);
  text-transform: uppercase;
}
.bus-front-lbl {
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: var(--text);
}

/* Cabin grid */
.bus-cabin {
  display: grid;
  grid-template-columns: 9px minmax(0, 1fr) 9px;
  gap: 0.4rem;
  align-items: stretch;
}
.bus-window {
  border-radius: 999px;
  background: linear-gradient(180deg, var(--surface-3), var(--surface-3) 50%, var(--surface-3));
  box-shadow: 0 2px 8px rgba(14, 147, 132, 0.35);
  opacity: 0.85;
}

/* Seats area */
.bus-seats { min-width: 0; }
.bus-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  margin-bottom: 0.5rem;
}
.bus-row-lbl {
  width: 15px;
  text-align: center;
  font-size: 0.62rem;
  font-weight: 800;
  color: var(--muted-light);
  flex-shrink: 0;
}
.bus-aisle {
  width: 1.15rem;
  flex-shrink: 0;
}

/* Individual seat — styled like a coach backrest */
.bus-seat {
  position: relative;
  width: 42px;
  height: 44px;
  display: grid;
  place-items: center;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 800;
  font-size: 0.76rem;
  color: var(--text);
  background: linear-gradient(180deg, var(--surface), var(--surface));
  border: 1.5px solid var(--muted-light);
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(43, 31, 25, 0.07);
  transition: all 0.15s ease;
  cursor: pointer;
  flex-shrink: 0;
}
.bus-seat::before {
  content: '';
  position: absolute;
  top: 3px;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 6px;
  border-radius: 999px;
  background: var(--border);
}
.bus-seat.avail:hover {
  border-color: var(--brand);
  background: linear-gradient(180deg, var(--surface), var(--surface-2));
  box-shadow: 0 4px 10px rgba(14, 147, 132, 0.28);
  transform: translateY(-2px);
}
.bus-seat.selected {
  background: linear-gradient(180deg, var(--brand-600), var(--brand));
  border-color: var(--brand);
  color: var(--text);
  box-shadow: 0 6px 14px rgba(14, 147, 132, 0.42);
}
.bus-seat.selected::before { background: var(--surface-2); }
.bus-seat.booked {
  background: #E9F2F0;
  border-color: var(--border);
  color: var(--muted-light);
  cursor: not-allowed;
  box-shadow: none;
}
.bus-seat.booked::before { background: var(--border); }

/* Rear section */
.bus-rear {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding-top: 0.55rem;
  margin-top: 0.6rem;
  border-top: 2px dashed var(--brand-100);
  color: var(--text);
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.1em;
}

/* Legend */
.bus-legend {
  display: flex;
  justify-content: center;
  gap: 1.2rem;
  flex-wrap: wrap;
  margin-top: 0.85rem;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--muted);
  align-items: center;
}
.bus-dot {
  display: inline-block;
  width: 13px;
  height: 13px;
  border-radius: 5px;
  margin-right: 0.35rem;
  vertical-align: -2px;
  border: 1px solid var(--muted-light);
}
.bus-dot.avail { background: var(--surface); border-color: var(--border); }
.bus-dot.selected { background: var(--brand); border-color: var(--brand); }
.bus-dot.booked { background: #E9F2F0; border-color: var(--border); }
</style>
