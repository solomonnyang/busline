<template>
  <div class="legal-page">
    <section class="legal-hero">
      <div class="container">
        <span class="legal-eyebrow">{{ section.eyebrow }}</span>
        <h1 class="legal-title">{{ section.title }}</h1>
        <p class="legal-lead">{{ section.lead }}</p>
        <p class="legal-updated">Last updated: {{ section.updated }}</p>
      </div>
    </section>

    <section class="legal-body">
      <div class="container legal-grid">
        <nav v-if="section.blocks.length > 1" class="legal-toc" aria-label="In this document">
          <h2 class="toc-title">In this document</h2>
          <a
            v-for="(b, i) in section.blocks"
            :key="i"
            class="toc-link"
            :href="`#${slug(b.heading)}`"
          >{{ b.heading }}</a>
        </nav>

        <div class="legal-content">
          <article v-for="(b, i) in section.blocks" :key="i" class="legal-block" :id="slug(b.heading)">
            <h2 class="block-heading"><i :class="b.icon"></i>{{ b.heading }}</h2>
            <template v-for="(p, j) in b.paragraphs" :key="j">
              <p v-if="typeof p === 'string'" class="block-paragraph">{{ p }}</p>
              <ul v-else class="block-list">
                <li v-for="(item, k) in p" :key="k">{{ item }}</li>
              </ul>
            </template>
          </article>

          <div class="legal-contact">
            <i class="bi bi-envelope"></i>
            <div>
              <strong>Questions?</strong>
              <p>Contact us at <a :href="`mailto:${contactEmail}`">{{ contactEmail }}</a> and we'll be happy to help.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { s } from '../../composables/useSiteContent'

const props = defineProps({ type: { type: String, default: 'privacy' } })
const contactEmail = s('contact.email', 'support@busline.com')

const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const content = {
  privacy: {
    eyebrow: 'Privacy Policy',
    title: 'Your privacy matters to us',
    lead: 'Learn how BusLine collects, uses, and protects your personal information when you use our platform and app.',
    updated: 'September 2026',
    blocks: [
      {
        heading: 'Introduction',
        icon: 'bi-info-circle',
        paragraphs: [
          'BusLine ("we", "us", "our") is committed to protecting the privacy of everyone who uses our website, mobile application, and related services (together, the "Platform"). This Privacy Policy explains what personal information we collect, why we collect it, how we use and share it, and the choices and rights you have in relation to your data.',
          'We encourage you to read this policy carefully together with our Terms & Conditions and Cookie Policy. By using the Platform, you agree to the collection and use of information in accordance with this policy.',
        ],
      },
      {
        heading: 'Information we collect',
        icon: 'bi-collection',
        paragraphs: [
          'When you use BusLine, we collect information that helps us provide and improve our services. This includes information you give us directly and information we gather automatically about how you use the Platform:',
          [
            'Account details: your name, email address, phone number, and password.',
            'Profile information: profile pictures, preferred language, and notification preferences.',
            'Booking information: routes, trips, tickets, stations, terminals, seats, and travel history.',
            'Identity & verification data: for vendor accounts, business details, identification documents, and operator licence information.',
            'Device & usage data: app version, device type, operating system, IP address, and how you interact with the Platform.',
            'Payment details: payment references, transaction records, and wallet balances (we do not store card numbers).',
            'Location data: where you choose to provide it, such as for finding nearby terminals or trip pick-up points.',
          ],
          'We only collect information that is reasonably necessary for the purposes described in this policy. Where you choose not to provide certain information, some features of the Platform may be unavailable to you.',
        ],
      },
      {
        heading: 'How we use your information',
        icon: 'bi-gear',
        paragraphs: [
          'We use the information we collect for the following purposes:',
          [
            'Processing your bookings, payments, refunds, and wallet transactions.',
            'Verifying vendors and operators before they join the Platform.',
            'Creating and maintaining your account and providing customer support.',
            'Sending important service updates, notifications, and receipts.',
            'Enabling push notifications that you choose to receive.',
            'Improving our app, personalising content, and keeping the Platform safe and secure.',
            'Complying with legal and regulatory obligations.',
          ],
          'We rely on a number of lawful bases to process your information, including performing our contract with you, our legitimate interests in operating and improving the Platform, and your consent where required by law.',
        ],
      },
      {
        heading: 'How we share information',
        icon: 'bi-share',
        paragraphs: [
          'We only share your information where it is necessary to provide our service or where we are required to do so by law:',
          [
            'Operators & vendors: we share booking and contact details with the transportation operators whose services you book.',
            'Service providers: we work with trusted third parties who help us run the Platform, such as payment processors and cloud hosting.',
            'Legal & safety: we may disclose information where required by law, regulation, or valid legal process, or to protect the safety and rights of our users.',
            'Business transfers: in the event of a merger, sale, or reorganisation, your information may be transferred as part of that transaction.',
          ],
          'We do not sell your personal data to third parties. Any third party we share data with is required to protect it and use it only for the purposes we specify.',
        ],
      },
      {
        heading: 'Data retention',
        icon: 'bi-clock-history',
        paragraphs: [
          'We keep your personal information only for as long as necessary to provide the Platform, comply with our legal obligations, resolve disputes, and enforce our agreements. When information is no longer needed, we securely delete or anonymise it. Booking and transaction records are typically retained for a period consistent with record-keeping and accounting requirements.',
        ],
      },
      {
        heading: 'International transfers',
        icon: 'bi-globe',
        paragraphs: [
          'Where we transfer personal information across borders, we take steps to ensure it is protected to a standard consistent with this policy and applicable law. This may include using standard contractual clauses, consent, or other lawful transfer mechanisms as appropriate.',
        ],
      },
      {
        heading: 'Children\u2019s privacy',
        icon: 'bi-person-heart',
        paragraphs: [
          'The Platform is not directed at children, and we do not knowingly collect personal information from children under the age of 16. If you believe a child has provided us with personal information, please contact us so that we can take steps to remove it.',
        ],
      },
      {
        heading: 'Data security',
        icon: 'bi-shield-lock',
        paragraphs: [
          'We protect your information with industry-standard security measures, including encrypted connections (HTTPS/TLS), secure storage, access controls, and regular monitoring of our systems. While no method of transmission or storage is 100% secure, we work hard to safeguard your data and to act promptly in the event of an incident.',
        ],
      },
      {
        heading: 'Your rights',
        icon: 'bi-person-lines-fill',
        paragraphs: [
          'Depending on where you live, you may have the following rights in relation to your personal information:',
          [
            'Access: request a copy of the personal information we hold about you.',
            'Correction: ask us to update or correct inaccurate information.',
            'Deletion: request that we erase your personal information where appropriate.',
            'Restriction & objection: ask us to limit how we use your data or object to certain processing.',
            'Portability: request your data in a structured, machine-readable format.',
            'Withdraw consent: where we rely on consent, you may withdraw it at any time.',
            'Notification preferences: manage or disable marketing and push notifications from your account settings.',
          ],
          'To exercise any of these rights, please contact us using the details at the bottom of this page. We will respond within a reasonable timeframe and may ask you to verify your identity before processing your request.',
        ],
      },
      {
        heading: 'Changes to this policy',
        icon: 'bi-arrow-repeat',
        paragraphs: [
          'We may update this Privacy Policy from time to time to reflect changes in our practices, technology, or legal requirements. When we make significant changes, we will post the updated policy on this page and update the "last updated" date. Where required, we will notify you directly. Your continued use of the Platform after changes take effect constitutes acceptance of the updated policy.',
        ],
      },
      {
        heading: 'Contact us',
        icon: 'bi-envelope',
        paragraphs: [
          'If you have any questions about this Privacy Policy or how we handle your data, please contact our data protection team. We are happy to help and will respond as soon as we can.',
          [
            `Email: ${contactEmail}`,
            'BusLine, 1 Transport Way, Your City, Your Country.',
          ],
        ],
      },
    ],
  },
  terms: {
    eyebrow: 'Terms & Conditions',
    title: 'Terms & Conditions',
    lead: 'The terms that govern your use of the BusLine platform, website, and mobile app.',
    updated: 'September 2026',
    blocks: [
      {
        heading: 'Acceptance of terms',
        icon: 'bi-check-circle',
        paragraphs: [
          'These Terms & Conditions ("Terms") constitute a legally binding agreement between you and BusLine governing your access to and use of the Platform. By accessing or using the Platform, you confirm that you are at least 18 years old (or the age of majority in your jurisdiction) and that you agree to be bound by these Terms. If you do not agree with any part of these Terms, you must not use the Platform.',
        ],
      },
      {
        heading: 'Our services',
        icon: 'bi-bus-front',
        paragraphs: [
          'BusLine provides a digital platform that connects passengers with bus transportation operators and vendors. Through the Platform, users can discover routes, view schedules and availability, book and pay for trips, manage tickets and wallets, and interact with customer support. Unless otherwise stated, BusLine is an enabling technology platform and is not itself a provider of transportation services.',
        ],
      },
      {
        heading: 'Using the platform',
        icon: 'bi-phone',
        paragraphs: [
          'You agree to use the Platform only for lawful purposes and in accordance with these Terms. In particular, you agree not to:',
          [
            'Use the Platform in any way that violates any applicable law or regulation.',
            'Impersonate any person or entity, or misrepresent your affiliation with BusLine.',
            'Attempt to gain unauthorised access to any part of the Platform, its servers, or connected systems.',
            'Introduce viruses, malware, or any harmful code to the Platform.',
            'Interfere with the normal operation of the Platform, including overloading or disrupting networks.',
            'Use automated tools or scrapers to copy data from the Platform without our permission.',
            'Book, resell, or transfer tickets in a way that circumvents applicable rules or policies.',
          ],
          'We reserve the right to terminate or suspend access to the Platform for users who breach these Terms.',
        ],
      },
      {
        heading: 'Accounts & registration',
        icon: 'bi-person-plus',
        paragraphs: [
          'Some features of the Platform require you to create an account. You are responsible for keeping your login credentials secure and for all activity that occurs under your account. You agree to:',
          [
            'Provide accurate, current, and complete information when you register.',
            'Keep your password confidential and never share it with others.',
            'Notify us promptly of any unauthorised use of your account or security breach.',
            'Update your information to keep it accurate and current.',
          ],
          'Vendor accounts are subject to approval before they can transact on the Platform, and we reserve the right to refuse or revoke accounts at our discretion where these Terms are breached.',
        ],
      },
      {
        heading: 'Bookings & payments',
        icon: 'bi-receipt',
        paragraphs: [
          'Tickets, prices, routes, schedules, and seat availability are set by vendors and operators and may change at any time. When you make a booking:', 
          [
            'You authorise BusLine to process the payment on behalf of the relevant operator.',
            'A transaction record and wallet entry will be created in your account.',
            'Your ticket details will be sent to you and stored in the Platform.',
          ],
          'Refunds, cancellations, rescheduling, and no-show policies are governed by the relevant operator, as presented to you at the time of booking. We do not guarantee the availability of any particular trip or seat.',
        ],
      },
      {
        heading: 'Vendor obligations',
        icon: 'bi-briefcase',
        paragraphs: [
          'Vendors and operators agree to maintain accurate information, deliver the services they advertise, and comply with all applicable laws and regulations. In particular, vendors agree to:',
          [
            'Provide truthful and up-to-date descriptions of their business, routes, and vehicles.',
            'Honour bookings and tickets that they accept through the Platform.',
            'Handle passenger information responsibly and in accordance with our Privacy Policy.',
            'Comply with transport, licensing, safety, and tax obligations.',
          ],
          'BusLine may suspend, restrict, or terminate vendor accounts for breaches of these Terms, including upon receipt of unresolved passenger complaints.',
        ],
      },
      {
        heading: 'Intellectual property',
        icon: 'bi-lightbulb',
        paragraphs: [
          'The Platform, including its text, graphics, logos, illustrations, software, and other content, is the property of BusLine or its licensors and is protected by intellectual property laws. You may not copy, reproduce, modify, distribute, or create derivative works from any part of the Platform without our prior written consent, except where required for your own personal, non-commercial use.',
        ],
      },
      {
        heading: 'Third-party content & links',
        icon: 'bi-link-45deg',
        paragraphs: [
          'The Platform may contain links to third-party websites, apps, and services that are not operated by us. We are not responsible for the content, privacy practices, or availability of these third-party services. Your use of any third-party service is subject to that service\u2019s own terms and policies.',
        ],
      },
      {
        heading: 'Limitation of liability',
        icon: 'bi-exclamation-octagon',
        paragraphs: [
          'To the fullest extent permitted by law, BusLine makes no warranties, express or implied, regarding the Platform or the services of third-party operators, and disclaims liability for any indirect, incidental, special, consequential, or punitive damages. Because BusLine is an enabling platform rather than a transportation provider, we are not liable for the acts, omissions, or services of individual operators, including cancellations, delays, or incidents during travel. Nothing in these Terms limits liability that cannot be limited by applicable law.',
        ],
      },
      {
        heading: 'Indemnification',
        icon: 'bi-shield-check',
        paragraphs: [
          'You agree to indemnify and hold harmless BusLine and its affiliates, officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses arising out of or in connection with your use of the Platform or your breach of these Terms.',
        ],
      },
      {
        heading: 'Termination',
        icon: 'bi-x-circle',
        paragraphs: [
          'You may stop using the Platform at any time and may close your account by contacting us. We may suspend or terminate your access to the Platform at any time, with or without notice, if we reasonably believe you have breached these Terms, if required by law, or for the protection of the Platform or other users. Sections of these Terms that by their nature should survive termination shall continue in force.',
        ],
      },
      {
        heading: 'Governing law & disputes',
        icon: 'bi-gavel',
        paragraphs: [
          'These Terms are governed by the laws of the jurisdiction in which BusLine is established, without regard to conflict of law principles. Any disputes arising out of or relating to these Terms or your use of the Platform will be subject to the exclusive jurisdiction of the courts in that jurisdiction, except where applicable law provides otherwise.',
        ],
      },
      {
        heading: 'Changes to these terms',
        icon: 'bi-arrow-repeat',
        paragraphs: [
          'We may update these Terms & Conditions from time to time to reflect changes in our services, technology, or legal requirements. The current version will always be available on this page, and we will update the "last updated" date accordingly. Where changes are significant, we will make reasonable efforts to notify you. Your continued use of the Platform after any changes take effect constitutes acceptance of the revised Terms.',
        ],
      },
      {
        heading: 'Contact us',
        icon: 'bi-envelope',
        paragraphs: [
          'If you have any questions about these Terms & Conditions, please contact us and we will be glad to assist you.',
          [
            `Email: ${contactEmail}`,
            'BusLine, 1 Transport Way, Your City, Your Country.',
          ],
        ],
      },
    ],
  },
  cookie: {
    eyebrow: 'Cookie Policy',
    title: 'Cookie Policy',
    lead: 'This policy explains what cookies are, how we use them on the BusLine website, and the choices you have to manage them.',
    updated: 'September 2026',
    blocks: [
      {
        heading: 'What are cookies?',
        icon: 'bi-cookie',
        paragraphs: [
          'Cookies are small text files that a website stores on your device (computer, phone, or tablet) when you visit it. They are widely used to make websites work efficiently, remember your preferences, and provide information to the owners of the site about how it is used. Some cookies are set by the website itself, while others may be set by third parties whose services we use.',
        ],
      },
      {
        heading: 'What cookies do we use?',
        icon: 'bi-list-check',
        paragraphs: [
          'We use a small number of cookies and similar technologies to keep the Platform secure and to improve your experience. The types of cookies we may use include:',
          [
            'Essential cookies: required for the site to function correctly, such as keeping you signed in and maintaining secure interactions.',
            'Preference cookies: remember choices you make, such as your theme, language, or notification settings.',
            'Analytics cookies: help us understand how visitors use the site so we can improve performance, content, and functionality.',
            'Marketing cookies: where you consent, may be used to deliver more relevant advertisements about our services.',
          ],
        ],
      },
      {
        heading: 'How we use cookies',
        icon: 'bi-magic',
        paragraphs: [
          'We use cookies and similar technologies to:', 
          [
            'Keep you securely signed in to your account.',
            'Remember your preferences and previous interactions.',
            'Understand aggregate usage patterns so we can improve the platform.',
            'Measure the effectiveness of our marketing and communications.',
            'Detect and prevent fraud or abuse.',
          ],
        ],
      },
      {
        heading: 'Your consent & choices',
        icon: 'bi-hand-thumbs-up',
        paragraphs: [
          'Where required by law, we will ask for your consent before placing non-essential cookies. You can choose to accept or decline these cookies when you first visit the site, and you can change your preferences at any time. Declining non-essential cookies will not prevent the Platform from working, but some features may behave differently.',
        ],
      },
      {
        heading: 'Managing & deleting cookies',
        icon: 'bi-sliders',
        paragraphs: [
          'You can control and delete cookies through your browser settings. Most browsers allow you to:', 
          [
            'View the cookies stored on your device.',
            'Block cookies from specific sites.',
            'Delete existing cookies and clear your browsing data.',
            'Set your browser to notify you before a cookie is set.',
          ],
          'Please refer to your browser\u2019s help documentation for more information. Please note that blocking or deleting essential cookies may prevent parts of the Platform from working correctly.',
        ],
      },
      {
        heading: 'Third-party analytics',
        icon: 'bi-bar-chart',
        paragraphs: [
          'We may use third-party analytics tools to help us understand how the Platform is used. These third parties may set their own cookies on your device and use the information collected to evaluate usage on our behalf. The data collected is aggregated and does not directly identify you. You can opt out of these analytics where the relevant tool provides such an option.',
        ],
      },
      {
        heading: 'Changes to this policy',
        icon: 'bi-arrow-repeat',
        paragraphs: [
          'We may update this Cookie Policy from time to time to reflect changes in our use of cookies or to comply with updated legal requirements. When we do, we will update the "last updated" date on this page. Where changes are significant, we may notify you and, where required, seek fresh consent.',
        ],
      },
      {
        heading: 'Contact us',
        icon: 'bi-envelope',
        paragraphs: [
          'If you have any questions about this Cookie Policy or how we use cookies and similar technologies, please contact us.',
          [
            `Email: ${contactEmail}`,
            'BusLine, 1 Transport Way, Your City, Your Country.',
          ],
        ],
      },
    ],
  },
}

const section = computed(() => content[props.type] || content.privacy)
</script>

<style scoped>
.legal-page { background: #fff; }

.legal-hero {
  padding: 5.5rem 0 3.5rem;
  border-bottom: 1px solid #ececec;
}
.legal-eyebrow {
  display: inline-flex;
  align-items: center;
  background: #000;
  color: #fff;
  font-weight: 700;
  font-size: 0.78rem;
  letter-spacing: 0.02em;
  padding: 0.35rem 0.95rem;
  border-radius: 999px;
  margin-bottom: 1.4rem;
}
.legal-title {
  font-size: clamp(2.4rem, 5vw, 3.6rem);
  font-weight: 800;
  letter-spacing: -0.035em;
  line-height: 1.05;
  color: #000;
  max-width: 20ch;
  margin-bottom: 1.2rem;
}
.legal-lead { color: rgba(0, 0, 0, 0.66); font-size: 1.1rem; max-width: 44rem; }
.legal-updated { color: rgba(0, 0, 0, 0.45); font-size: 0.88rem; margin-top: 0.6rem; }

.legal-body { padding: 3.5rem 0 6rem; }
.legal-grid {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 3.5rem;
  align-items: start;
}
.legal-toc {
  position: sticky;
  top: 100px;
}
.toc-title {
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(0, 0, 0, 0.45);
  margin-bottom: 0.8rem;
}
.toc-link {
  display: block;
  color: #333;
  text-decoration: none;
  font-size: 0.92rem;
  font-weight: 500;
  padding: 0.4rem 0;
  border-bottom: 1px solid #f0f0f0;
  transition: color 0.15s ease;
}
.toc-link:hover { color: #000; }

.legal-block { padding-bottom: 2.2rem; margin-bottom: 2.2rem; border-bottom: 1px solid #f0f0f0; }
.block-heading {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 1.3rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: #000;
  margin-bottom: 0.9rem;
}
.block-heading i { color: #000; }
.block-paragraph { color: rgba(0, 0, 0, 0.72); font-size: 1rem; line-height: 1.65; margin-bottom: 1rem; }
.block-list { padding-left: 1.2rem; margin: 0 0 1rem; }
.block-list li { color: rgba(0, 0, 0, 0.72); font-size: 1rem; line-height: 1.6; margin-bottom: 0.4rem; }

.legal-contact {
  display: flex;
  gap: 0.9rem;
  align-items: flex-start;
  background: #f7f7f7;
  border-radius: 16px;
  padding: 1.3rem 1.4rem;
}
.legal-contact i { font-size: 1.4rem; color: #000; margin-top: 0.15rem; }
.legal-contact strong { display: block; margin-bottom: 0.15rem; }
.legal-contact p { color: rgba(0, 0, 0, 0.6); margin: 0; }
.legal-contact a { color: #000; font-weight: 600; }

@media (max-width: 991.98px) {
  .legal-grid { grid-template-columns: 1fr; gap: 2rem; }
  .legal-toc { position: static; }
}
</style>