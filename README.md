# TurfIQ

Soil-moisture tracker for golf-course greenkeepers. Vite + React + TypeScript, mobile-first.

## Stack

| Layer | Choice |
|---|---|
| Build | Vite 5 |
| UI | React 18 + TypeScript (strict) |
| Styling | Plain CSS with design tokens (`src/styles/styles.css`) |
| State | React Context (`ReadingsContext`) |
| Data | **Supabase (Postgres) — primary store.** No local DB. Mock readings used only when offline-dev seeding is enabled. |
| Backend | **Supabase**: Postgres, Row Level Security, Storage (TDR photos), Edge Functions for the weather/prediction job. |
| AI | **OpenAI Vision** (`gpt-4o-mini`) reads TDR screen photos into VWC values. |
| Weather | **NOAA API** for current conditions + a lightweight regression model for 7-day VWC forecasts. |

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
│   └── ReadingsContext.tsx # readings + addReading, hydrates from IndexedDB
├── lib/
│   ├── mockData.ts         # COURSE + seeded readings (dev only)
│   ├── moisture.ts         # moistureColor / moistureBand / isCritical
│   ├── time.ts             # fmtTime / fmtTimeShort
│   ├── gps.ts              # useGps() — real watchPosition + simulation fallback
│   ├── db.ts               # IndexedDB store (slated for removal — see Roadmap)
│   ├── csv.ts              # readingsToCsv, downloadCsv
│   └── storage.ts          # localStorage tech-id helpers
├── components/
│   ├── icons.tsx
│   ├── TopBar.tsx
│   ├── TabBar.tsx
│   ├── Toast.tsx
│   ├── CourseHeatmap.tsx
│   ├── TrendChart.tsx
│   ├── TechPicker.tsx
│   ├── PositionPill.tsx    # scheduled for removal (see Roadmap)
│   └── ErrorBoundary.tsx
├── screens/
│   ├── CaptureScreen.tsx
│   ├── AnalysisScreen.tsx
│   └── HistoryScreen.tsx
└── styles/
    └── styles.css
```

The old in-browser-Babel prototype (`app.jsx`, `capture.jsx`, `analysis.jsx`, `data.js`, `ios-frame.jsx`, root `styles.css`) has been replaced by this `src/` tree. The fixed-390×844 iPhone bezel mockup is gone; the layout is now fluid and adapts:

- On phones (`< 600px`): full viewport, sticky top bar, fixed tab bar, respects safe-area insets.
- On desktop (`≥ 600px`): the app is centred in a 440-px-wide phone-shaped column on a dark stage.

## Backend (Supabase)

A single Postgres database holds all readings. Schema lives in `supabase/migrations/` (to be added).

**Tables**

- `readings` — `id, course_id, hole, vwc_value, phase, t, lat, lon, tech, photo_url, created_at`
- `courses` — `id, name, city, geojson_holes` (green polygons used for geofencing)
- `weather_snapshots` — `course_id, t, temp_f, humidity_pct, precip_mm, wind_mph` (hourly NOAA pulls)
- `vwc_predictions` — `course_id, hole, t_target, predicted_vwc, model_version`
- `users` — Supabase auth users (stretch goal)

**Edge Functions**

- `analyze-tdr-photo` — accepts an image upload, calls OpenAI Vision, returns the parsed VWC number.
- `pull-weather` — hourly cron, fetches NOAA conditions for the course's lat/lon, writes `weather_snapshots`.
- `predict-vwc` — nightly job, fits a lightweight regression on recent readings + forecast weather, writes 7 days of predictions per hole.

**Env vars**

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
OPENAI_API_KEY=...        # only read by the Edge Function, not the client
```

## Roadmap

### ✅ Shipped (prototype baseline)
- Vite + React 18 + TypeScript scaffold.
- Real GPS via `navigator.geolocation.watchPosition` with simulation fallback (`src/lib/gps.ts`).
- IndexedDB persistence (`src/lib/db.ts`) — **will be removed when Supabase lands.**
- Tech identity picker, persisted in localStorage (`src/components/TechPicker.tsx`, `src/lib/storage.ts`).
- CSV export from Analysis and History screens (`src/lib/csv.ts`).
- History tab — reverse-time, tech-filterable feed (`src/screens/HistoryScreen.tsx`).
- Error boundary around the shell (`src/components/ErrorBoundary.tsx`).
- Heatmap, Trends, Readings analysis modes (`src/screens/AnalysisScreen.tsx`).

### 🎯 MVP — getting past the demo

1. **Supabase as source of truth.** Drop IndexedDB, move all readings to Postgres. Realtime subscriptions so a second tech's capture appears live.
2. **Geofencing.** Auto-resolve the current hole from GPS coordinates and the course's hole polygons. Manual hole picker stays as the fallback when GPS accuracy is poor (worse than ~10 m).
3. **Photo-first capture.** Primary entry path: snap a photo of the TDR screen → OpenAI Vision parses the VWC number → user confirms or edits. Manual numeric entry stays as a fallback toggle.
4. **Remove position pill.** The `front` / `middle` / `back` input is cut from the Capture screen and the `pos` field is dropped from the data model.
5. **Weather + 7-day prediction.** Hourly NOAA pull. A lightweight regression model predicts VWC for the next 7 days per green; overlay on heatmap and trends.

### 🌱 Stretch
- **Authentication** — Supabase magic-link, multi-user accounts, per-account readings.
- TDR Bluetooth pairing (Spectrum TDR-350) to auto-fill VWC.
- Multi-course superintendent view.
- Irrigation-plan suggestions driven off the prediction model.

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

A future pass will add a service worker + manifest to make this a real installable PWA — not on the MVP punch-list yet.
