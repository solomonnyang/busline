<template>
  <svg class="illus-shield" viewBox="0 0 480 360" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Safety and trust illustration">
    <defs>
      <linearGradient id="sh-bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#ECFEFF"/>
        <stop offset="1" stop-color="#CFFAFE"/>
      </linearGradient>
      <linearGradient id="sh-shield" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#22D3EE"/>
        <stop offset="1" stop-color="#0E7490"/>
      </linearGradient>
      <pattern id="sh-dots" width="26" height="26" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1.5" fill="#A5F3FC"/>
      </pattern>
    </defs>

    <rect width="480" height="360" rx="24" fill="url(#sh-bg)"/>
    <rect width="480" height="360" rx="24" fill="url(#sh-dots)"/>

    <!-- radiating rings -->
    <circle cx="240" cy="180" r="120" fill="none" stroke="#A5F3FC" stroke-width="3"/>
    <circle cx="240" cy="180" r="96" fill="none" stroke="#67E8F9" stroke-width="3"/>

    <!-- shield -->
    <path d="M240 60 L340 104 V196 C340 244 296 280 240 300 C184 280 140 244 140 196 V104 Z" fill="url(#sh-shield)"/>
    <path d="M240 60 L340 104 V196 C340 244 296 280 240 300 C184 280 140 244 140 196 V104 Z" fill="none" stroke="#155E75" stroke-width="4"/>

    <!-- check mark -->
    <path d="M198 180 L228 212 L286 148" stroke="#ffffff" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>

    <!-- small floating icons around shield -->
    <g>
      <circle cx="118" cy="96" r="22" fill="#ffffff" stroke="#F59E0B" stroke-width="2.5"/>
      <path d="M112 96 h12 M118 90 v12" stroke="#F59E0B" stroke-width="3" stroke-linecap="round"/>
      <circle cx="366" cy="110" r="22" fill="#ffffff" stroke="#EC4899" stroke-width="2.5"/>
      <path d="M366 102 l7 8 -7 8 -7 -8 Z" fill="#EC4899"/>
      <circle cx="342" cy="268" r="22" fill="#ffffff" stroke="#10B981" stroke-width="2.5"/>
      <path d="M333 268 l7 7 10 -12" stroke="#10B981" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="132" cy="252" r="22" fill="#ffffff" stroke="#8B5CF6" stroke-width="2.5"/>
      <text x="132" y="258" font-family="'Inter',sans-serif" font-size="16" font-weight="700" fill="#6D28D9" text-anchor="middle">%</text>
    </g>

    <!-- label chip -->
    <g font-family="'Inter',sans-serif">
      <rect x="180" y="330" width="120" height="32" rx="16" fill="#155E75"/>
      <text x="240" y="351" font-size="13" font-weight="700" fill="#ffffff" text-anchor="middle">Verified &amp; secure</text>
    </g>
  </svg>
</template>

<style scoped>
.illus-shield { width: 100%; height: auto; display: block; }
</style>