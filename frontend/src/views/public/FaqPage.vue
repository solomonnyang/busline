<template>
  <div class="page-faq">
    <!-- Page header -->
    <header class="faq-hero">
      <div class="container text-center position-relative">
        <nav class="d-flex justify-content-center" aria-label="breadcrumb">
          <ol class="breadcrumb">
            <li class="breadcrumb-item"><router-link to="/">Home</router-link></li>
            <li class="breadcrumb-item active" aria-current="page">FAQs</li>
          </ol>
        </nav>
        <h1 class="catalog-title">How can we help?</h1>
        <p class="catalog-sub mx-auto">
          Answers to the questions travelers ask most. Can't find what you need? Our team replies within minutes.
        </p>

        <!-- Quick search -->
        <div class="faq-search position-relative mx-auto mt-4">
          <i class="bi bi-search" aria-hidden="true"></i>
          <input
            v-model.trim="query"
            type="search"
            class="form-control form-control-lg"
            placeholder="Search answers - e.g. refund, seat, payment"
            aria-label="Search frequently asked questions"
          />
        </div>
      </div>
    </header>

    <section class="section pt-4 pb-5">
      <div class="container">

        <!-- Category chips -->
        <div v-if="!query" class="faq-tabs d-flex flex-wrap justify-content-center gap-2 mb-5" role="tablist" aria-label="FAQ categories">
          <button
            v-for="cat in categories"
            :key="cat"
            type="button"
            class="faq-tab"
            role="tab"
            :aria-selected="activeCategory === cat ? 'true' : 'false'"
            :class="{ active: activeCategory === cat }"
            @click="activeCategory = cat"
          >
            {{ cat }}
          </button>
        </div>

        <!-- Search results -->
        <template v-if="query">
          <p class="text-center small text-muted mb-4" role="status">
            <strong>{{ searchResults.length }}</strong> result{{ searchResults.length === 1 ? '' : 's' }} for "{{ query }}"
          </p>
          <div v-if="searchResults.length" class="accordion faq-accordion mx-auto" id="faqSearchAccordion">
            <div v-for="(item, i) in searchResults" :key="'s' + i" class="accordion-item">
              <h3 class="accordion-header">
                <button
                  class="accordion-button"
                  :class="{ collapsed: i !== 0 }"
                  type="button"
                  data-bs-toggle="collapse"
                  :data-bs-target="'#faq-search-' + i"
                  :aria-expanded="i === 0 ? 'true' : 'false'"
                  :aria-controls="'faq-search-' + i"
                >
                  <span class="faq-cat-tag me-2">{{ item.category }}</span>{{ item.q }}
                </button>
              </h3>
              <div
                :id="'faq-search-' + i"
                class="accordion-collapse collapse"
                :class="{ show: i === 0 }"
                data-bs-parent="#faqSearchAccordion"
              >
                <div class="accordion-body">{{ item.a }}</div>
              </div>
            </div>
          </div>
          <div v-else class="empty-state soft-card text-center p-5 mx-auto">
            <div class="empty-icon mx-auto"><i class="bi bi-binoculars" aria-hidden="true"></i></div>
            <h2 class="fs-5 fw-bold mt-3 mb-1">No answers found</h2>
            <p class="text-muted small mb-0">Nothing matched your search. Try another word or contact support below.</p>
            <button class="btn btn-ghost mt-3" type="button" @click="query = ''">Clear search</button>
          </div>
        </template>

        <!-- Category groups -->
        <template v-else>
          <div v-for="group in visibleGroups" :key="group.name" class="mb-5 fade-up">
            <div class="d-flex align-items-center gap-3 mb-3">
              <span class="group-icon"><i :class="'bi ' + group.icon" aria-hidden="true"></i></span>
              <h2 class="fs-4 fw-bold font-display mb-0">{{ group.name }}</h2>
            </div>
            <div class="accordion faq-accordion" :id="'acc' + slug(group.name)">
              <div v-for="(item, i) in group.items" :key="i" class="accordion-item">
                <h3 class="accordion-header">
                  <button
                    class="accordion-button"
                    :class="{ collapsed: i !== 0 }"
                    type="button"
                    data-bs-toggle="collapse"
                    :data-bs-target="'#' + slug(group.name) + i"
                    :aria-expanded="i === 0 ? 'true' : 'false'"
                    :aria-controls="slug(group.name) + i"
                  >
                    {{ item.q }}
                  </button>
                </h3>
                <div
                  :id="slug(group.name) + i"
                  class="accordion-collapse collapse"
                  :class="{ show: i === 0 }"
                  :data-bs-parent="'#acc' + slug(group.name)"
                >
                  <div class="accordion-body">{{ item.a }}</div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="!visibleGroups.length" class="empty-state soft-card text-center p-5">
            <div class="empty-icon mx-auto"><i class="bi bi-chat-left-text" aria-hidden="true"></i></div>
            <h2 class="fs-5 fw-bold mt-3 mb-1">No FAQs in this category yet</h2>
            <button class="btn btn-ghost mt-2" type="button" @click="activeCategory = 'All'">Show all topics</button>
          </div>
        </template>

        <!-- Support CTA -->
        <div class="support-band p-4 p-lg-5 mt-2">
          <div class="row align-items-center g-4">
            <div class="col-lg-7">
              <h2 class="fs-4 fw-bold font-display mb-1">Still have questions?</h2>
              <p class="mb-0 support-sub">
                Reach our support team any time - available 24/7 via email or phone.
              </p>
            </div>
            <div class="col-lg-5 d-flex flex-column flex-sm-row flex-lg-column gap-2 justify-content-lg-end align-items-lg-end">
              <a href="mailto:support@busline.ng" class="btn btn-light">
                <i class="bi bi-envelope me-2" aria-hidden="true"></i>support@busline.ng
              </a>
              <a href="tel:+2348000000000" class="btn btn-outline-light">
                <i class="bi bi-telephone me-2" aria-hidden="true"></i>+234 800 000 0000
              </a>
            </div>
          </div>
        </div>

      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const query = ref('')
const activeCategory = ref('All')

const faqData = [
  {
    category: 'Booking & tickets',
    icon: 'bi-ticket-perforated',
    items: [
      { q: 'How do I book a trip?', a: 'Search your route and date from the home page, pick a trip, choose your seats on the live map, and check out. It takes less than two minutes.' },
      { q: 'Can I choose my seat?', a: 'Yes! Every trip has a live seat map. Simply select the exact seats you want before confirming your booking.' },
      { q: 'How do I get my ticket?', a: 'Your ticket is generated instantly after payment. You can view it in My Bookings, download it, or scan the QR code at the terminal.' },
      { q: 'Can I book for someone else?', a: 'Absolutely. Enter the passenger details during checkout - the ticket will be issued under their name and sent to your account.' },
    ],
  },
  {
    category: 'Payments',
    icon: 'bi-credit-card',
    items: [
      { q: 'How do I pay for my booking?', a: 'You can pay online securely with a card via Paystack, or choose "pay at terminal" and settle with cash before boarding. Online payments are confirmed instantly.' },
      { q: 'Is it safe to pay online?', a: 'Very. Payments are processed by Paystack with bank-grade encryption. BusLine never sees or stores your card details.' },
      { q: 'My payment succeeded but no ticket?', a: 'Check My Bookings after a minute - confirmation can lag slightly. If it is still missing, contact support with your payment reference and we will resolve it immediately.' },
    ],
  },
  {
    category: 'Cancellations & refunds',
    icon: 'bi-arrow-repeat',
    items: [
      { q: 'Can I cancel my booking?', a: 'Pending and confirmed bookings can be cancelled from your dashboard before departure. Refunds follow our cancellation policy.' },
      { q: 'What happens if my trip is cancelled?', a: 'If a trip is cancelled, you are entitled to a full refund automatically. Our support team will also reach out to help you rebook.' },
      { q: 'How long do refunds take?', a: 'Refunds are initiated immediately and typically reflect in your account within 5-10 business days, depending on your bank.' },
    ],
  },
  {
    category: 'Account & support',
    icon: 'bi-headset',
    items: [
      { q: 'Do I need an account to book?', a: 'Yes - a free account keeps your tickets, receipts, and trip history in one place and lets you rebook favourite routes in one tap.' },
      { q: 'I forgot my password', a: 'Use the "Forgot password?" link on the sign-in page. We will email you a secure reset link that expires after one hour.' },
      { q: 'How do I contact support?', a: 'Email support@busline.ng or call us any time - we are available 24/7 and typically reply within minutes.' },
    ],
  },
]

const categories = ['All', ...faqData.map((g) => g.category)]

function slug(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

const visibleGroups = computed(() =>
  activeCategory.value === 'All'
    ? faqData
    : faqData.filter((g) => g.category === activeCategory.value)
)

const allItems = faqData.flatMap((g) => g.items.map((item) => ({ ...item, category: g.category })))

const searchResults = computed(() => {
  const q = query.value.toLowerCase()
  if (!q) return []
  return allItems.filter((item) =>
    [item.q, item.a].some((v) => String(v).toLowerCase().includes(q))
  )
})
</script>

<style scoped>
.faq-hero {
  background:
    radial-gradient(700px 320px at 85% -30%, rgba(255, 255, 255, 0.14), transparent 65%),
    #000;
  border-bottom: 0;
  padding: 2.5rem 0 2.75rem;
}
.breadcrumb { margin-bottom: 1rem; font-size: 0.84rem; }
.breadcrumb-item a { color: rgba(255, 255, 255, 0.6); text-decoration: none; }
.breadcrumb-item a:hover { color: #fff; }
.breadcrumb-item.active { color: rgba(255, 255, 255, 0.85); font-weight: 600; }

.catalog-title {
  font-size: clamp(1.9rem, 4vw, 2.7rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  margin-bottom: 0.4rem;
  color: #fff;
}
.catalog-sub { color: rgba(255, 255, 255, 0.72); max-width: 36rem; margin-bottom: 0; }

.faq-search { max-width: 34rem; position: relative; }
.faq-search i {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--muted);
  pointer-events: none;
}
.faq-search input {
  padding-left: 2.7rem;
  border-radius: 14px;
  border-color: var(--border);
}
.faq-search input:focus {
  border-color: var(--brand);
  box-shadow: 0 0 0 3.5px var(--brand-50);
}

.faq-tab {
  border: 1.5px solid var(--border);
  background: var(--surface);
  color: var(--muted);
  font-weight: 600;
  font-size: 0.88rem;
  padding: 0.5rem 1.1rem;
  border-radius: 999px;
  min-height: 42px;
  transition: all 0.18s ease;
}
.faq-tab:hover { border-color: var(--brand-100); color: var(--brand-700); }
.faq-tab.active {
  background: var(--brand);
  border-color: var(--brand);
  color: #fff;
  box-shadow: var(--shadow-brand);
}
.faq-tab:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }

.group-icon {
  width: 44px;
  height: 44px;
  border-radius: 13px;
  background: var(--brand-50);
  color: var(--brand-700);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15rem;
  flex-shrink: 0;
}

.faq-cat-tag {
  display: inline-block;
  background: var(--brand-50);
  color: var(--brand-700);
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  white-space: nowrap;
}

.empty-state { border-radius: 18px; max-width: 34rem; }
.empty-icon {
  width: 64px;
  height: 64px;
  border-radius: 18px;
  background: var(--brand-50);
  color: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
}

.support-band {
  border-radius: var(--radius-xl);
  background:
    radial-gradient(500px 260px at 90% -20%, rgba(255, 255, 255, 0.14), transparent 60%),
    linear-gradient(135deg, var(--brand-700), var(--brand));
  color: #fff;
}
.support-sub { color: rgba(255, 255, 255, 0.82); }

@media (max-width: 991.98px) {
  .support-band .align-items-lg-end { align-items: stretch !important; }
}
@media (prefers-reduced-motion: reduce) {
  .fade-up { animation: none; }
}
</style>
