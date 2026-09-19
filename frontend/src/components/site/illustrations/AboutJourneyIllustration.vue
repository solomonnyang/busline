<template>
  <svg class="illus-journey" viewBox="0 0 480 360" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Journey on the road illustration">
    <defs>
      <linearGradient id="jny-sky" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#FEF9C3"/>
        <stop offset="1" stop-color="#FDE68A"/>
      </linearGradient>
      <linearGradient id="jny-truck" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#60A5FA"/>
        <stop offset="1" stop-color="#2563EB"/>
      </linearGradient>
      <pattern id="jny-dots" width="26" height="26" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1.5" fill="#FDE68A"/>
      </pattern>
    </defs>

    <rect width="480" height="360" rx="24" fill="url(#jny-sky)"/>
    <rect width="480" height="360" rx="24" fill="url(#jny-dots)"/>

    <!-- sun -->
    <circle cx="400" cy="70" r="44" fill="#FBBF24"/>

    <!-- distant hills -->
    <path d="M0 200 C80 150 160 150 240 210 C320 150 400 160 480 210 L480 250 L0 250 Z" fill="#A7F3D0"/>
    <path d="M0 224 C120 180 260 190 480 230 L480 250 L0 250 Z" fill="#6EE7B7"/>

    <!-- road -->
    <path d="M-20 320 L160 268 L320 300 L500 252" stroke="#1F2937" stroke-width="30" stroke-linecap="round"/>
    <path d="M-20 320 L160 268 L320 300 L500 252" stroke="#FDE68A" stroke-width="12" stroke-linecap="round" stroke-dasharray="4 18"/>

    <!-- dotted route ahead -->
    <path d="M-10 260 C120 220 260 180 480 210" stroke="#F59E0B" stroke-width="4" stroke-dasharray="2 14" stroke-linecap="round"/>

    <!-- journey car / bus -->
    <g transform="translate(120,170)">
      <path d="M20 40 Q14 40 12 46 L8 62 Q6 68 12 68 L66 68 Q72 68 70 62 L66 46 Q64 40 58 40 Z" fill="url(#jny-truck)"/>
      <rect x="24" y="20" width="36" height="22" rx="6" fill="#93C5FD"/>
      <rect x="32" y="-6" width="20" height="28" rx="4" fill="#DBEAFE"/>
      <rect x="36" y="-2" width="12" height="14" rx="2" fill="#93C5FD"/>
      <line x1="42" y1="-6" x2="42" y2="12" stroke="#3B82F6" stroke-width="2"/>
      <line x1="36" y1="4" x2="48" y2="4" stroke="#3B82F6" stroke-width="1.5"/>
      <line x1="36" y1="9" x2="46" y2="9" stroke="#3B82F6" stroke-width="1.5"/>
    </g>

    <!-- wheels -->
    <g fill="#111827">
      <circle cx="152" cy="252" r="22"/>
      <circle cx="272" cy="262" r="22"/>
      <circle cx="248" cy="188" r="14"/>
      <circle cx="312" cy="192" r="14"/>
    </g>
    <g fill="#FBBF24">
      <circle cx="152" cy="252" r="9"/>
      <circle cx="272" cy="262" r="9"/>
      <circle cx="248" cy="188" r="5"/>
      <circle cx="312" cy="192" r="5"/>
    </g>

    <!-- location pin on route -->
    <path d="M420 140 m-14 0 a14 14 0 1 0 28 0 a14 14 0 1 0 -28 0" fill="#F43F5E"/>
    <circle cx="420" cy="140" r="5" fill="#ffffff"/>

    <!-- flag / destination -->
    <g transform="translate(180,80)">
      <line x1="0" y1="0" x2="0" y2="46" stroke="#1F2937" stroke-width="4" stroke-linecap="round"/>
      <path d="M0 4 L34 12 L0 20 Z" fill="#EC4899"/>
      <text x="50" y="22" font-family="'Inter',sans-serif" font-size="13" font-weight="700" fill="#BE185D">Next stop</text>
    </g>

    <!-- motion lines -->
    <g stroke="#FBBF24" stroke-width="3" stroke-linecap="round">
      <line x1="80" y1="120" x2="110" y2="120"/>
      <line x1="70" y1="136" x2="96" y2="136"/>
      <line x1="88" y1="152" x2="108" y2="152"/>
    </g>
  </svg>
</template>

<style scoped>
.illus-journey { width: 100%; height: auto; display: block; }
</style>