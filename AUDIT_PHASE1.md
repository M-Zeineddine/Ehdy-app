# AUDIT — Phase 1: Recon & Structure

**Date:** 2026-07-08 · **Scope:** structure only, no code modified.

> ## ⚠️ Premise correction: this is NOT a Flutter codebase
> The audit brief asked for a Flutter/Dart audit. There is no `pubspec.yaml`, no `lib/`, and zero `.dart` files in this repository. This is an **Expo (React Native) + TypeScript** app. The audit below applies the same intent (architecture, state management, component structure, naming, tooling) to the actual stack. Flutter-specific items (analysis_options.yaml, platform channels, const constructors) have no equivalent here and are answered by their RN counterparts (eslint config, native modules via Expo plugins, component structure/memoization).

---

## 1. Codebase Map

### Stack
| Concern | Actually in use |
|---|---|
| Framework | Expo SDK 54, React Native 0.81.5, React 19.1 ([package.json](package.json)) |
| Language | TypeScript 5.9, `strict: true` ([tsconfig.json:4](tsconfig.json#L4)) |
| Routing | expo-router 6 (file-based), typed routes + React Compiler experiments enabled ([app.json:53-56](app.json#L53-L56)) |
| State | **Zustand** (3 stores: `authStore`, `merchantAuthStore`, `languageStore`) + **TanStack Query 5** for server data (inconsistently — see §3.2) |
| HTTP | axios, two separate hand-rolled clients ([src/services/api.ts](src/services/api.ts), [src/services/merchantPortalService.ts:8](src/services/merchantPortalService.ts#L8)) |
| i18n | i18next + react-i18next, en/ar with RTL support ([src/i18n/index.ts](src/i18n/index.ts)) |
| Persistence | expo-secure-store only (tokens, user JSON, language) |
| Native | No custom native code; all device access via Expo modules (camera, contacts, clipboard, secure-store). `/ios` & `/android` are gitignored (CNG/prebuild workflow) |
| Tests | Jest + jest-expo; 4 test files, services/store only ([src/__tests__/](src/__tests__/)) |
| CI | GitHub Actions: `npm ci && npm test` only — **no lint, no typecheck** ([.github/workflows/ci.yml:26-27](.github/workflows/ci.yml#L26-L27)) |
| Build | EAS (dev/preview/production profiles), prod API URL baked into [eas.json:20](eas.json#L20) |

### Structure
```
app/                       ← expo-router routes (~26 screens)
  _layout.tsx              ← root: fonts, QueryClient, AuthGate redirects, RTL wrapper
  (auth)/                  ← customer auth: welcome, login, register, verify-email,
                             verify-phone, forgot/reset-password
  (tabs)/                  ← customer app: index (home), browse, gifts, profile
  (merchant-auth)/         ← merchant login
  (merchant-tabs)/         ← merchant portal: scan, dashboard, history, account
  merchant/[id].tsx        ← merchant detail + gift item / store-credit selection
  gift/index.tsx           ← 3-step gift purchase wizard (706 lines)
  payment/callback.tsx     ← Tap payment result handling
  modal.tsx                ← ☠ dead Expo starter template route
src/
  components/{ui,home,gift}/  ← shared presentational components
  services/                ← api.ts (axios + refresh), authService, merchantService,
                             giftService, merchantPortalService (2nd axios instance)
  store/                   ← zustand stores
  constants/               ← colors, layout (spacing/fonts), giftThemes
  i18n/locales/{en,ar}.json
  types/index.ts           ← shared API types (incomplete — see §5.3)
components/ hooks/ constants/  ← ☠ dead Expo starter template (root level)
```

### Data flow
- **Auth:** screens call `authService` → on success `authStore.setAuth()` persists to SecureStore and injects the token into the axios instance via module-level `setAuthToken()`. A 401 triggers a queued token refresh registered by the store ([src/services/api.ts:36-76](src/services/api.ts#L36-L76)). Root `AuthGate` watches both auth stores and imperatively redirects by route segment ([app/_layout.tsx:28-60](app/_layout.tsx#L28-L60)).
- **Server data:** React Query on home/browse/merchant/dashboard; manual `useState`+`useEffect` on the gifts tab.
- **Gift purchase:** all item/merchant data is serialized into **route params as strings** and threaded through `merchant/[id]` → `/gift` → external Tap browser session → `/payment/callback` → (on retry) back to `/gift`. There is no store or cache entry for the in-flight purchase; ~15 string params are the source of truth ([app/gift/index.tsx:26-39](app/gift/index.tsx#L26-L39), [app/payment/callback.tsx:21-43](app/payment/callback.tsx#L21-L43)).
- **Merchant portal:** separate token in SecureStore, read directly from disk on every request by its own axios instance ([src/services/merchantPortalService.ts:14-18](src/services/merchantPortalService.ts#L14-L18)).

---

## 2. Architecture findings

- **[High] Dead Expo starter template shipped in the app.** Root [components/](components/), [hooks/](hooks/), [constants/theme.ts](constants/theme.ts), [scripts/reset-project.js](scripts/reset-project.js), and react-logo assets are the untouched `create-expo-app` scaffold. Worse, [app/modal.tsx](app/modal.tsx) is a **live registered route** ("This is a modal" placeholder) reachable at `/modal`, and it is the only consumer of that dead tree. `@/*` and `@/src/*` both being aliased ([tsconfig.json:5-12](tsconfig.json#L5-L12)) invites accidental imports from the dead tree.

- **[High] Two disconnected API clients with divergent behavior.** [src/services/api.ts](src/services/api.ts) (customer: in-memory token, 401 refresh queue) vs [src/services/merchantPortalService.ts:8-26](src/services/merchantPortalService.ts#L8-L26) (merchant: SecureStore read per request, **no 401 handling at all**). When a merchant token expires there is no logout/redirect — every call just fails with a raw error message. BASE_URL and the error-unwrapping interceptor are copy-pasted between them.

- **[High] Purchase state lives in route-param strings.** Prices are `parseFloat`ed from params ([app/gift/index.tsx:111](app/gift/index.tsx#L111)), booleans are `'true'`/`'false'` strings ([app/gift/index.tsx:41](app/gift/index.tsx#L41)), and the whole bag is re-serialized twice more for the callback→retry loop ([app/payment/callback.tsx:96-118](app/payment/callback.tsx#L96-L118)). One misspelled key fails silently. This is the single most fragile seam in the app and it carries money.

- **[Medium] Hardcoded LAN-IP cleartext fallback for the API.** `http://192.168.1.100:3000/v1` is the default when `EXPO_PUBLIC_API_URL` is unset, duplicated in [src/services/api.ts:3](src/services/api.ts#L3) and [src/services/merchantPortalService.ts:5](src/services/merchantPortalService.ts#L5). A dev-build misconfiguration silently points at a random LAN host over HTTP instead of failing loudly.

- **[Medium] AuthGate edge case: dual sessions.** Both stores can be authenticated simultaneously (nothing clears one when the other logs in). [app/_layout.tsx:46-49](app/_layout.tsx#L46-L49) then force-redirects any customer-area navigation to merchant tabs, silently locking the customer session out. Also `router` is used in the effect but the redirect logic depends only on segment strings — workable, but all routing policy lives in one imperative effect.

- **[Medium] Product/branding identity is split three ways.** Repo folder says *GiftBite/Kado*, README sells "Kado", the backend is `kado-backend.onrender.com` ([eas.json:14](eas.json#L14)), but the app is "Ehdy" (`app.json`), package `ehdy`, scheme `ehdy://`, links `https://ehdy.app`, storage keys `ehdy_*`. Pick one before store submission; deep-link scheme + share URLs are user-visible contracts.

- **[Low] `(auth)/_layout.tsx` registers only 4 of its 7 screens** ([app/(auth)/_layout.tsx:5-10](app/(auth)/_layout.tsx#L5-L10)) — `verify-phone`, `forgot-password`, `reset-password` are auto-registered without the intended slide animation options. Works, but inconsistent by accident rather than choice.

---

## 3. State management findings

- **[High] Two competing data-fetching idioms.** React Query is set up globally with sane defaults ([app/_layout.tsx:24-26](app/_layout.tsx#L24-L26)) and used correctly in [app/(tabs)/browse.tsx:93-110](app/(tabs)/browse.tsx#L93-L110), [app/merchant/[id].tsx:31-35](app/merchant/[id].tsx#L31-L35), and the merchant dashboard. But the gifts tab hand-rolls fetching with `useState`/`useEffect`/`RefreshControl` ([app/(tabs)/gifts.tsx:216-248](app/(tabs)/gifts.tsx#L216-L248)) — losing caching, dedupe, and background refresh for the screen users revisit most.

- **[High] Pagination fetched, then thrown away.** `getSentGifts`/`getReceivedGifts` return a `pagination` object ([src/services/giftService.ts:103-130](src/services/giftService.ts#L103-L130)) but the screen only ever loads page 1 and discards the pagination metadata ([app/(tabs)/gifts.tsx:228-233](app/(tabs)/gifts.tsx#L228-L233)). Users with >20 gifts silently can't see them.

- **[High] Token-refresh queue can hang forever.** In [src/services/api.ts:59-70](src/services/api.ts#L59-L70), if `onTokenExpired()` *resolves* `null` (refresh token missing — [src/store/authStore.ts:24-25](src/store/authStore.ts#L24-L25) returns null without throwing), `processQueue` is never invoked in the non-throw path, so every request queued during the refresh is left as a promise that never settles. Verify + fix in Phase 2.

- **[Medium] Tokens and full user JSON passed as route params.** [app/(auth)/login.tsx:33-36](app/(auth)/login.tsx#L33-L36) → [app/(auth)/verify-phone.tsx:17-22](app/(auth)/verify-phone.tsx#L17-L22) sends `access_token`, `refresh_token`, and serialized user through navigation params. Params leak into navigation state and are URL-representable via the `ehdy://` scheme. Hold the pending session in the store instead.

- **[Medium] First-run language mismatch for Arabic devices.** i18next initializes from the device locale ([src/i18n/index.ts:10](src/i18n/index.ts#L10)), but `languageStore` defaults to `language: 'en', isRTL: false` and `loadLanguage()` only applies a *saved* choice ([src/store/languageStore.ts:24-37](src/store/languageStore.ts#L24-L37)). An Arabic-device user with no saved preference gets Arabic strings in an LTR layout until they manually switch.

- **[Low] Dead statement in refresh handler:** `get(); // trigger re-read` does nothing ([src/store/authStore.ts:30](src/store/authStore.ts#L30)); the helper also mixes `get()` closure access with direct `useAuthStore.setState` — convoluted for what it does.

- **[Low] `loadFromStorage` catch comment says "corrupted storage — clear it" but clears nothing** ([src/store/authStore.ts:76-77](src/store/authStore.ts#L76-L77)).

---

## 4. Component / screen structure findings

- **[High] Monolithic screens.** [app/gift/index.tsx](app/gift/index.tsx) is 706 lines: a 3-step wizard (`renderReview`/`renderCustomize`/`renderCheckout` as inner functions), payment orchestration, phone normalization, dirty-state guard, and ~190 lines of styles in one file. [app/(tabs)/gifts.tsx](app/(tabs)/gifts.tsx) (574) and [app/(merchant-tabs)/scan.tsx](app/(merchant-tabs)/scan.tsx) (566 — four modal components defined inline) are the same pattern. The steps and modals are self-contained and extraction-ready.

- **[High] Non-functional UI shipped to users.** Buttons that render but do nothing:
  - Profile: Edit Profile / Notifications / Privacy & Security / Help & Support all `onPress={() => {}}` ([app/(tabs)/profile.tsx:62-65](app/(tabs)/profile.tsx#L62-L65))
  - Home: notification bell ([app/(tabs)/index.tsx:70](app/(tabs)/index.tsx#L70)), FeaturedBanner ([:86](app/(tabs)/index.tsx#L86)), Popular Gifts "See all" ([:146](app/(tabs)/index.tsx#L146)), and every `GiftCardItem` tap/add ([:152](app/(tabs)/index.tsx#L152) — the popular-gifts grid is entirely inert)
  - Gift flow: "View All" themes ([app/gift/index.tsx:237-239](app/gift/index.tsx#L237-L239)); the **payment-method selector** (card vs whish, [app/gift/index.tsx:82](app/gift/index.tsx#L82), [:384-410](app/gift/index.tsx#L384-L410)) is never sent to the backend — choosing "whish" changes nothing
  - Merchant detail: floating "..." button with no `onPress` ([app/merchant/[id].tsx:84-89](app/merchant/[id].tsx#L84-L89))

- **[Medium] Manual 2-column row chunking duplicated 3×** with the identical `reduce` ([app/(tabs)/browse.tsx:122-126](app/(tabs)/browse.tsx#L122-L126), [app/(tabs)/index.tsx:48-52](app/(tabs)/index.tsx#L48-L52), [app/merchant/[id].tsx:50-56](app/merchant/[id].tsx#L50-L56)). `FlatList numColumns` or one shared helper.

- **[Medium] Home screen has zero loading/error UI.** All four queries on [app/(tabs)/index.tsx:28-46](app/(tabs)/index.tsx#L28-L46) ignore `isLoading`/`isError`; on failure the home page just renders empty sections with no retry, while `ErrorState` exists and is used elsewhere.

- **[Medium] Scan flow race/UX gaps** (merchant redeems money here): `RedemptionModal` gets `loading={false}` hardcoded ([app/(merchant-tabs)/scan.tsx:431](app/(merchant-tabs)/scan.tsx#L431)) while `handleConfirm` awaits the OTP call with no pending state → double-tap fires duplicate OTP sends; `lastScannedRef` is never reset when the camera modal closes ([:42-49](app/(merchant-tabs)/scan.tsx#L42-L49)), so scanning the *same* code twice in a session (legitimate for partial redemptions) is silently ignored.

- **[Low] Six gift-card theme components are identical one-line wrappers** around `BaseCard` ([src/components/gift/cards/](src/components/gift/cards/)) — a documented extension point, but today it's 6 files of pure indirection plus a `GIFT_THEMES.find(...)!` non-null assertion each.

- **[Low] `keyExtractor={(_, i) => String(i)}`** on the browse grid rows ([app/(tabs)/browse.tsx:225](app/(tabs)/browse.tsx#L225)) — index keys on a list that reorders with search/filter.

- **[Low] Category styling hardcoded to backend slugs.** [app/(tabs)/browse.tsx:22-40](app/(tabs)/browse.tsx#L22-L40) maps 16 slug strings to icons/colors client-side; any new backend category silently falls back. Same idea duplicated in `CategoryRow`.

---

## 5. Naming, consistency, duplication, dead code

- **[High] i18n coverage is split down the middle.** Customer screens are fully translated; the **entire merchant portal is hardcoded English** ([app/(merchant-tabs)/scan.tsx](app/(merchant-tabs)/scan.tsx), [dashboard.tsx:58-117](app/(merchant-tabs)/dashboard.tsx#L58-L117), history, account, merchant login). Scattered hardcoded English on customer paths too: confirm-recipient alert ([app/gift/index.tsx:487-494](app/gift/index.tsx#L487-L494)), success/share copy ([app/payment/callback.tsx:77-78](app/payment/callback.tsx#L77-L78), [:130-131](app/payment/callback.tsx#L130-L131)), card face text "A gift for"/"From" ([src/components/gift/cards/BaseCard.tsx:43](src/components/gift/cards/BaseCard.tsx#L43), [:66](src/components/gift/cards/BaseCard.tsx#L66)), tab bar titles ([app/(tabs)/_layout.tsx:33-55](app/(tabs)/_layout.tsx#L33-L55)), the "All" pill ([app/(tabs)/browse.tsx:182](app/(tabs)/browse.tsx#L182)), "Store Credit"/"Gift" fallbacks ([app/(tabs)/gifts.tsx:29-31](app/(tabs)/gifts.tsx#L29-L31)), merchant share message ([app/merchant/[id].tsx:69](app/merchant/[id].tsx#L69)). Dates always format as `en-US` ([app/(tabs)/gifts.tsx:76](app/(tabs)/gifts.tsx#L76)).

- **[High] 15 translation keys missing from ar.json** — everything under `auth.verifyPhone.*` and `auth.register.phone*` (en: 203 keys, ar: 188). Arabic users hit English fallbacks on the phone-verification flow that a recent commit ("fixed phone verification logic") touched.

- **[Medium] `Merchant` type has drifted from the API.** [app/merchant/[id].tsx](app/merchant/[id].tsx) casts `(merchant as any)` 8 times for `contact_phone`, `is_featured`, and even fields that *are* on the type (`banner_image_url`, `logo_url` at [:103-111](app/merchant/[id].tsx#L103-L111)) — strict mode is being opted out of exactly where the type should be fixed. 14 `as any` across the app total.

- **[Medium] Control flow via error-message substring matching.** [app/(auth)/register.tsx:43-47](app/(auth)/register.tsx#L43-L47) branches on `err.message.includes('pending verification')` / `'Phone verification pending'` — breaks the moment backend copy changes; needs error codes.

- **[Medium] Duplication:** unsplash fallback image URL ([app/gift/index.tsx:22](app/gift/index.tsx#L22) vs [app/merchant/[id].tsx:296](app/merchant/[id].tsx#L296)); `GIFT_BASE_URL = 'https://ehdy.app/gift'` ([app/(tabs)/gifts.tsx:52](app/(tabs)/gifts.tsx#L52), [app/payment/callback.tsx:17](app/payment/callback.tsx#L17)) plus the same URL inlined a third time ([app/(tabs)/gifts.tsx:148](app/(tabs)/gifts.tsx#L148)); `+961` phone normalization implemented differently in three places ([app/(auth)/register.tsx:39](app/(auth)/register.tsx#L39), [app/gift/index.tsx:105-107](app/gift/index.tsx#L105-L107), [src/components/gift/ContactPickerModal.tsx:75](src/components/gift/ContactPickerModal.tsx#L75)); login/register share ~40 lines of identical input styles with no shared form field component.

- **[Low] Dead/vestigial code:** unused `GiftCard` and `Category` types ([src/types/index.ts:37-51](src/types/index.ts#L37-L51)); preset-as-`itemId` param that the gift flow drops when `isCredit` ([app/merchant/[id].tsx:257-259](app/merchant/[id].tsx#L257-L259) — leftover from the removed `store_credit_preset_id` logic, and its comment now lies); comment says 300 ms debounce, code says 600 ([app/(tabs)/browse.tsx:87-89](app/(tabs)/browse.tsx#L87-L89)); `?? '—'` after `.join(' ')` can never fire ([app/(tabs)/gifts.tsx:144](app/(tabs)/gifts.tsx#L144)).

- **[Low] Country assumption baked in everywhere:** `+961`/🇱🇧 hardcoded in register, gift flow, and contact picker while the README promises "gift to anyone, anywhere."

---

## 6. Lint / tooling posture

- **[Medium] Lint is the stock Expo config, and nothing runs it.** [eslint.config.js](eslint.config.js) is `eslint-config-expo` verbatim — no `@typescript-eslint` strictness, no `react-hooks/exhaustive-deps` enforcement level bump, no import ordering, no restriction on `as any`. CI runs tests only ([.github/workflows/ci.yml:26-27](.github/workflows/ci.yml#L26-L27)): **`npm run lint` and `tsc --noEmit` never execute anywhere**, so strict-mode TS is only as good as whoever's editor caught it.
- **[Medium] Test coverage is services-only and thin.** 4 files: `authStore`, `giftService`, `merchantService`, and an `api.test.ts` that only asserts two setters work ([src/__tests__/api.test.ts](src/__tests__/api.test.ts)). The refresh-queue logic — the hardest code in the app — is untested. Zero component/screen tests despite jest-expo being configured for `.tsx`.
- **[Low] No pre-commit hooks** (no husky/lint-staged), no prettier config, no coverage threshold.
- **[Low] `reactCompiler: true` + `typedRoutes: true`** are experiments doing real work here; the `as any` on a route push ([app/(auth)/login.tsx:96](app/(auth)/login.tsx#L96)) defeats typed routes at the one place it was inconvenient.

---

## 7. Phase 2 targets (deep inspection, in priority order)

1. **Payment integrity flow** — [app/gift/index.tsx:99-166](app/gift/index.tsx#L99-L166) + [app/payment/callback.tsx:49-74](app/payment/callback.tsx#L49-L74). The callback marks payment **success purely from client-side redirect params**, and "no `tap_id` → go straight to success" ([callback.tsx:66-70](app/payment/callback.tsx#L66-L70)) looks exploitable/mis-stateable. Confirm the backend independently verifies the Tap charge; trace draft deletion races.
2. **Token refresh queue** — [src/services/api.ts:36-76](src/services/api.ts#L36-L76): hung-promise path when refresh resolves null; behavior when refresh itself 401s; interplay with `loadFromStorage` ordering at cold start.
3. **Auth flows** — tokens through route params ([login.tsx:33-36](app/(auth)/login.tsx#L33-L36)); phone-verified user state written client-side (`is_phone_verified: true` locally, [verify-phone.tsx:60](app/(auth)/verify-phone.tsx#L60)); back-navigation out of verify-phone with a half-created session.
4. **Merchant portal session & redemption state machine** — no 401 handling ([merchantPortalService.ts](src/services/merchantPortalService.ts)); scan.tsx double-submit and same-code-rescan issues; partial-redemption amount validation client-side only.
5. **Gifts tab** — migrate to React Query, implement pagination, i18n of fallbacks.
6. **RTL/i18n correctness pass** — first-run Arabic mismatch, missing ar keys, merchant portal, `Intl` date locales, `appKey` remount side effects (query cache survives, form state doesn't).
7. **Dead-code deletion** — root starter tree + `app/modal.tsx` route, unused types, no-op UI decisions (ship or remove).
8. **CI hardening** — add `tsc --noEmit` + `eslint` jobs; then ratchet lint rules.

## 8. Could not verify / assumed

- **Backend behavior is out of scope/repo** — everything about server-side payment verification, error codes, rate limiting, and merchant OTP issuance is assumed, not verified. The payment-flow severity above depends on it.
- **`.env` contents were not read** (file exists locally, correctly gitignored). Assumed it only holds `EXPO_PUBLIC_API_URL`; anything `EXPO_PUBLIC_*` is bundled into the client and must not be a secret — worth confirming.
- **No native project folders** (`/ios`, `/android` gitignored) — assumed pure Expo prebuild with no manual native patches; cannot confirm what `eas build` produces.
- **Whish/OMT payment method** — assumed unimplemented (selector is cosmetic); could be a backend-side default I can't see.
- **`components/`, `hooks/`, `constants/` root tree** confirmed dead except via `app/modal.tsx`; assumed no runtime reflection/dynamic import reaches it.
- **React Compiler compatibility** — enabled experimentally; not verified that mutable refs patterns (e.g. `payingRef`) behave identically under it.
- Line counts and the en/ar key diff were measured (`wc -l`, key-set comparison); everything else with a file:line ref was read directly.
