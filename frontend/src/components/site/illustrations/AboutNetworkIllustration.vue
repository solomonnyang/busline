<template>
  <svg class="illus-network" viewBox="0 0 480 360" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Connected travel network illustration">
    <defs>
      <linearGradient id="net-bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#FDF4FF"/>
        <stop offset="1" stop-color="#FAE8FF"/>
      </linearGradient>
      <pattern id="net-dots" width="26" height="26" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1.5" fill="#E9D5FF"/>
      </pattern>
    </defs>

    <rect width="480" height="360" rx="24" fill="url(#net-bg)"/>
    <rect width="480" height="360" rx="24" fill="url(#net-dots)"/>

    <!-- city cluster (bottom left) -->
    <g fill="#FBCFE8">
      <rect x="40" y="224" width="40" height="66" rx="6"/>
      <rect x="86" y="248" width="34" height="42" rx="6"/>
    </g>
    <g fill="#F472B6">
      <rect x="52" y="236" width="9" height="9" rx="2"/>
      <rect x="66" y="236" width="9" height="9" rx="2"/>
    </g>
    <!-- city cluster (bottom right) -->
    <g fill="#C7D2FE">
      <rect x="400" y="220" width="42" height="70" rx="6"/>
      <rect x="352" y="244" width="34" height="46" rx="6"/>
    </g>
    <g fill="#818CF8">
      <rect x="414" y="234" width="9" height="9" rx="2"/>
      <rect x="428" y="234" width="9" height="9" rx="2"/>
    </g>

    <!-- connection lines -->
    <g stroke="#A78BFA" stroke-width="3" stroke-linecap="round">
      <path d="M100 160 C150 120 220 200 260 150"/>
      <path d="M300 150 C320 230 360 240 420 210"/>
      <path d="M240 150 C220 200 160 190 120 226"/>
    </g>

    <!-- node hubs -->
    <g>
      <circle cx="100" cy="160" r="26" fill="#8B5CF6"/>
      <circle cx="100" cy="160" r="11" fill="#ffffff"/>
      <path d="M100 156 l4 6 h-8 Z" fill="#8B5CF6"/>
      <circle cx="300" cy="150" r="34" fill="#EC4899"/>
      <circle cx="300" cy="150" r="14" fill="#ffffff"/>
      <circle cx="300" cy="150" r="6" fill="#EC4899"/>
      <circle cx="420" cy="210" r="24" fill="#6366F1"/>
      <circle cx="420" cy="210" r="10" fill="#ffffff"/>
      <circle cx="420" cy="210" r="4" fill="#6366F1"/>
    </g>

    <!-- travellers (small persons) -->
    <g>
      <circle cx="180" cy="120" r="9" fill="#F59E0B"/>
      <path d="M180 132 C172 132 168 142 168 152 h24 C192 142 188 132 180 132 Z" fill="#F59E0B"/>
      <circle cx="360" cy="128" r="9" fill="#10B981"/>
      <path d="M360 140 C352 140 348 150 348 160 h24 C372 150 368 140 360 140 Z" fill="#10B981"/>
    </g>

    <!-- handshake / partner badge -->
    <g transform="translate(214,250)">
      <circle cx="0" cy="0" r="30" fill="#ffffff" stroke="#8B5CF6" stroke-width="2.5"/>
      <text x="0" y="-3" font-family="'Inter',sans-serif" font-size="12" font-weight="700" fill="#6D28D9" text-anchor="middle">trusted</text>
      <text x="0" y="12" font-family="'Inter',sans-serif" font-size="12" font-weight="700" fill="#6D28D9" text-anchor="middle">network</text>
    </g>

    <!-- label chips -->
    <g font-family="'Inter',sans-serif">
      <rect x="52" y="90" width="96" height="30" rx="15" fill="#EC4899"/>
      <text x="100" y="110" font-size="12" font-weight="700" fill="#ffffff" text-anchor="middle">Travellers</text>
      <rect x="344" y="94" width="104" height="30" rx="15" fill="#10B981"/>
      <text x="396" y="114" font-size="12" font-weight="700" fill="#ffffff" text-anchor="middle">Operators</text>
    </g>
  </svg>
</template>

<style scoped>
.illus-network { width: 100%; height: auto; display: block; }
</style>