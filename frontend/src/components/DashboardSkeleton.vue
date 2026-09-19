<template>
  <div class="py-2">
    <div class="mb-4">
      <div class="skeleton mb-2" style="width: 140px; height: 14px"></div>
      <div class="skeleton mb-2" style="width: 260px; height: 26px"></div>
      <div class="skeleton" style="width: 340px; max-width: 80%; height: 12px"></div>
    </div>

    <div class="row g-3 g-lg-4 mb-4">
      <div v-for="i in 4" :key="i" class="col-6 col-xl-3">
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

    <div class="row g-3 g-lg-4 mb-4">
      <div v-for="i in 3" :key="i" class="col-lg-4">
        <div class="soft-card h-100">
          <div class="p-3 pb-0">
            <div class="skeleton mb-2" style="width: 150px; height: 16px"></div>
          </div>
          <div class="p-3">
            <div class="skeleton mb-2" style="width: 80px; height: 30px"></div>
            <div class="skeleton mb-2" style="width: 100%; height: 12px"></div>
            <div class="skeleton mb-2" style="width: 85%; height: 12px"></div>
            <div class="skeleton" style="width: 60%; height: 12px"></div>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-3 g-lg-4">
      <div class="col-lg-7">
        <div class="soft-card h-100">
          <div class="p-3 pb-0">
            <div class="skeleton mb-2" style="width: 150px; height: 16px"></div>
          </div>
          <div class="p-3">
            <div v-for="i in 3" :key="i" class="skeleton mb-2" style="width: 100%; height: 34px"></div>
          </div>
        </div>
      </div>
      <div class="col-lg-5">
        <div class="soft-card h-100">
          <div class="p-3 pb-0">
            <div class="skeleton mb-2" style="width: 150px; height: 16px"></div>
          </div>
          <div class="p-3">
            <div v-for="i in 3" :key="i" class="skeleton mb-2" style="width: 100%; height: 42px"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
