# Placeholder icon slots

Drop real PNGs here before shipping — `manifest.json` and Bubblewrap/Capacitor
both read from this folder:

- `icon-192.png`, `icon-512.png` — standard icons (square, safe full-bleed artwork)
- `maskable-192.png`, `maskable-512.png` — maskable variants (keep the
  wordmark/logo inside the center ~80% "safe zone"; edges get cropped to a
  circle/squircle on Android)

Until real branding exists, generate a quick placeholder set with:

```
npx pwa-asset-generator ./brand/wordmark-source.svg ./public/icons \
  --background "#0B0D10" --padding "10%" --icon-only
```
