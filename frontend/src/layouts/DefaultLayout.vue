<template>
  <div class="page-shell">
    <SiteHeader />
    <main class="page-body">
      <router-view />
    </main>
    <SiteFooter />
  </div>
</template>

<script setup>
import SiteHeader from '../components/site/SiteHeader.vue'
import SiteFooter from '../components/site/SiteFooter.vue'
</script>
