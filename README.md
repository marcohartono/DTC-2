# TurfIQ

Soil-moisture tracker for golf-course greenkeepers. Vite + React + TypeScript, mobile-first.

## Stack

| Layer | Choice |
|---|---|
| Build | Vite 5 |
| UI | React 18 + TypeScript (strict) |
| Styling | Plain CSS with design tokens (`src/styles/styles.css`) |
| State | React Context (`ReadingsContext`) — in-memory for now |
| Data | Seeded mock readings (`src/lib/mockData.ts`) |
| Planned backend | Supabase (auth, `readings` table, realtime, offline outbox) |

## Develop

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # tsc -b && vite build → dist/
npm run preview   # serve the built bundle
npm run typecheck # strict TS check, no emit
```

## Project layout

```
src/
├── main.tsx                # entry
├── App.tsx                 # shell + provider wiring
├── types.ts                # Reading, Course, Hole, Tab, …
├── context/
│   └── ReadingsContext.tsx # readings + addReading
├── lib/
│   ├── mockData.ts         # COURSE + seeded readings
│   ├── moisture.ts         # moistureColor / moistureBand / isCritical
│   └── time.ts             # fmtTime / fmtTimeShort
├── components/
│   ├── icons.tsx
│   ├── TopBar.tsx
│   ├── TabBar.tsx
│   ├── Toast.tsx
│   ├── CourseHeatmap.tsx
│   └── TrendChart.tsx
├── screens/
│   ├── CaptureScreen.tsx
│   ├── AnalysisScreen.tsx
│   └── HistoryScreen.tsx   # placeholder for Phase 2
└── styles/
    └── styles.css
```

The old in-browser-Babel prototype (`app.jsx`, `capture.jsx`, `analysis.jsx`, `data.js`, `ios-frame.jsx`, root `styles.css`) has been replaced by this `src/` tree. The fixed-390×844 iPhone bezel mockup is gone; the layout is now fluid and adapts:

- On phones (`< 600px`): full viewport, sticky top bar, fixed tab bar, respects safe-area insets.
- On desktop (`≥ 600px`): the app is centred in a 440-px-wide phone-shaped column on a dark stage.

## Roadmap

### Phase 0 — Revamp ✅ *done*
- Vite + React 18 + TypeScript scaffold.
- Drop Babel-in-browser and the iOS bezel; ship a responsive phone-first shell.
- Port every existing feature (Capture flow, Heatmap / Trends / Readings modes, toast, mock seed) to typed React components.
- Split helpers (`moistureColor`, `moistureBand`, `fmtTime`) into named exports.
- Centralise reading state in `ReadingsContext`.

### Phase 1 — Production prototype *(next)*
Roughly in the order I'd ship them. Each item maps to a SPEC §4 entry.

1. **Persistence — IndexedDB.** Add `idb` + a `readingsStore` module behind `ReadingsContext`. Hydrate state on mount, write-through on `addReading`. Reading gets `v: 1` for forward-compatible migrations.
2. **Position-aware capture.** Add a 3-way pill (`front` / `middle` / `back`) under the hole picker in `CaptureScreen`. The `Reading` shape already carries `pos`.
3. **Tech identity.** First-run picker that writes `tech` to `localStorage`; replace the hard-coded `'JM'` in `App.tsx` and `CaptureScreen.tsx`.
4. **CSV export.** Wire the existing `⬇ export csv` button in `AnalysisScreen`. Build a `text/csv` blob from the filtered readings, trigger a download named `turfiq_[course]_[range].csv`. Columns: `timestamp_iso, hole, par, value_vwc, phase, position, tech, lat, lon`.
5. **History tab.** Replace `HistoryScreen` stub with a chronological feed (reverse-time), filterable by tech and date range. Tapping a row jumps to that hole in Analysis.
6. **Live GPS.** Swap the simulated `setInterval` for `navigator.geolocation.watchPosition()`. Surface real `accuracy` in the `gps-pill` in `TopBar`. Handle permission denial gracefully.
7. **Error boundary** around `Shell` so a render error doesn't blank the whole frame.

### Phase 2 — Offline-first PWA
8. **Manifest + icons** (`public/manifest.json`, app icons in `public/icons/`).
9. **Service worker** via `vite-plugin-pwa` — precache app shell, navigation fallback.
10. **Outbox pattern.** Captures made while offline are queued in IndexedDB and flushed when the network returns. The CSV-shaped record is the wire format.
11. **Install prompt** on first run (not Safari's Share menu).

### Phase 3 — Supabase backend
12. **Schema.** `courses`, `holes(course_id)`, `users(id, initials)`, `readings(course_id, hole, value, t, phase, pos, tech_id, lat, lon, v)`. RLS so each course is scoped.
13. **Auth.** Supabase magic-link; course picker on sign-in.
14. **Sync.** Append-only readings; last-write-wins is sufficient. Realtime subscribe to `readings` so a second tech's capture appears live.
15. **Push alerts.** Edge function on `readings` insert: if value crosses critical band (`< 12` or `> 26`), push to subscribed devices.

### Phase 4 — Exploratory
16. Bluetooth TDR pairing (Spectrum TDR-350) → auto-fill the VWC value.
17. Multi-course superintendent view.
18. Per-green (or per-region) optimal-band targets.
19. Weather overlay (NWS or paid weather API).
20. Irrigation-plan suggestions: today's heatmap vs. schedule → "skip 12, double 3".

## Deploy to Vercel

`vercel.json` is kept. Vercel auto-detects Vite; the build command is `npm run build` and the output is `dist/`.

```bash
npm i -g vercel
vercel        # link
vercel --prod # ship
```

Or push to a GitHub repo and import it at vercel.com/new — every push redeploys.

## Open on your phone

After deploying, open the URL on your phone:

- **iOS:** Share → Add to Home Screen. Launches full-screen.
- **Android:** Chrome menu → Install app / Add to Home Screen.

Once Phase 2 ships the service worker + manifest, this becomes a real installable PWA.
