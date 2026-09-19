<template>
  <div class="py-2">
    <div class="mb-4">
      <div class="skeleton mb-2" style="width: 130px; height: 14px"></div>
      <div class="skeleton mb-2" style="width: 240px; height: 26px"></div>
      <div class="skeleton mb-3" style="width: 340px; max-width: 80%; height: 12px"></div>
      <div class="d-flex gap-2">
        <div class="skeleton" style="width: 120px; height: 36px; border-radius: 10px"></div>
        <div class="skeleton" style="width: 120px; height: 36px; border-radius: 10px"></div>
      </div>
    </div>

    <div v-if="statCards > 0" class="row g-3 g-lg-4 mb-4">
      <div v-for="i in statCards" :key="i" class="col-6 col-xl-3">
        <div class="stat-widget">
          <div class="d-flex justify-content-between align-items-start mb-3">
            <div class="skeleton" style="width: 48px; height: 48px; border-radius: 14px"></div>
            <div class="skeleton" style="width: 56px; height: 18px"></div>
          </div>
          <div class="skeleton mb-2" style="width: 90px; height: 32px"></div>
          <div class="skeleton" style="width: 70px; height: 12px"></div>
        </div>
      </div>
    </div>

    <div class="soft-card">
      <div class="p-3 pb-0 d-flex align-items-center gap-3">
        <div class="skeleton" style="width: 200px; height: 36px; border-radius: 10px"></div>
        <div class="skeleton" style="width: 130px; height: 32px; border-radius: 8px"></div>
        <div class="skeleton ms-auto" style="width: 80px; height: 14px"></div>
      </div>
      <div class="p-3">
        <div v-for="i in rows" :key="i" class="d-flex align-items-center gap-3 mb-3">
          <div class="skeleton flex-grow-1" style="height: 40px"></div>
          <div class="skeleton" style="width: 120px; height: 40px"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  statCards: { type: Number, default: 4 },
  rows: { type: Number, default: 4 },
})
</script>
