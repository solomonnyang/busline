<template>
  <svg class="illus-hero" viewBox="0 0 640 480" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Modern bus and route illustration">
    <defs>
      <pattern id="hero-dots" width="24" height="24" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1.6" fill="#c7d2fe"/>
      </pattern>
      <linearGradient id="hero-sky" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#EEF2FF"/>
        <stop offset="1" stop-color="#E0E7FF"/>
      </linearGradient>
      <linearGradient id="hero-bus" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#6366F1"/>
        <stop offset="1" stop-color="#4F46E5"/>
      </linearGradient>
      <linearGradient id="hero-door" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#8B5CF6"/>
        <stop offset="1" stop-color="#6D28D9"/>
      </linearGradient>
    </defs>

    <!-- background -->
    <rect width="640" height="480" rx="28" fill="url(#hero-sky)"/>
    <rect width="640" height="480" rx="28" fill="url(#hero-dots)"/>

    <!-- sun -->
    <circle cx="500" cy="116" r="66" fill="#FBBF24"/>

    <!-- hills -->
    <path d="M0 300 C90 210 180 210 250 304 Z" fill="#A7F3D0"/>
    <path d="M410 300 C520 190 620 200 640 286 L640 300 Z" fill="#6EE7B7"/>

    <!-- buildings skyline -->
    <g fill="#C7D2FE">
      <rect x="40" y="212" width="54" height="88" rx="6"/>
      <rect x="104" y="236" width="46" height="64" rx="6"/>
      <rect x="348" y="196" width="60" height="104" rx="6"/>
      <rect x="418" y="228" width="48" height="72" rx="6"/>
    </g>
    <g fill="#A5B4FC">
      <rect x="54" y="226" width="12" height="12" rx="2"/>
      <rect x="72" y="226" width="12" height="12" rx="2"/>
      <rect x="54" y="246" width="12" height="12" rx="2"/>
      <rect x="72" y="246" width="12" height="12" rx="2"/>
      <rect x="364" y="212" width="12" height="12" rx="2"/>
      <rect x="382" y="212" width="12" height="12" rx="2"/>
      <rect x="364" y="232" width="12" height="12" rx="2"/>
      <rect x="382" y="232" width="12" height="12" rx="2"/>
    </g>

    <!-- road -->
    <path d="M-20 430 L140 332 L300 380 L480 316 L660 368" stroke="#312E81" stroke-width="26" stroke-linecap="round"/>
    <path d="M-20 430 L140 332 L300 380 L480 316 L660 368" stroke="#FDE68A" stroke-width="10" stroke-linecap="round" stroke-dasharray="2 16"/>

    <!-- bus -->
    <g transform="translate(196,150)">
      <rect x="0" y="42" width="176" height="104" rx="20" fill="url(#hero-bus)"/>
      <rect x="0" y="42" width="176" height="104" rx="20" stroke="#3730A3" stroke-width="3"/>
      <rect x="10" y="96" width="156" height="20" rx="10" fill="#C7D2FE"/>
      <g>
        <rect x="16" y="58" width="30" height="30" rx="6" fill="#FEF3C7"/>
        <rect x="56" y="58" width="30" height="30" rx="6" fill="#FBBF24"/>
        <rect x="96" y="58" width="30" height="30" rx="6" fill="#FDE68A"/>
        <rect x="136" y="58" width="30" height="30" rx="6" fill="#FEF3C7"/>
      </g>
      <rect x="56" y="96" width="46" height="50" rx="8" fill="url(#hero-door)"/>
      <rect x="56" y="96" width="46" height="50" rx="8" stroke="#4C1D95" stroke-width="2"/>
      <line x1="79" y1="96" x2="79" y2="146" stroke="#4C1D95" stroke-width="2"/>
      <rect x="4" y="78" width="8" height="8" rx="2" fill="#ECFDF5"/>
      <line x1="46" y1="58" x2="46" y2="88" stroke="#A5B4FC" stroke-width="2"/>
      <line x1="86" y1="58" x2="86" y2="88" stroke="#A5B4FC" stroke-width="2"/>
      <line x1="126" y1="58" x2="126" y2="88" stroke="#A5B4FC" stroke-width="2"/>
    </g>

    <!-- wheels -->
    <g fill="#1E1B4B">
      <circle cx="228" cy="300" r="26"/>
      <circle cx="368" cy="300" r="26"/>
    </g>
    <g fill="#FBBF24">
      <circle cx="228" cy="300" r="11"/>
      <circle cx="368" cy="300" r="11"/>
    </g>
    <circle cx="228" cy="300" r="4" fill="#1E1B4B"/>
    <circle cx="368" cy="300" r="4" fill="#1E1B4B"/>

    <!-- location pins -->
    <path d="M120 408 m-12 0 a12 12 0 1 0 24 0 a12 12 0 1 0 -24 0" fill="#F43F5E"/>
    <circle cx="120" cy="408" r="5" fill="#ffffff"/>
    <path d="M520 380 m-12 0 a12 12 0 1 0 24 0 a12 12 0 1 0 -24 0" fill="#F43F5E"/>
    <circle cx="520" cy="380" r="5" fill="#ffffff"/>

    <!-- route dashed line -->
    <path d="M154 372 C260 330 380 300 500 366" stroke="#8B5CF6" stroke-width="3" stroke-dasharray="6 10" stroke-linecap="round"/>

    <!-- floating chips -->
    <g>
      <rect x="470" y="210" width="108" height="34" rx="17" fill="#4F46E5"/>
      <text x="524" y="232" font-family="'Inter',sans-serif" font-size="14" font-weight="700" fill="#ffffff" text-anchor="middle">5,000+ trips</text>
      <rect x="36" y="120" width="112" height="34" rx="17" fill="#ffffff" stroke="#F59E0B" stroke-width="2"/>
      <circle cx="56" cy="137" r="5" fill="#10B981"/>
      <text x="68" y="142" font-family="'Inter',sans-serif" font-size="13" font-weight="600" fill="#1F2937">Verified</text>
    </g>
  </svg>
</template>

<style scoped>
.illus-hero { width: 100%; height: auto; display: block; }
</style>