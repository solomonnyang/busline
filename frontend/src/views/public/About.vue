<template>
  <div class="about-page">

    <!-- Hero -->
    <section class="about-hero">
      <div class="container">
        <span class="about-eyebrow">About BusLine</span>
        <h1 class="about-title">{{ s('about.title', 'A better way to move, built together') }}</h1>
        <p class="about-lead">{{ s('about.body', 'BusLine brings travellers, drivers and businesses onto one trusted platform — so every journey is simpler, safer and more rewarding.') }}</p>
      </div>
    </section>

    <!-- Manifesto -->
    <section class="manifesto">
      <div class="container narrow">
        <p class="manifesto-text">{{ s('about.manifesto', 'We believe getting around should bring people closer, not hold them back. Every route we open, every operator we welcome, and every traveller we serve is a step toward a country that moves better — together.') }}</p>
      </div>
    </section>

    <!-- Feature blocks -->
    <section class="feature-blocks">
      <div class="container">
        <div class="feature-row">
          <div class="feature-media">
            <div class="feature-frame"><AboutNetworkIllustration /></div>
          </div>
          <div class="feature-copy">
            <h2 class="feature-title">{{ s('about.f1_title', 'One network, endless connections') }}</h2>
            <p class="feature-text">{{ s('about.f1_text', 'Passengers, drivers and businesses meet on a single verified network. Whether you’re crossing the city or the country, everything works in one place — routes, operators, and trusted partners.') }}</p>
            <a class="about-link" href="/download"><span>See how it works</span><i class="bi bi-arrow-right"></i></a>
          </div>
        </div>

        <div class="feature-row">
          <div class="feature-copy">
            <h2 class="feature-title">{{ s('about.f2_title', 'Every trip is a story worth telling') }}</h2>
            <p class="feature-text">{{ s('about.f2_text', 'We’re building more than transport. From discovering great destinations to connecting local businesses, BusLine turns an ordinary ride into the start of something new.') }}</p>
            <a class="about-link" href="/vendor-register"><span>Join the journey</span><i class="bi bi-arrow-right"></i></a>
          </div>
          <div class="feature-media">
            <div class="feature-frame"><AboutJourneyIllustration /></div>
          </div>
        </div>

        <div class="feature-row">
          <div class="feature-media">
            <div class="feature-frame"><AboutShieldIllustration /></div>
          </div>
          <div class="feature-copy">
            <h2 class="feature-title">{{ s('about.f3_title', 'Safety is the foundation of trust') }}</h2>
            <p class="feature-text">{{ s('about.f3_text', 'Every operator is verified and every journey is protected. Your data stays private and your rides are backed by technology designed around what matters most — your safety.') }}</p>
            <a class="about-link" href="/download"><span>Explore our promise</span><i class="bi bi-arrow-right"></i></a>
          </div>
        </div>
      </div>
    </section>

    <!-- Values -->
    <section class="values-section">
      <div class="container">
        <h2 class="values-title">{{ s('about.values_title', 'The principles we stand by') }}</h2>
        <div class="values-grid">
          <div v-for="(v, i) in values" :key="i" class="value-card">
            <span class="value-icon"><i :class="valueIcons[i % valueIcons.length]"></i></span>
            <h3>{{ v.title }}</h3>
            <p>{{ v.text }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Keep up with the latest -->
    <section class="latest-section">
      <div class="container">
        <h2 class="latest-title">{{ s('about.latest_title', 'Stay in the loop') }}</h2>
        <div class="latest-grid">
          <div v-for="(card, i) in latest" :key="i" class="latest-card">
            <span class="latest-icon"><i :class="card.icon"></i></span>
            <h3>{{ card.title }}</h3>
            <p>{{ card.text }}</p>
            <a class="about-link" :href="card.href"><span>{{ card.link }}</span><i class="bi bi-arrow-right"></i></a>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="about-cta">
      <div class="container">
        <h2 class="cta-title">{{ s('about.cta_title', 'Let’s move forward together') }}</h2>
        <div class="cta-actions">
          <a href="/download" class="btn btn-light btn-lg cta-btn">Get the app</a>
          <a href="/vendor-register" class="btn btn-outline-light btn-lg cta-btn">Partner with us</a>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import AboutNetworkIllustration from '../../components/site/illustrations/AboutNetworkIllustration.vue'
import AboutJourneyIllustration from '../../components/site/illustrations/AboutJourneyIllustration.vue'
import AboutShieldIllustration from '../../components/site/illustrations/AboutShieldIllustration.vue'
import { s } from '../../composables/useSiteContent'

const valueIcons = ['bi-shield-check', 'bi-hand-thumbs-up', 'bi-globe', 'bi-people']
const values = s('about.values', [
  { title: 'Trust', text: 'Every operator is verified and every journey is accountable.' },
  { title: 'Simplicity', text: 'A clean, easy app that gets you moving without the fuss.' },
  { title: 'Growth', text: 'We help local businesses and operators reach more travellers.' },
  { title: 'Community', text: 'Built around the people and places that make travel meaningful.' },
])

const latest = [
  { icon: 'bi-bell', title: 'Product updates', text: 'Be the first to hear about new features, routes and app releases.', link: 'Read more', href: '/about' },
  { icon: 'bi-book', title: 'Our stories', text: 'Stories from the travellers, drivers and businesses on the BusLine network.', link: 'Read posts', href: '/about' },
  { icon: 'bi-buildings', title: 'Partnerships', text: 'See how we work with operators and brands to grow the platform.', link: 'Learn more', href: '/about' },
]
</script>

<style scoped>
.about-page { background: #fff; }

/* Hero */
.about-hero { padding: 6rem 0 3rem; }
.about-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: #000;
  color: #fff;
  font-weight: 700;
  font-size: 0.78rem;
  letter-spacing: 0.02em;
  padding: 0.35rem 0.95rem;
  border-radius: 999px;
  margin-bottom: 1.4rem;
}
.about-title {
  font-size: clamp(3rem, 6.5vw, 5rem);
  font-weight: 800;
  letter-spacing: -0.035em;
  line-height: 1.02;
  color: #000;
  max-width: 18ch;
  margin-bottom: 1.6rem;
}
.about-lead { color: rgba(0,0,0,0.66); font-size: 1.12rem; max-width: 44rem; margin-bottom: 0; }

/* Manifesto */
.manifesto { padding: 3rem 0 5rem; }
.manifesto .narrow { max-width: 760px; }
.manifesto-text {
  font-size: clamp(1.6rem, 3vw, 2.3rem);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.35;
  color: #000;
  margin-bottom: 0;
}

/* Feature blocks */
.feature-blocks { padding-bottom: 4rem; }
.feature-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
  padding: 3rem 0;
  border-top: 1px solid #ececec;
}
.feature-media { order: 0; }
.feature-row:nth-child(even) .feature-copy { order: -1; }
.feature-frame {
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(0,0,0,0.1);
}
.feature-frame :deep(svg) { width: 100%; height: auto; display: block; }
.feature-title { font-size: 2rem; font-weight: 800; letter-spacing: -0.02em; color: #000; margin-bottom: 1rem; }
.feature-text { color: rgba(0,0,0,0.68); font-size: 1.05rem; line-height: 1.6; margin-bottom: 1.4rem; }

.about-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: #000;
  font-weight: 700;
  text-decoration: none;
  border-bottom: 2px solid #000;
  padding-bottom: 0.3rem;
  transition: gap 0.2s ease, opacity 0.2s ease;
}
.about-link:hover { gap: 0.9rem; color: #000; }

/* Values */
.values-section { background: #f7f7f7; padding: 5rem 0; }
.values-title { font-size: 2.2rem; font-weight: 800; letter-spacing: -0.02em; color: #000; margin-bottom: 2.5rem; }
.values-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; }
.value-card { background: #fff; border-radius: 16px; padding: 1.8rem 1.5rem; border: 1px solid #ececec; }
.value-icon {
  width: 54px; height: 54px; margin-bottom: 1rem; border-radius: 14px;
  background: #000; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.4rem;
}
.value-card h3 { font-weight: 700; font-size: 1.1rem; margin-bottom: 0.5rem; }
.value-card p { color: rgba(0,0,0,0.62); font-size: 0.92rem; margin-bottom: 0; }

/* Latest */
.latest-section { padding: 5rem 0; }
.latest-title { font-size: 2.2rem; font-weight: 800; letter-spacing: -0.02em; color: #000; margin-bottom: 2.5rem; }
.latest-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
.latest-card { padding: 1.5rem; }
.latest-icon { font-size: 1.8rem; color: #000; width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; border: 1px solid #000; border-radius: 14px; margin-bottom: 1rem; }
.latest-card h3 { font-weight: 700; font-size: 1.15rem; margin-bottom: 0.5rem; }
.latest-card p { color: rgba(0,0,0,0.62); font-size: 0.95rem; line-height: 1.5; margin-bottom: 1rem; }

/* CTA */
.about-cta { background: #000; padding: 5rem 0; text-align: center; }
.cta-title { color: #fff; font-size: clamp(2.2rem, 4vw, 3.2rem); font-weight: 800; letter-spacing: -0.03em; margin-bottom: 2rem; }
.cta-actions { display: flex; justify-content: center; gap: 1rem; flex-wrap: wrap; }
.cta-btn { border-radius: 999px; font-weight: 700; }

@media (max-width: 991.98px) {
  .feature-row { grid-template-columns: 1fr; gap: 2rem; }
  .feature-row:nth-child(even) .feature-copy { order: 0; }
  .values-grid { grid-template-columns: 1fr 1fr; }
  .latest-grid { grid-template-columns: 1fr; }
}
@media (max-width: 575.98px) {
  .values-grid { grid-template-columns: 1fr; }
}
</style>