# TurfIQ

Soil-moisture tracker for golf-course greenkeepers. Vite + React + TypeScript, mobile-first.

## Stack

| Layer | Choice |
|---|---|
| Build | Vite 5 |
| UI | React 18 + TypeScript (strict) |
| Styling | Plain CSS with design tokens (`src/styles/styles.css`) |
| State | React Context (`ReadingsContext`, `CourseContext`) |
| Data | **Supabase (Postgres) — primary store** with realtime. No local DB. Mock readings loaded on demand from the in-app setup panel. |
| Backend | **Supabase**: Postgres + Row Level Security + realtime; an Edge Function (`analyze-tdr-photo`) calls OpenAI Vision. |
| Maps | **Mapbox GL** + `mapbox-gl-draw` — satellite geofence editor for tracing the green polygons. |
| AI | **OpenAI Vision** (`gpt-4o-mini`) reads TDR screen photos into VWC values. |
| Weather | **Open-Meteo** (hourly pull) + a per-hole linear regression for 7-day VWC forecasts. |

## Develop

```bash
npm install
npm run dev       # https://localhost:5173  (also https://<LAN-IP>:5173)
npm run build     # tsc -b && vite build → dist/
npm run preview   # serve the built bundle
npm run typecheck # strict TS check, no emit
```

The dev/preview server runs over **HTTPS** (self-signed, via `@vitejs/plugin-basic-ssl`) because `navigator.geolocation` only works in a secure context. To test on a phone, open the `Network:` `https://<LAN-IP>:5173` URL it prints (type the `https://` explicitly), accept the certificate warning once, and allow location.

## Project layout

```
src/
├── main.tsx                # entry
├── App.tsx                 # shell + provider wiring
├── types.ts                # Reading, Course, Hole, Tab, …
├── context/
│   ├── ReadingsContext.tsx # readings via Supabase: select + realtime + addReading
│   └── CourseContext.tsx   # loads the course + geofence polygons; saveGeofences()
├── lib/
│   ├── supabase.ts         # Supabase client (VITE_SUPABASE_URL / _ANON_KEY)
│   ├── geofence.ts         # point-in-polygon + detectHole() for GPS hole detection
│   ├── mockData.ts         # COURSE + makeReadings() (demo data, loaded on demand)
│   ├── moisture.ts         # moistureColor / moistureBand / isCritical
│   ├── time.ts             # fmtTime / fmtTimeShort
│   ├── gps.ts              # useGps() — real watchPosition + simulation fallback
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
│   ├── SetupOverlay.tsx    # Mapbox geofence editor + demo-data controls
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

A single Postgres database holds all readings. Schema is applied to the Supabase project via migrations `0001_init` (tables) and `0002_rls_realtime` (open MVP RLS + realtime on `readings`).

**Tables**

- `readings` — `id, course_id, hole, vwc_value, phase, t, lat, lon, tech, photo_url, created_at`
- `courses` — `id, name, city, lat, lon, geojson_holes` (green polygons used for geofencing; `lat`/`lon` drive the weather pull)
- `weather_snapshots` — `course_id, t, is_forecast, temp_f, humidity_pct, precip_mm, wind_mph` (hourly Open-Meteo pulls)
- `vwc_predictions` — `course_id, hole, t_target, predicted_vwc, model_version`
- `users` — Supabase auth users (stretch goal)

**Edge Functions**

- `analyze-tdr-photo` — **shipped.** Accepts a base64 image, calls OpenAI Vision (`gpt-4o-mini`), returns the parsed VWC number. Analyze-only — the photo is not stored.
- `pull-weather` — **shipped.** Hourly cron (`pg_cron` + `pg_net`): fetches Open-Meteo observations + 7-day forecast for the course's lat/lon, upserts `weather_snapshots`.
- `predict-vwc` — **shipped.** Nightly cron: per hole, fits a small linear regression of daily VWC change against weather (temp, precip) and rolls it forward over the 7-day forecast, upserting `vwc_predictions`. Falls back to physical defaults when a hole has too little history. Writes via the service-role key (no extra secret).

**Env vars**

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_MAPBOX_TOKEN=...      # Mapbox public token for the geofence map editor
OPENAI_API_KEY=...         # client .env + set as a Supabase Edge Function secret; never exposed to the browser
```

## Roadmap

### ✅ Shipped
- Vite + React 18 + TypeScript scaffold; real GPS via `watchPosition` with simulation fallback.
- Tech identity picker, CSV export, History tab, error boundary, Heatmap/Trends/Readings analysis.
- **Supabase as source of truth.** All readings in Postgres with a realtime subscription so a second tech's capture appears live (replaced IndexedDB).
- **Photo-first capture.** Snap the TDR screen → `analyze-tdr-photo` Edge Function → OpenAI Vision parses the VWC → user confirms/edits. Manual number/slider stays as a fallback toggle.
- **Geofencing.** GPS is point-in-polygon tested against the course's green polygons to auto-select the hole (suppressed when accuracy is worse than ~10 m); the manual hole strip stays as the override. Polygons are traced in the in-app Mapbox setup panel.
- **Position pill removed.** The `front` / `middle` / `back` input and the `pos` field are gone from the UI, data model, and CSV.
- **Weather + 7-day prediction (§4.5).** Hourly Open-Meteo pull → `weather_snapshots`; a per-hole linear regression predicts VWC for the next 7 days per green, overlaid on the heatmap (Today / +1d / +3d / +7d toggle) and as a dashed extension on the trend chart. "Load demo data" pulls **live** weather and generates readings coherent with that real history, then runs the model against the **live forecast** — only the past readings are synthetic, the prediction is real.

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
