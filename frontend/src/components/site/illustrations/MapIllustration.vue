<template>
  <svg class="illus-map" viewBox="0 0 480 360" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Route map illustration">
    <defs>
      <pattern id="map-grid2" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M40 0 L0 0 0 40" fill="none" stroke="#BFDBFE" stroke-width="1.5"/>
      </pattern>
      <linearGradient id="map-sea" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#E0F2FE"/>
        <stop offset="1" stop-color="#BAE6FD"/>
      </linearGradient>
    </defs>

    <rect width="480" height="360" rx="24" fill="url(#map-sea)"/>
    <rect width="480" height="360" rx="24" fill="url(#map-grid2)"/>

    <!-- landmass blobs -->
    <path d="M60 260 C100 200 170 210 200 260 C240 260 280 300 250 340 L70 340 Z" fill="#A7F3D0"/>
    <path d="M60 260 C100 200 170 210 200 260 C240 260 280 300 250 340 L70 340 Z" fill="none" stroke="#34D399" stroke-width="3"/>
    <path d="M300 60 C360 40 420 80 420 130 C420 170 380 190 340 170 C300 150 280 110 300 60 Z" fill="#FDE68A"/>
    <path d="M300 60 C360 40 420 80 420 130 C420 170 380 190 340 170 C300 150 280 110 300 60 Z" fill="none" stroke="#F59E0B" stroke-width="3"/>

    <!-- route paths -->
    <g stroke="#EC4899" stroke-width="4" stroke-linecap="round" fill="none">
      <path d="M110 270 C180 240 260 250 340 190"/>
    </g>
    <g stroke="#8B5CF6" stroke-width="3" stroke-dasharray="2 10" stroke-linecap="round" fill="none">
      <path d="M120 240 C190 230 260 220 320 170"/>
    </g>

    <!-- start pin -->
    <path d="M108 268 m-16 0 a16 16 0 1 0 32 0 a16 16 0 1 0 -32 0" fill="#F43F5E"/>
    <circle cx="108" cy="268" r="6" fill="#ffffff"/>
    <!-- end pin -->
    <path d="M342 188 m-16 0 a16 16 0 1 0 32 0 a16 16 0 1 0 -32 0" fill="#4F46E5"/>
    <circle cx="342" cy="188" r="6" fill="#ffffff"/>

    <!-- waypoint -->
    <rect x="232" y="208" width="26" height="26" rx="8" fill="#F59E0B"/>
    <path d="M245 222 l6 8 h-12 Z" fill="#ffffff"/>

    <!-- label chips -->
    <g font-family="'Inter',sans-serif">
      <rect x="70" y="286" width="88" height="30" rx="15" fill="#F43F5E"/>
      <text x="114" y="306" font-size="12" font-weight="700" fill="#ffffff" text-anchor="middle">Lagos</text>
      <rect x="330" y="206" width="84" height="30" rx="15" fill="#4F46E5"/>
      <text x="372" y="226" font-size="12" font-weight="700" fill="#ffffff" text-anchor="middle">Abuja</text>
    </g>

    <!-- compass -->
    <g transform="translate(60,70)">
      <circle cx="0" cy="0" r="34" fill="#ffffff" stroke="#F59E0B" stroke-width="2.5"/>
      <path d="M0 -22 L7 12 L0 7 L-7 12 Z" fill="#EC4899"/>
      <text x="0" y="46" font-family="'Inter',sans-serif" font-size="10" font-weight="700" fill="#1F2937" text-anchor="middle">N</text>
    </g>

    <!-- travel dots along route -->
    <circle cx="150" cy="238" r="5" fill="#F59E0B"/>
    <circle cx="200" cy="222" r="5" fill="#FBBF24"/>
    <circle cx="250" cy="212" r="5" fill="#FBBF24"/>
    <circle cx="300" cy="196" r="5" fill="#F59E0B"/>
  </svg>
</template>

<style scoped>
.illus-map { width: 100%; height: auto; display: block; }
</style>