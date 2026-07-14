# AUDIT — Phase 2: Deep Evaluation

**Date:** 2026-07-08 · **Scope:** read-only deep inspection; no code modified. Builds on [AUDIT_PHASE1.md](AUDIT_PHASE1.md); every Phase 1 "verify in Phase 2" item was traced through the actual code paths.

---

## Executive summary

Overall health: a well-styled, coherently structured Expo app whose **money paths are the weakest code in it** — payment success is decided client-side, the token-refresh queue can hang every in-flight request forever, and the merchant redemption flow is a non-atomic two-call sequence that can strand a merchant mid-redemption. Top 3 risks: (1) payment integrity — the `/payment/callback` "no tap_id → success" branch and the unhandled closed-browser case can show success for unpaid gifts or double-charge on retry; (2) the auth refresh dead-end (hung promises + silent logout with no navigation reset); (3) zero CI enforcement of types/lint plus near-zero test coverage on exactly these paths, so none of this regresses visibly. **Maturity: 4/10** — good UI/UX craft and idiomatic Expo Router structure, but production-payments discipline (idempotency, server-authoritative state, cache hygiene on logout, tests on money paths) is largely absent.

---

## 1. Correctness & bugs

### [Critical] Token-refresh queue leaves requests hanging forever, and stale resolvers fire on the *next* refresh
[src/services/api.ts:59-70](src/services/api.ts#L59-L70). Two distinct failure modes, both real:

1. **Hang:** `onTokenExpired()` *resolves* `null` in two ways that never throw — no refresh token stored ([src/store/authStore.ts:24-25](src/store/authStore.ts#L24-L25)) or refresh request fails (the `catch` at [authStore.ts:33-36](src/store/authStore.ts#L33-L36) returns `null`). In `api.ts`, `processQueue` is only called when `newToken` is truthy or when `onTokenExpired()` **throws**. On a resolved `null`, every request queued at [api.ts:44-53](src/services/api.ts#L44-L53) is a promise that never settles. Any screen `await`ing those requests shows a spinner forever.
2. **Zombie queue:** because `refreshQueue` is not flushed in that path, the stale resolvers stay in the array. Minutes later, an unrelated 401 that *does* refresh successfully calls `processQueue(token)` and retries those long-abandoned requests (the screens that issued them may be unmounted) — duplicate side-effectful POSTs are possible.

**Fix:** make the failure path symmetric: `try { const t = await onTokenExpired(); processQueue(t); if (t) { …retry… } } catch { processQueue(null); } finally { isRefreshing = false; }` — i.e. `processQueue` must run exactly once per refresh cycle regardless of outcome. When it flushes with `null`, also route the user to login (see §5 AuthGate gap). Add a unit test that resolves the handler with `null` and asserts the queued promise rejects.

### [Critical] Payment success is client-decided; "no tap_id → success" is reachable and wrong
[app/payment/callback.tsx:49-74](app/payment/callback.tsx#L49-L74). The screen trusts redirect-URL params end-to-end:
- `status === 'FAILED' | 'CANCELLED'` → failure UI — fine, but `status` is attacker/user-controllable (it's parsed from the return URL at [app/gift/index.tsx:135-141](app/gift/index.tsx#L135-L141)).
- `tap_id` present → `POST /gifts/confirm-payment` — good **only if** the backend independently verifies the charge with Tap (out of repo; unverified).
- **No `tap_id` → `setPaymentStatus('success')` and the retry draft is deleted** ([callback.tsx:66-70](app/payment/callback.tsx#L66-L70)). The comment says "alternate payment method", but no alternate method exists (the whish selector is cosmetic, see §1 below). Any redirect that loses the query param — or a crafted `ehdy://` URL — shows the full success screen with share buttons for a gift that was never paid. The recipient gets a WhatsApp link to a `share_code` that the backend may consider unpaid, or worse, honors.

**Fix:** delete the no-`tap_id` success branch — treat missing `tap_id` as failure/unknown. Make the success UI contingent on the *server's* answer only: `confirm-payment` should return the verified gift state, and the share link should come from that response, not from route params. Confirm with the backend team that a Tap webhook exists so payment state never depends on the app completing this screen.

### [Critical] Closed/dismissed payment browser is silently ignored → double-charge path
[app/gift/index.tsx:133-159](app/gift/index.tsx#L133-L159) only handles `browserResult.type === 'success'`. If the user pays in the Tap browser and then closes it before the redirect fires (`type: 'cancel' | 'dismiss'` — a normal, common action), the app does nothing: no callback, no `confirm-payment`, no message. The user is back on checkout with an active "Confirm & Pay" button; tapping it calls `initiateGiftPayment` **again**, creating a second charge attempt for a gift that may already be paid. There is also no reconciliation on next launch (nothing queries "do I have a paid-but-unconfirmed gift?").

**Fix:** handle `cancel`/`dismiss` explicitly: navigate to the callback screen in an "unknown" state and ask the backend for the status of `result.gift_sent_id` (add a `GET /gifts/:id/payment-status` if it doesn't exist). Disable re-initiation while a charge for the same draft is unresolved — the backend should key idempotency on `draft_id`.

### [High] Merchant redemption: verify-OTP and confirm are two non-atomic calls on the money path
[app/(merchant-tabs)/scan.tsx:349-361](app/(merchant-tabs)/scan.tsx#L349-L361) does `verifyRedemptionOtp(...)` then `confirmRedemption(...)`. If verify succeeds and confirm fails (10s axios timeout on flaky café Wi-Fi is realistic), the OTP is consumed server-side but nothing was redeemed. The single `catch` shows "Verification failed"; the merchant's only retry re-submits the *same consumed OTP*, which will now fail verification. The merchant is stuck at the counter with a customer. There's also no idempotency key, so a confirm that timed out client-side but succeeded server-side followed by a retry could double-redeem.
**Fix:** collapse to one backend endpoint (`confirm-redemption` taking the OTP) or make `confirmRedemption` retryable independently of verify (track `otpVerified` state client-side and skip re-verify on retry). Send a client-generated idempotency key with confirm.

### [High] Double-tap on "Confirm Redemption" sends duplicate OTPs
`RedemptionModal` is rendered with `loading={false}` hardcoded ([scan.tsx:431](app/(merchant-tabs)/scan.tsx#L431)) while `handleConfirm` ([scan.tsx:328-336](app/(merchant-tabs)/scan.tsx#L328-L336)) awaits `sendRedemptionOtp` with no pending state. Two taps → two OTP WhatsApp messages to the recipient → confusion about which code is valid (and OTP-send cost). **Fix:** add `otpSending` state, pass it as `loading`, guard `handleConfirm` on it.

### [High] Saved-language / device-locale mismatch shows the wrong language entirely
[src/store/languageStore.ts:27](src/store/languageStore.ts#L27): `loadLanguage` applies the saved language only `if (saved && saved !== get().language)`. The store default is `'en'`. i18next, however, initializes from the **device locale** ([src/i18n/index.ts:10](src/i18n/index.ts#L10)). Two concrete failures:
1. Arabic device, user explicitly chose **English** (saved `'en'`): the guard short-circuits (`'en' === 'en'`), `i18next.changeLanguage('en')` never runs → the whole app renders **Arabic** while the store claims English and layout is LTR.
2. Arabic device, no saved value: Arabic strings in an LTR layout (Phase 1 finding, confirmed).
**Fix:** drop the `!== get().language` guard and always reconcile: compute the effective language (`saved ?? deviceLocale ?? 'en'`), call `i18next.changeLanguage(effective)`, and set `isRTL` from it. The store default should not pretend to know the language before storage is read.

### [High] `verify-phone` trusts client state and crashes on bad params
- [app/(auth)/verify-phone.tsx:59-60](app/(auth)/verify-phone.tsx#L59-L60): `JSON.parse(userJson)` with no try/catch — a malformed/missing `user` param (cold-start deep link into this route via the `ehdy://` scheme is possible) throws and error-screens the app.
- The same line writes `is_phone_verified: true` into the locally-stored user without the server re-issuing the user object. If `verifyPhoneOtp` succeeded server-side but the *server's* user record update failed (or the client is lying to itself after a race), local and server state diverge until next sign-in. **Fix:** have `/auth/verify-phone-otp` return the updated user + tokens (like `verify-email` does) and use that.
- Back-navigating from this screen abandons a session whose tokens were already issued but never stored — sign-in then requires a fresh login, and the earlier tokens float in navigation params (see §8).

### [High] OTP auto-send fires on every mount with no cooldown, and "resend" reports false success
[verify-phone.tsx:29-31](app/(auth)/verify-phone.tsx#L29-L31) sends an OTP on mount (`useEffect([], …)` — remounts re-send). `handleResend` ([verify-phone.tsx:70-80](app/(auth)/verify-phone.tsx#L70-L80)) awaits `handleSendOtp`, but `handleSendOtp` **swallows its own errors** (catch + Alert inside, [verify-phone.tsx:33-39](app/(auth)/verify-phone.tsx#L33-L39)) — so on failure the user gets the error alert *followed by* the "code sent!" success alert. **Fix:** let `sendPhoneOtp` errors propagate to the caller; add a 30–60s resend cooldown timer.

### [Medium] Gifts tab: out-of-order responses win, and errors can render as "no gifts"
[app/(tabs)/gifts.tsx:225-242](app/(tabs)/gifts.tsx#L225-L242): toggling sort or status filter re-runs `fetchAll`; nothing cancels or sequences overlapping requests, so a slow older response can overwrite a newer one (classic latest-wins race — fixed for free by React Query keys, see §4). Separately, `setFetchError(err?.message ?? null)` means an error without a `message` leaves `fetchError` null → the UI falls through to the FlatList with stale/empty data and shows the "No gifts yet" empty state on a *failed* fetch.

### [Medium] Lebanese phone normalization keeps the leading 0 → invalid E.164
Three call sites normalize as `+961 + digits` with no leading-zero strip: [app/gift/index.tsx:105-107](app/gift/index.tsx#L105-L107), [app/(auth)/register.tsx:39](app/(auth)/register.tsx#L39), and the contact picker strips only `+961` prefix/formatting ([src/components/gift/ContactPickerModal.tsx:75](src/components/gift/ContactPickerModal.tsx#L75)). Lebanese users habitually write numbers as `03 123 456` / `70 123 456`; `03123456` becomes `+96103123456`, which is not a valid E.164 number — the recipient's WhatsApp OTP/gift message goes nowhere, silently. **Fix:** one shared `normalizeLebanesePhone()` that strips a leading `0`, validates length (7–8 digits after prefix), and rejects obviously bad input *before* payment.

### [Medium] Scan-flow state leaks between redemptions
- `RedemptionModal.partialAmount` and `OtpModal.otp` live in components that are always mounted (visibility toggled) and are **never reset** ([scan.tsx:113](app/(merchant-tabs)/scan.tsx#L113), [scan.tsx:208](app/(merchant-tabs)/scan.tsx#L208)). Scan gift A, type a partial amount, cancel, scan gift B → B's confirm sheet is pre-filled with A's amount; one hasty confirm redeems the wrong amount. Same for a stale OTP.
- `lastScannedRef` is never cleared ([scan.tsx:42-49](app/(merchant-tabs)/scan.tsx#L42-L49)): re-scanning the *same* code later in the session (legitimate for a second partial redemption) is silently ignored — the camera just does nothing, which reads as "broken scanner".
**Fix:** reset modal-local state when `visible` flips true (or key the modals by `activeCode`), and clear `lastScannedRef` on camera close.

### [Medium] Step dots bypass the recipient-confirmation guard
The confirm-recipient alert only fires from the bottom "Continue" button on step 2 ([app/gift/index.tsx:483-494](app/gift/index.tsx#L483-L494)). The tappable step indicator ([gift/index.tsx:433-446](app/gift/index.tsx#L433-L446)) jumps straight to step 3 (`goToStep(s)`), skipping the "is this the right number?" check that exists precisely because a wrong number sends someone else the gift.

### [Low] `handlePay` couples payment to draft-saving
[gift/index.tsx:109-131](app/gift/index.tsx#L109-L131): `saveRetryDraft` is awaited *before* `initiateGiftPayment`; if the convenience draft call fails, the entire purchase aborts. Fire it in parallel and tolerate its failure.

### [Low] Store-credit currency guess
[app/merchant/[id].tsx:263](app/merchant/[id].tsx#L263): custom credit currency is `storeCredits[0]?.currency_code ?? 'USD'` — a merchant with no presets silently gets USD regardless of their actual currency. The dashboard likewise hardcodes `'USD'` for revenue ([app/(merchant-tabs)/dashboard.tsx:89](app/(merchant-tabs)/dashboard.tsx#L89), [:106](app/(merchant-tabs)/dashboard.tsx#L106)).

---

## 2. TypeScript rigor

`strict: true` is genuinely on ([tsconfig.json:4](tsconfig.json#L4)) — but nothing runs `tsc` (see §9), so it's advisory.

- **[High] `as any` clusters exactly where types matter.** 14 occurrences. Eight are in [app/merchant/[id].tsx](app/merchant/[id].tsx) — and the kicker is that `logo_url`, `banner_image_url`, `is_verified` **already exist** on `Merchant` ([src/types/index.ts:6-15](src/types/index.ts#L6-L15)); only `contact_phone` and `is_featured` are actually missing. So 6 of 8 casts are pure habit that discards checking the app *has*. **Fix:** add the two missing fields to `Merchant`, delete all eight casts.
- **[Medium] Typed routes defeated at 4 call sites** — `router.push('/(auth)/forgot-password' as any)` ([app/(auth)/login.tsx:96](app/(auth)/login.tsx#L96)), plus [welcome.tsx:32](app/(auth)/welcome.tsx#L32), [merchant-auth/login.tsx:108](app/(merchant-auth)/login.tsx#L108), [account.tsx:22](app/(merchant-tabs)/account.tsx#L22). These are the navigation edges between the three route groups — exactly where a typo would strand users. The casts likely exist because `.expo/types` was stale; regenerate and remove.
- **[Medium] Non-null assertions on data that can be absent:** `data!.recent_redemptions` ([app/(merchant-tabs)/dashboard.tsx:128](app/(merchant-tabs)/dashboard.tsx#L128)) — guarded by the JSX condition today, safe only until someone reorders it; six `GIFT_THEMES.find(...)!` ([src/components/gift/cards/](src/components/gift/cards/)) that crash at module load if a theme id is renamed.
- **[Medium] `catch (err: any)` in every handler** (~20 sites) with `err.message` dereference. One shared `getErrorMessage(err: unknown)` fixes all of them and centralizes the i18n fallback.
- **[Low]** `pagination: any` in [merchantPortalService.ts:113](src/services/merchantPortalService.ts#L113); the `i18n()` helper double-casts `as any as string` ([src/i18n/index.ts:24](src/i18n/index.ts#L24)).

---

## 3. Hooks & rendering

- **[High] Effects with missing deps that are actual bugs, not lint noise:** `useEffect(() => { handleSendOtp(); }, [])` ([verify-phone.tsx:29-31](app/(auth)/verify-phone.tsx#L29-L31)) — see §1; callback confirm effect lists `[status, tap_id]` but reads `draft_id` ([app/payment/callback.tsx:74](app/payment/callback.tsx#L74)) — currently harmless (params don't change), but it's exactly the pattern `react-hooks/exhaustive-deps` exists for, and that rule isn't enforced anywhere (§9).
- **[High] `ContactPickerModal.loadContacts` has no error handling** ([ContactPickerModal.tsx:38-62](src/components/gift/ContactPickerModal.tsx#L38-L62)): if `getContactsAsync` throws (it can, on large contact books / permission races), the promise rejects unhandled and `loading` stays `true` — spinner forever. Permission denial silently closes the modal with zero explanation ([:41-45](src/components/gift/ContactPickerModal.tsx#L41-L45)) — the user tapped "pick contact" and the modal just vanishes. Wrap in try/finally; on denial show a message with a `Linking.openSettings()` path.
- **[Medium] Index keys on reordering lists:** browse grid rows ([app/(tabs)/browse.tsx:225](app/(tabs)/browse.tsx#L225)) reorder with every search/filter keystroke; merchant history ([app/(merchant-tabs)/history.tsx:63](app/(merchant-tabs)/history.tsx#L63)) has a real unique key available (`redemption_code` + timestamp). Same for the chunked-row `key={i}` in [index.tsx:150](app/(tabs)/index.tsx#L150) and [merchant/[id].tsx:194](app/merchant/[id].tsx#L194).
- **[Medium] Inline component allocations in list props** — `ItemSeparatorComponent={() => <View …/>}` and inline `renderItem` closures in every FlatList ([gifts.tsx:326-332](app/(tabs)/gifts.tsx#L326-L332), [browse.tsx:228-234](app/(tabs)/browse.tsx#L228-L234), [history.tsx:64-79](app/(merchant-tabs)/history.tsx#L64-L79)). React Compiler (`reactCompiler: true`, [app.json:55](app.json#L55)) *may* be memoizing much of this — but you're betting list perf on an experiment (Phase 1 flagged the same bet re: `payingRef` mutation patterns).
- **[Low] The `gift/index.tsx` steps are closures, not components** (`renderReview()` etc. called inline, [gift/index.tsx:460-462](app/gift/index.tsx#L460-L462)) — every keystroke in any field re-executes all three step trees' JSX. Works at this size; extraction (Phase 1's recommendation) also fixes it.
- **[Low] Cleanup done right, for the record:** the visit-tracking debounce in [merchant/[id].tsx:40-44](app/merchant/[id].tsx#L40-L44) and the search debounce in [browse.tsx:88-91](app/(tabs)/browse.tsx#L88-L91) both clean up correctly (though the latter's comment still says 300ms over a 600ms timer).

---

## 4. State & data

- **[High] React Query cache is never cleared on logout → cross-account data leak on shared devices.** `clearAuth` ([authStore.ts:56-63](src/store/authStore.ts#L56-L63), [profile.tsx:18](app/(tabs)/profile.tsx#L18)) and merchant sign-out ([account.tsx:20-23](app/(merchant-tabs)/account.tsx#L20-L23)) touch only SecureStore + zustand. `queryClient` ([app/_layout.tsx:24-26](app/_layout.tsx#L24-L26)) keeps `recently-viewed`, `merchant-dashboard` (another merchant's revenue!), and redemption history for the next account that signs in on the device — served instantly from cache within `staleTime`. This is a data-exposure bug, not a hygiene nit, because the merchant portal is explicitly multi-staff. **Fix:** call `queryClient.clear()` in both `clearAuth` implementations (export it from a module, not just the layout), and/or put the user/merchant id into every query key.
- **[High] Gifts tab: hand-rolled fetching loses pagination, focus-refresh, and dedupe** (confirmed Phase 1 target). Page 1 only, pagination metadata discarded ([gifts.tsx:228-233](app/(tabs)/gifts.tsx#L228-L233) vs. [giftService.ts:103-130](src/services/giftService.ts#L103-L130)) — a user's 21st gift is unreachable. No `useFocusEffect`/React Query — after sending a gift and returning to this tab, the new gift **doesn't appear** until manual pull-to-refresh. **Fix:** `useInfiniteQuery(['gifts', tab, sortOrder, statusFilter])` — this also deletes the race in §1 and gives `refetchOnWindowFocus` semantics via a focus hook.
- **[Medium] Merchant history pagination is dead code:** `const [page, setPage] = useState(1)` — `setPage` is never called ([history.tsx:43-47](app/(merchant-tabs)/history.tsx#L43-L47)). 30 redemptions max, ever, with a "N total" header advertising more.
- **[Medium] No request cancellation anywhere.** No `AbortSignal` usage in either axios client; React Query's `signal` isn't wired into `queryFn`s. Combined with the 10s timeout, a user flicking between browse categories queues up to 10s of zombie requests each.
- **[Medium] React Query focus/online managers are not wired for RN.** React Query on RN needs explicit `focusManager`/`onlineManager` wiring with `AppState`/NetInfo — without it, `refetchOnWindowFocus`-class behavior and `refetchInterval` pause/resume don't work as assumed (the dashboard's `refetchInterval: 60_000`, [dashboard.tsx:40](app/(merchant-tabs)/dashboard.tsx#L40), also cannot skip refetching while the app is foregrounded-but-idle).
- **[Low] Home screen ignores every query state** — no `isLoading`/`isError` on any of its four queries ([index.tsx:28-46](app/(tabs)/index.tsx#L28-L46)); confirmed from Phase 1, still the single most user-visible polish gap on network loss.

---

## 5. Navigation

- **[High] AuthGate has a merchant dead-end and no reaction to mid-session logout.** [app/_layout.tsx:34-57](app/_layout.tsx#L34-L57): the customer-side redirect excludes `(merchant-tabs)` (`!inMerchantTabs` at line 52), and the merchant redirect only fires when `merchantAuth` is true. So an **unauthenticated** user sitting in `(merchant-tabs)` is never redirected. Today the only exit is the manual `router.replace` in account.tsx — but the merchant client has **no 401 handling** ([merchantPortalService.ts:20-26](src/services/merchantPortalService.ts#L20-L26)), so when the merchant token expires the app stays on merchant tabs with every call failing as raw alert text, forever. Same class of gap: customer `clearAuth()` from the refresh-failure path (§1) flips `isAuthenticated` while the user might be mid-`/gift` purchase — AuthGate does catch that (segment ≠ excluded groups → welcome), but the in-flight screen's promises are the ones hanging in the dead queue. **Fix:** add a 401 interceptor to `merchantApi` that calls `merchantAuthStore.clearAuth()`, and make AuthGate redirect `!merchantAuth && inMerchantTabs → merchant login`.
- **[High] Session tokens ride through navigation params** (confirmed Phase 1 target): [login.tsx:33-36](app/(auth)/login.tsx#L33-L36) and [verify-email.tsx:42-45](app/(auth)/verify-email.tsx#L42-L45) push `access_token`, `refresh_token`, and the serialized user into router params for verify-phone. Params persist in navigation state and are representable as an `ehdy://` URL. **Fix:** add a `pendingSession` field to `authStore` (memory only); verify-phone reads it from the store.
- **[Medium] Dual-session lockout confirmed** ([_layout.tsx:46-49](app/_layout.tsx#L46-L49)): merchant login doesn't clear the customer session or vice versa; while `merchantAuth` is true every customer-area segment force-redirects to merchant scan. A staff member who also uses the app as a customer cannot get back without signing out of the portal. Decide: mutually exclusive sessions (clear the other on login) or an explicit mode switcher.
- **[Medium] Shared gift links can't open the app.** Success screen shares `https://ehdy.app/gift/<code>` ([callback.tsx:17](app/payment/callback.tsx#L17), [:78](app/payment/callback.tsx#L78)), but [app.json](app.json) has **no** iOS `associatedDomains` and no Android `intentFilters` for `ehdy.app` — only the `ehdy` scheme. Universal/App Links won't route to the app; everything depends on an assumed web experience at ehdy.app (unverified, out of repo).
- **[Low] Hardware-back disabled on merchant login** ([merchant-auth/login.tsx:21-24](app/(merchant-auth)/login.tsx#L21-L24)) while the visible back arrow calls `router.back()` — Android users get inconsistent affordances (`predictiveBackGestureEnabled: false` compounds it).
- **[Low] `'use client'` directive in [forgot-password.tsx:1](app/(auth)/forgot-password.tsx#L1)** — a Next.js-ism with no meaning here; delete before someone cargo-cults it.

---

## 6. Native & platform

- **[High] Camera permission "denied forever" is a dead end:** [scan.tsx:55-65](app/(merchant-tabs)/scan.tsx#L55-L65) renders "Allow camera" → `requestPermission()`, but once the OS has permanently denied (`canAskAgain: false`, one "Don't allow" on Android 11+), that button silently does nothing. A merchant who mis-tapped once can never scan again from inside the app. **Fix:** when `!granted && !canAskAgain`, switch the button to `Linking.openSettings()`.
- **[Medium] Backgrounding during payment is unhandled** — the `openAuthSessionAsync` dismiss case (§1) is also what happens when iOS kills the app in the background mid-payment; on relaunch there is no pending-payment reconciliation. The retry-draft system persists *form* state but not *charge* state.
- **[Medium] Network loss UX:** no `onlineManager`/NetInfo wiring, no offline banner; failures surface as raw axios copy ("timeout of 10000ms exceeded") in alerts ([scan.tsx:322](app/(merchant-tabs)/scan.tsx#L322) et al.). On the LAN-IP fallback issue, Phase 1 stands: a missing `EXPO_PUBLIC_API_URL` silently targets `http://192.168.1.100:3000` ([api.ts:3](src/services/api.ts#L3), [merchantPortalService.ts:5](src/services/merchantPortalService.ts#L5)) — make the prod build throw instead.
- **[Medium] Four native modules shipped but never imported:** `expo-image`, `react-native-webview`, `expo-haptics`, `expo-symbols` ([package.json:31-53](package.json#L31-L53)) — zero matches in `app/` or `src/`. WebView especially is real native binary weight in every build. Meanwhile all images use bare RN `Image` with no caching policy; `expo-image` is *installed* and would give caching + placeholders for free.
- **[Low] iOS-vs-Android divergences:** `StatusBar style="dark"` hardcoded ([_layout.tsx:103](app/_layout.tsx#L103)) with `userInterfaceStyle: "automatic"` ([app.json:9](app.json#L9)) — dark-mode devices get dark-on-dark status text while the app renders light-only; KAV `behavior={undefined}` on Android in auth screens vs `'height'` in the gift flow — pick one convention.

---

## 7. Performance

- **[Medium] Browse "FlatList" virtualization is defeated by row-chunking with index keys** ([browse.tsx:122-126](app/(tabs)/browse.tsx#L122-L126), [:225](app/(tabs)/browse.tsx#L225)): every keystroke's result set re-chunks and re-keys, so recycling never matches. `numColumns={2}` + `keyExtractor={m => m.id}` deletes the helper and fixes both.
- **[Medium] Home is a `ScrollView` mapping all sections** ([index.tsx:62-161](app/(tabs)/index.tsx#L62-L161)) — fine at 6 popular items; will not scale past ~20; the inert `GiftCardItem` grid renders and does nothing (Phase 1). Decide ship-or-remove before optimizing.
- **[Medium] Image handling:** no caching layer, full-size unsplash fallbacks at `w=400` used as 110px thumbs ([gift/index.tsx:22](app/gift/index.tsx#L22)), banner images uncontrolled. Swapping `Image` → `expo-image` (already a dependency!) with `cachePolicy="memory-disk"` is the single cheapest perf win in the app.
- **[Low] Five font weights load before first paint** ([_layout.tsx:63-69](app/_layout.tsx#L63-L69)) — ExtraBold appears unused in `constants/layout` (`Fonts` maps regular/medium/semiBold/bold); dropping it trims startup I/O.
- **[Low] Dead starter tree ships in the bundle** — Phase 1 finding stands; `app/modal.tsx` keeps the root `components/`/`constants/theme` tree alive for Metro.

---

## 8. Security

- **No hardcoded secrets found** — grep across `app/`, `src/`, configs turned up only the public API URL, the unsplash fallback, and the EAS project id. `EXPO_PUBLIC_API_URL` is the only env usage; nothing secret-shaped is bundled. ✔️
- **Token storage is correct in kind** (SecureStore for both sessions, no AsyncStorage anywhere) — but undermined by tokens traveling through **route params** (§5) and the full user JSON stored/parsed without validation ([authStore.ts:70-74](src/store/authStore.ts#L70-L74) — the catch comment "clear it" still clears nothing).
- **[Critical—shared with §1] The payment-callback trust model** is the top security item: client-controlled `status`, success-without-verification path, and share-code issuance *before* payment (`unique_share_link` is returned by `initiate-payment`, [giftService.ts:15-21](src/services/giftService.ts#L15-L21), and displayed on unverified "success"). Whether this is exploitable for free gifts depends entirely on backend verification — **must be confirmed** (see Could-not-verify).
- **[High] Vulnerable dependencies (measured, `npm audit`): 32 advisories — 1 critical, 10 high.** Runtime-relevant: **axios 1.8.4** (high — SSRF via NO_PROXY bypass + prototype-pollution auth bypass; fix ≥1.12) ships in the app bundle and is the transport for every token-bearing request. `form-data` (high) rides with it. The rest (shell-quote critical, tar, undici, ws, lodash, xmldom) are dev/build-chain via expo CLI — lower exposure but `npm audit fix` + an Expo SDK patch bump clears most. Nothing enforces this in CI.
- **[Medium] Unauthenticated OTP endpoints** — `POST /auth/send-phone-otp` takes a bare phone number pre-auth ([authService.ts:48-50](src/services/authService.ts#L48-L50)), and the client will auto-fire it on screen mount (§1). Combined with no client cooldown this is an SMS-pumping amplifier if backend rate limiting is weak (unverified).
- **[Medium] Merchant token lifecycle:** single static token, read from disk per request, no expiry/refresh/revocation handling client-side ([merchantPortalService.ts:14-18](src/services/merchantPortalService.ts#L14-L18)). If these are long-lived JWTs, a stolen device stays authorized indefinitely; pair the 401-interceptor fix (§5) with server-side short expiry.
- **[Low] Input validation is display-level only** — amounts (`parseFloat` of raw strings crossing the payment boundary, [gift/index.tsx:111](app/gift/index.tsx#L111), [merchant/[id].tsx:252](app/merchant/[id].tsx#L252)), message length capped only in the UI ([gift/index.tsx:300](app/gift/index.tsx#L300)). Fine *iff* the backend re-validates everything; the client should still reject `NaN`/`≤0`/absurd amounts before initiating a charge (it does for merchant credit, not for the drafted `custom_credit_amount` on retry).

---

## 9. Testing

- **[High] The money paths have zero tests.** The four suites ([src/__tests__/](src/__tests__/)) cover: authStore state transitions (decent, ~14 cases), giftService/merchantService as thin mocked-axios call-shape checks, and an `api.test.ts` that only asserts two setters store values ([api.test.ts:19-51](src/__tests__/api.test.ts#L19-L51)). **Untested:** the 401 refresh interceptor (including the hang in §1 — a 15-line test with a `null`-resolving handler would have caught it), the payment-callback decision tree, `handlePay`'s browser-result branches, the scan state machine, `languageStore.loadLanguage` reconciliation, and every screen (zero component tests despite jest-expo).
- **[Medium] Riskiest untested paths, in order:** (1) `api.ts` interceptor — pure logic, trivially testable with mocked adapter; (2) `callback.tsx` confirm effect — extract `decidePaymentOutcome(params) → 'confirm'|'failed'|'invalid'` as a pure function and table-test it; (3) phone normalization (3 divergent implementations — consolidating per §1 makes it one testable function); (4) scan flow `handleVerifyOtp` failure sequencing.
- **[Medium] CI runs tests only** ([.github/workflows/ci.yml:26-27](.github/workflows/ci.yml#L26-L27)) — no `tsc --noEmit`, no `eslint`, no `npm audit` gate, no coverage threshold. Strict TS and the exhaustive-deps findings in §3 are only enforced by whoever's editor is open.

---

## Prioritized remediation roadmap

Sequenced so each step de-risks the next; sizes are rough (S ≤ ½ day, M ≈ 1–2 days, L ≥ 3 days).

**Wave 1 — stop the bleeding on money + sessions (do first)**
1. **Fix the refresh queue** (S) — `processQueue` in all paths + unit tests for null/throw/success. Unblocks trusting every other network fix.
2. **Close the payment callback holes** (M) — remove no-`tap_id` success; handle browser `cancel`/`dismiss` with a server status check; confirm backend webhook + idempotency on `draft_id` with the backend team. *Blocked on backend confirmation — start that conversation today.*
3. **Merchant 401 handling + AuthGate merchant dead-end** (S) — interceptor → `clearAuth` → redirect.
4. **Atomic redemption** (M, needs backend) — merge verify+confirm or make confirm retryable with an idempotency key; meanwhile ship the `loading` prop fix and modal state resets (S, client-only, today).

**Wave 2 — make regressions visible before adding more fixes**
5. **CI: add `tsc --noEmit` + `eslint` + `npm audit --audit-level=high`** (S). Bump axios ≥1.12 (S).
6. **Tests for the code you just fixed** (M) — interceptor suite, `decidePaymentOutcome` table test, phone normalizer.

**Wave 3 — correctness that users see weekly**
7. **Language reconciliation fix** (S) — languageStore/i18next mismatch.
8. **Gifts tab → `useInfiniteQuery`** (M) — kills the race, adds pagination + focus refresh.
9. **`queryClient.clear()` on both logouts** (S) + user-id in query keys.
10. **Shared phone normalizer with leading-zero strip** (S) — do together with #6's tests.
11. **Pending-session in store instead of token route params** (S–M).

**Wave 4 — hardening & hygiene**
12. Camera/contacts permission dead-ends → `openSettings` paths (S).
13. Merchant type fields + delete all `as any`/`!` (S); regenerate typed routes, drop the 4 route casts (S).
14. ar.json 15 missing keys + merchant-portal i18n pass (M).
15. Remove dead starter tree, `modal.tsx`, 4 unused native deps (S); `expo-image` migration (M); browse `numColumns` refactor (S).
16. Ship-or-delete decision on all inert UI (whish selector, popular-gifts grid, profile rows) (product decision + S each).

---

## Could not verify / assumed

- **Backend payment verification** — whether `/gifts/confirm-payment` independently verifies the Tap charge, whether a Tap **webhook** exists (the entire §1 double-charge/false-success severity hinges on this), whether `initiate-payment` is idempotent per draft, and whether an unpaid `unique_share_link` is redeemable. All out of repo. **The Critical ratings assume the worst; if the backend is fully authoritative, the callback findings drop to High (UX-integrity) but the double-charge path remains.**
- **OTP rate limiting** (phone signup + redemption OTPs) — assumed present server-side; client offers no cooldown either way.
- **Merchant token TTL/format** — treated as long-lived static token per client behavior; unverified.
- **ehdy.app web experience** — share links assume a gift-viewing site exists; not in this repo.
- **React Compiler behavior** — assumed it compiles this code (mutable-ref patterns like `payingRef`, closures-as-render-functions); no build output inspected. If the compiler bails on these files, the §3 memoization notes upgrade in severity.
- **`npm audit` numbers** are as of today (2026-07-08) against the committed lockfile; dev-chain vs runtime classification is by package role, not a bundle trace.
- **`.env` contents** — still unread (gitignored); assumed to contain only `EXPO_PUBLIC_API_URL` per Phase 1.
- **Whish/OMT** — confirmed cosmetic client-side (`paymentMethod` is never sent in `initiateGiftPayment`, [gift/index.tsx:121-131](app/gift/index.tsx#L121-L131)); whether the backend has any alternate-method plumbing is unknown.
