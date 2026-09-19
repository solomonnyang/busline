<template>
  <svg class="illus-phone" viewBox="0 0 320 520" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="BusLine mobile app illustration">
    <defs>
      <linearGradient id="phone-screen2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#312E81"/>
        <stop offset="1" stop-color="#1E1B4B"/>
      </linearGradient>
      <linearGradient id="phone-btn" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#6366F1"/>
        <stop offset="1" stop-color="#8B5CF6"/>
      </linearGradient>
    </defs>

    <!-- floating background shapes -->
    <circle cx="60" cy="70" r="120" fill="#C7D2FE"/>
    <circle cx="280" cy="460" r="150" fill="#FDE68A"/>
    <circle cx="248" cy="40" r="50" fill="#FECACA"/>

    <!-- phone body -->
    <rect x="36" y="0" width="248" height="520" rx="44" fill="#111827"/>
    <rect x="44" y="8" width="232" height="504" rx="40" fill="url(#phone-screen2)"/>
    <rect x="120" y="14" width="80" height="22" rx="11" fill="#0F172A"/>

    <!-- screen header -->
    <circle cx="70" cy="48" r="6" fill="#FBBF24"/>
    <text x="86" y="54" font-family="'Inter',sans-serif" font-size="17" font-weight="700" fill="#ffffff">BusLine</text>

    <!-- greeting -->
    <text x="66" y="92" font-family="'Inter',sans-serif" font-size="15" font-weight="600" fill="#C7D2FE">Good day, Traveller</text>

    <!-- search boxes -->
    <g>
      <rect x="46" y="116" width="228" height="34" rx="17" fill="#4338CA"/>
      <circle cx="72" cy="133" r="4" fill="#FBBF24"/>
      <text x="84" y="138" font-family="'Inter',sans-serif" font-size="13" font-weight="500" fill="#ffffff">From · Lagos</text>
      <rect x="46" y="154" width="228" height="34" rx="17" fill="#4338CA"/>
      <circle cx="72" cy="171" r="4" fill="#FBBF24"/>
      <text x="84" y="176" font-family="'Inter',sans-serif" font-size="13" font-weight="500" fill="#ffffff">To · Abuja</text>
    </g>

    <!-- ticket card -->
    <g>
      <rect x="46" y="204" width="228" height="150" rx="20" fill="#ffffff"/>
      <text x="62" y="232" font-family="'Inter',sans-serif" font-size="11" font-weight="700" fill="#9CA3AF">TICKET</text>
      <rect x="62" y="244" width="98" height="26" rx="8" fill="#EEF2FF"/>
      <text x="72" y="262" font-family="'Inter',sans-serif" font-size="13" font-weight="700" fill="#312E81">Lagos − Abuja</text>
      <line x1="62" y1="286" x2="258" y2="286" stroke="#E5E7EB" stroke-width="2" stroke-dasharray="6 6"/>
      <g font-family="'Inter',sans-serif" font-size="12">
        <text x="62" y="312" fill="#9CA3AF">Price</text><text x="258" y="312" text-anchor="end" font-weight="700" fill="#111827">₦15,500</text>
        <text x="62" y="334" fill="#9CA3AF">Seat</text><text x="258" y="334" text-anchor="end" font-weight="700" fill="#111827">12A · VIP</text>
      </g>
    </g>

    <!-- book button -->
    <rect x="46" y="368" width="228" height="44" rx="22" fill="url(#phone-btn)"/>
    <text x="160" y="396" font-family="'Inter',sans-serif" font-size="15" font-weight="700" fill="#ffffff" text-anchor="middle">Book now</text>

    <!-- bottom dots -->
    <circle cx="140" cy="492" r="3" fill="#FBBF24" opacity="0.4"/>
    <circle cx="160" cy="492" r="3" fill="#FBBF24"/>
    <circle cx="180" cy="492" r="3" fill="#FBBF24" opacity="0.4"/>
  </svg>
</template>

<style scoped>
.illus-phone { width: 100%; max-width: 300px; height: auto; display: block; margin: 0 auto; }
</style>