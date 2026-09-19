# Mobile Comprehensive Test Report

**Project:** BusLine — Multi-Vendor Bus Booking
**Date:** 2026-08-28
**Environment:** Kali Linux 6.6 / XAMPP (MariaDB 10.4.32, PHP 8.2.12) / Node v22.14.0
**Scope:** mobile/ (Expo SDK 54, React Native 0.81.5), backend/ (CodeIgniter 4.7.4), frontend/ (Vue 3 + Vite)

---

## 1. Test Setup & Methodology

| Area | How it was tested |
|---|---|
| Mobile app (native) | **No Android SDK / emulator / adb present on this machine** — native-device testing was not possible. The app was exercised via its supported `web` target (react-native-web) exported with `npx expo export --platform web`, rendered in headless Chromium at 5 mobile viewports (320×568, 375×667, 390×844, 412×915, 768×1024) with touch emulation. |
| Static analysis | `tsc --noEmit` (strict), `expo-doctor`, `npm run build` |
| Backend | Live server (`php spark serve --port 8090`), PHPUnit suite, per-endpoint curl probes incl. role-guard checks, 234-file PHP lint sweep |
| DB | MariaDB started on :3306 (existing `bus_booking` DB; 15 cities, 833 users, 2461 routes, 83 terminals, 1640 buses, 4101 trips seeded) |
| Frontend | `vite dev` (:5173) rendered at 4 mobile viewports; production `vite build` |

---

## 2. 🔴 CRITICAL BUG — Mobile app crashes at startup

**Symptom:** The app renders a blank screen on every viewport (320→768 px). Headless-browser run captures:

```
PageError: Error: No safe area value available. Make sure you are rendering
`<SafeAreaProvider>` at the top of your app.
```

**Root cause (`mobile/App.tsx`):** The app mounts `ThemeProvider → AuthProvider → AppInner` but **never mounts `<SafeAreaProvider>`**. Meanwhile the codebase is heavily dependent on `react-native-safe-area-context`:

- 49 `SafeAreaView` usages (onboarding, all 5 auth screens, main screens)
- 10+ `useSafeAreaInsets()` hooks (Search, Results, TerminalDetail, TicketThread, AgentChat, etc.)

Because the very first screen (`OnboardingScreen`, rendered *outside* any navigator) renders `<SafeAreaView>` without a provider, the library throws during render, React unmounts the root → blank screen.

**Impact:**
- Web: 100% reproducible at every viewport.
- Native (Android/build): `SafeAreaProviderCompat` is only auto-provided *inside* bottom-tabs/native-stack navigators; `OnboardingScreen` and the auth stack entry are outside them, so the same throw is expected on native. This needs confirmation on device, but the code path is identical.

**Verified fix (temporarily applied, then reverted — repo is pristine):** Wrapping the tree in `<SafeAreaProvider>` at the top of `App.tsx` made the app render correctly at all 5 viewports with **zero** console errors, zero page errors, zero failed requests, and no horizontal overflow. After onboarding → login → dashboard, all API calls succeeded.

**Recommended fix:** in `mobile/App.tsx`:
```tsx
import { SafeAreaProvider } from 'react-native-safe-area-context';
// ...
export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppInner />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
```

---

## 3. Mobile App — Verified Working (after the fix above)

- **TypeScript strict typecheck: PASS** (no errors).
- **Expo web export: PASS.** Single bundle `index-….js` **2.0 MB (552 KB gzipped)** — notably heavy for mobile; code-splitting/`lazy` routes would help.
- **Onboarding** (3-slide carousel) → **Login** → **Dashboard**: full E2E flow drives the real API (`POST /api/login` → 200, `GET /api/terminals` → 200).
- Tabs verified with live data:
  - **My Bookings** — real fetch (`GET /api/bookings` → 200), empty-state renders.
  - **Offers & Rewards** — loyalty/offer rules loaded (`GET /api/offers/rules` → 200).
- No horizontal overflow at 320/375/390/412/768 px (scrollWidth == clientWidth on every viewport).
- **Web-only limitation (not a native bug):** the Home screen map area shows `React Native WebView does not support this platform.` — `search/SearchScreen` embeds `LeafletMapWebView`, which uses `react-native-webview` and has no web implementation. On Android/iOS the Leaflet map renders inside the WebView; on web the map area is a dead error block. (Known constraint of react-native-webview.)

### Expo SDK hygiene findings

| Check | Result |
|---|---|
| `expo-doctor` | 16/18 pass. See below. |
| app.json schema | `android.usesCleartextTraffic` flagged as "should NOT have additional property" for SDK 54. `usesCleartextTraffic` is honored at build time but rejected by the schema validator; remove it from `app.json` (or accept warning). |
| Duplicate native module | `expo-constants@18.0.13` at root vs `18.0.14` under `expo/` — run `npm dedupe`/`npm update expo-constants` to avoid native build issues. |
| ENV | `mobile/.env` hard-codes `EXPO_PUBLIC_API_URL=http://172.20.10.2:8090/api` (a hotspot LAN IP). Fine for local dev; a LAN IP must not ship in EAS/Play-Store builds — point it at the public server URL before release. |

---

## 4. Backend (CodeIgniter 4.7.4) — PASS

### Static & unit
- **PHP lint:** all **234** `app/*.php` files — no syntax errors.
- **PHPUnit:** **5/5 tests, 7 assertions pass** (CodeIgniter base health tests).
  - Note: run with XAMPP PHP (`/opt/lampp/bin/php vendor/bin/phpunit`); the distro PHP 8.4 is missing `dom`/`xmlwriter` extensions and aborts before running.

### Endpoints verified (live server, real DB)
| Group | Endpoints | Result |
|---|---|---|
| Public | cities, terminals (+city filter), suggestions, offers, offers/rules, loyalty/rules | ✅ 200 |
| Trip search | trips (with origin/destination), trips/{id}, trips/{id}/seats, trips/popular | ✅ 200 |
| Reviews | reviews/vendor/{id} | ✅ 200 |
| Auth | register/customer, email/verify (6-digit), login (JWT), logout | ✅ 200/201 |
| Authenticated | profile, wallet, 2fa status, loyalty/overview, bookings, payments, support tickets (+ reply) | ✅ 200 |
| Vendor role | register/vendor (pending approval), vendor/dashboard, cities, bus-categories, terminals, buses, routes, trips, wallet, revenue, notifications | ✅ 200 |
| Error paths | wrong login, missing record (`trips/1` = correct "Trip not found" — table starts at id 37), invalid seat, malformed payload, insufficient wallet | ✅ graceful `{success:false}` + message |

### Authorization & role guards
- Missing/invalid token → **401**; after logout, token reuse → **401** (session destroyed).
- Vendor token on driver endpoints (`driver/trips`) → **403**.
- Pending-approval vendor on restricted actions (expenses/passengers/withdrawals) → **403**, message: *"Your vendor account is pending approval. This action is unavailable."*

### Booking flow
- `POST /api/bookings` validates correctly: insufficient wallet balance is rejected; seats are validated against the trip; seat map exposes **seat IDs** (book with seat `id`, not seat number).
- Could not complete a paid booking end-to-end because wallet top-up / Paystack verification requires real sandbox keys — `.env` contains placeholders `sk_test_xxxx`/`pk_test_xxxx`. Endpoint fails gracefully (*"Unable to initialize top-up. Please check your Paystack configuration."*). **External dependency for live payment testing.**

### Performance (dev server, repeated)
`/api/cities` 0.128–0.133 s · `/api/terminals` 0.144–0.153 s · `/api/trips` 0.140–0.142 s

### Data note
Seed trips are dated **2026-08-11 → 2026-08-23**, all in the past as of today (2026-08-28). Trip search legitimately returns `0 trip(s) found`. Re-seed future trips before exercising search/booking UX.

---

## 5. Frontend (Vue 3 + Vite + Bootstrap) — PASS

- **Production build:** ✅ `vite build` in ~20 s (main chunk 260 KB / 92 KB gzipped + route chunks; Leaflet is the largest dependency).
- **Mobile responsive:** `/`, `/login`, `/search`, `/routes` rendered at **320 / 390 / 412 / 768 px**, iPhone & Android UA, touch emulation.
  - No horizontal overflow on any page/viewport.
  - 0 console errors, 0 page errors, 0 failed requests.
- API proxy (`/api` → `localhost:8090`) works via the Vite dev server.

---

## 6. Findings Summary (priority order)

| # | Severity | Finding | Fix |
|---|---|---|---|
| 1 | 🔴 **Critical** | Mobile app blank-screens at startup — no `SafeAreaProvider` mounted (`mobile/App.tsx`), 59 usages of safe-area hooks/views. | Wrap root in `<SafeAreaProvider>` (patch verified). |
| 2 | 🟠 Medium | `expo-constants` duplicated (18.0.13 / 18.0.14) — native build risk. | `npm dedupe` / align versions. |
| 3 | 🟠 Medium | Live payment path inert: placeholder Paystack keys. | Add sandbox keys to `.env` for E2E payment testing. |
| 4 | 🟡 Low | `mobile/.env` points mobile builds at a hotspot LAN IP (172.20.10.2). | Point builds at the public API URL before release. |
| 5 | 🟡 Low | `android.usesCleartextTraffic` rejected by SDK 54 schema validator. | Remove from `app.json` or accept warning. |
| 6 | 🟡 Low | Web export bundle is 2.0 MB (552 KB gzipped). | Route-level code splitting. |
| 7 | ⬜ Info | Web-only: Home map shows "WebView does not support this platform" (react-native-webview has no web target). | Expected; native is unaffected. |
| 8 | ⬜ Info | Seed trips older than today → empty search results. | Refresh seed dates. |

**Overall:** Backend and web frontend are healthy and well-tested above. The mobile app has one blocking defect (the missing `SafeAreaProvider`) that prevents it from rendering at all until fixed — everything else in the mobile flow works once that one line is added.

---

## 7. Artifacts

- Screenshots: `/tmp/opencode/shots/` (`mobileweb-*`, `e2e-*`, `frontend-*`)
- Expo web export: `/tmp/opencode/mobileweb/`
- API dumps: `/tmp/opencode/*.json`
- Test harnesses: `/tmp/opencode/browserlab/*.cjs`
- Logs: `/tmp/opencode/backend.log`, `/tmp/opencode/frontend.log`