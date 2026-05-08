# TurfIQ

Soil-moisture tracker for golf course greenkeepers — a static HTML/JSX prototype that runs entirely in the browser.

## Deploy to Vercel

This is a **pure static site** — no build step, no framework. Vercel will auto-detect it as static and just serve the files.

### Option A — drag & drop (fastest, ~30 seconds)

1. Download this folder as a zip (or clone it).
2. Go to **https://vercel.com/new**.
3. Drag the folder onto the page.
4. Click **Deploy**. Done — you get a `https://turfiq-xxxx.vercel.app` URL.

### Option B — GitHub + Vercel (recommended for iterating)

1. Create a new GitHub repo and push this folder:
   ```bash
   git init
   git add .
   git commit -m "initial"
   git branch -M main
   git remote add origin https://github.com/<you>/turfiq.git
   git push -u origin main
   ```
2. Go to **https://vercel.com/new**, click **Import Git Repository**, pick the repo.
3. Leave all settings as default ("Framework Preset: Other", no build command, output directory `.`).
4. Click **Deploy**. Every `git push` after this auto-deploys.

### Option C — Vercel CLI

```bash
npm i -g vercel
vercel        # first run links the project
vercel --prod # deploy to production
```

## Open it on your phone

Once deployed:

1. Open the Vercel URL on your phone in Safari (iOS) or Chrome (Android).
2. **iOS:** tap Share → **Add to Home Screen**. It launches full-screen with an icon, like a native app.
3. **Android:** Chrome menu → **Install app** / **Add to Home Screen**.

## Local preview

```bash
npx serve .
# or
python3 -m http.server 8000
```

Then visit `http://localhost:3000` (or `:8000`).

## File map

| File | Purpose |
|---|---|
| `index.html` | Entry point — loads React, Babel, and all components |
| `styles.css` | Design tokens + all component styles |
| `data.js` | Mock course data (Cypress Bend) + 7 days of seeded readings |
| `capture.jsx` | Capture screen — TDR slider, hole picker, before/after toggle |
| `analysis.jsx` | Heatmap, per-hole trends, readings table |
| `app.jsx` | App shell, tab nav, toast |
| `ios-frame.jsx` | iPhone bezel mockup wrapper |
| `vercel.json` | Vercel config (cache headers + clean URLs) |

## Next steps for a real MVP

The current build is a high-fidelity prototype with seeded mock data. Before field-testing:

- **Real GPS** — replace the simulated coords with `navigator.geolocation.watchPosition()`.
- **Persistence** — swap the in-memory `READINGS` array for `localStorage` or IndexedDB so refreshes don't wipe data.
- **Offline** — add a `manifest.json` + service worker so it installs as a real PWA and works without signal (greens are often out of range).
- **CSV export** — wire the export button to a real Blob download.
- **Auth + sync** — when you want multi-tech sync, add Supabase or similar.
