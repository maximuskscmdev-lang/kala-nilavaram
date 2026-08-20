# PWA + App Store Packaging Guide

One codebase, one PWA, wrapped twice. Do all real feature work in
`apps/web`; only touch the wrapper projects below for store metadata, icons,
splash screens, and native push config.

## 1. PWA baseline (already wired in this repo)

- `next-pwa` is configured in `apps/web/next.config.js`. It generates a
  service worker at build time (`npm run build`), registers it
  automatically, and caches:
  - Supabase REST responses (`NetworkFirst`, 1 hour)
  - Images (`CacheFirst`, 30 days)
  - Everything under `/whistleblower` and `/api/whistleblower` is
    `NetworkOnly` — **never cached**, so a shared/public device never has a
    locally recoverable copy of someone's complaint.
- `apps/web/public/manifest.json` defines the installable app metadata.
  Replace the icon placeholders in `apps/web/public/icons/` before shipping
  (see the README there).
- Test installability locally: `npm run build && npm run start`, then open
  Chrome DevTools → Application → Manifest, and check "Add to Home Screen"
  works on an Android phone over your LAN IP (PWA install prompts require
  HTTPS, so use `ngrok` or deploy to a Vercel preview URL to test on a real
  phone).

## 2. Android — Bubblewrap (Trusted Web Activity)

Prerequisites: Node 18+, a Java JDK (17+), Android SDK command-line tools
(Bubblewrap can fetch these for you on first run).

```bash
npm install -g @bubblewrap/cli

# From an empty folder outside the web app repo (or a sibling folder):
bubblewrap init --manifest https://kalanilavaram.com/manifest.json
```

Answer the prompts:
- **Application ID**: `com.kalanilavaram.app` (or your registered domain, reversed)
- **App name**: Kala Nilavaram
- **Signing key**: let Bubblewrap generate one on first build; **back up
  `android.keystore` and its password somewhere safe outside git** — losing
  it means you can never update the Play Store listing under the same app.

Build:
```bash
bubblewrap build
```
This produces `app-release-signed.apk` / `.aab`.

**Digital Asset Links (required for the TWA to open without a browser
address bar):** publish
`https://kalanilavaram.com/.well-known/assetlinks.json` with the SHA-256
fingerprint Bubblewrap prints after `bubblewrap build`. Add a static route
for this file under `apps/web/public/.well-known/assetlinks.json`.

**Play Console steps:**
1. Create a Google Play Developer account (one-time **$25 USD** fee).
2. Create an app → Production track → upload the `.aab`.
3. Content rating questionnaire: flag "user-generated content" and
   "user-to-user communication" honestly — the whistleblower inbox and
   reviews both count. Expect a **teen/PEGI-13+-style rating**, not "Everyone."
4. Data Safety form: declare phone number, name, and free-text complaint
   content as collected, encrypted in transit and at rest, and **not**
   shared with third parties (per `docs/policies/privacy-policy.md`).
5. Target audience: since under-18 users are a primary audience, Play's
   "Families" and "target age" policies apply extra scrutiny — do **not**
   opt into the Families program (this app is not primarily *for* children
   under 13, but has substantial 15–18 usage); read Play's "teen-relevant"
   content policy before submitting, since anonymous reporting / UGC
   features specifically get manual review.

## 3. iOS — Capacitor

```bash
cd apps/web
npm install @capacitor/core @capacitor/cli @capacitor/ios
npx cap init "Kala Nilavaram" com.kalanilavaram.app --web-dir=out
```

Since this is a server-rendered Next.js app (not static export), point
Capacitor at the deployed production URL instead of a local web-dir bundle:

```ts
// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'com.kalanilavaram.app',
  appName: 'Kala Nilavaram',
  server: { url: 'https://kalanilavaram.com', cleartext: false },
  ios: { contentInset: 'automatic' }
};
export default config;
```

```bash
npx cap add ios
npx cap open ios   # opens Xcode
```

In Xcode: set app icons + launch screen (use the same source art as the PWA
icons), bundle identifier, and signing team.

**App Store Connect steps:**
1. Apple Developer Program account (**$99/year**).
2. Create the app record, upload a build via Xcode → Product → Archive →
   Distribute App.
3. **App Review gotchas specific to this app:**
   - Apple requires a working **account deletion** flow reachable from
     inside the app (Settings → Delete Account) — build this before
     submitting, not after a rejection.
   - UGC apps (reviews, comments, anonymous reports) must have: a way to
     report/flag content, a way to block abusive users, and published
     content moderation terms — all covered by `docs/policies/`, but the
     *in-app* report/flag button must actually be reachable, not just
     documented.
   - Because most users are minors, expect Apple's **age rating
     questionnaire** to push this to 12+ or 17+ depending on how "unrestricted
     web access" and "user-generated content" are answered — answer
     honestly; a mismatch between declared rating and actual content is a
     common rejection reason.
   - Login: Sign in with Apple is **required** by App Store guidelines
     whenever you offer a third-party login (Google Sign-In) — add
     `@capacitor-community/apple-sign-in` (or a Supabase `apple` OAuth
     provider) before submitting an iOS build with Google login enabled.

## 4. Push notifications (Phase 2)

- **Web push (PWA):** use the `web-push` npm package + VAPID keys, store
  subscriptions in a new `push_subscriptions` table, trigger from Supabase
  Edge Functions on: new article published, complaint status change, weekly
  discussion reminder, new episode/video.
- **Native push:** once wrapped, register for APNs (iOS) / FCM (Android)
  inside the Capacitor/TWA shell and forward device tokens to the same
  backend endpoint that already handles web push.

## 5. Ongoing update flow

Because both wrappers just point at the live web app (TWA) or a remote URL
(Capacitor), **most feature updates need zero store resubmission** — ship to
`apps/web` on Vercel and both apps pick it up on next load. You only need to
resubmit to the stores when: app icon/name/splash changes, native
permissions change (e.g. adding camera access for evidence photo capture),
or the wrapper's own config (`capacitor.config.ts`, TWA manifest) changes.
