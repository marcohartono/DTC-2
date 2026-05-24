# TurfIQ — Product Specification

**Version:** 0.3 (capture stack on Supabase shipped)
**Status:** §4.1–§4.4 shipped — Supabase store + realtime, photo-first capture (OpenAI Vision), GPS geofencing, position pill removed. Weather + 7-day prediction (§4.5) remaining.
**Last updated:** 2026-05-24
**Source of truth:** `DTC-2` repo on `main`

---

## 1. Product summary

TurfIQ is a soil-moisture tracker built for golf-course greenkeepers — the field technicians and assistant superintendents who walk a course with a TDR (time-domain reflectometry) probe, push it into each green, and record the volumetric water content (VWC %). Today that data lives on clipboards, in spreadsheets, or in the probe's own offline log. TurfIQ replaces that with a phone-first capture flow plus an analysis view that shows the whole course as a heatmap and each green as a trend line.

The current build is a **Vite + React + TypeScript app backed by Supabase** — readings, the course, and its geofence polygons live in Postgres, with a realtime subscription for live multi-device updates. There is no auth yet. The layout is fluid (full viewport on phones, centred 440 px column on desktop). The MVP push — locked at the 2026-05-20 meeting — has shipped Supabase as the primary store, photo-first TDR capture via OpenAI Vision, and GPS-geofenced hole detection; the remaining piece is a 7-day VWC forecast driven by NOAA weather (see §4).

### Primary jobs-to-be-done

- **Capture a reading fast** while standing on the green, with one hand, in sun, possibly wearing gloves.
- **See the whole course at a glance** to decide where to send the irrigation crew next.
- **Track a single green over time** to spot trends (drying out, over-watered, lift after irrigation).
- **Hand off cleanly** to other techs or to a superintendent reviewing the morning's data.

### Non-goals (current scope)

The prototype is not an irrigation controller, not an agronomy advisor, and does not interface with course management systems. There is no user account, no multi-course concept, no audit log.

---

## 2. Target users

The data and UI assume a small, well-known team of two-to-four people working a single course.

| Role | Behaviour the app supports |
|---|---|
| Greenkeeper / field tech | Captures readings (most usage). Identified by 2–4 letter initials chosen at first run via the tech picker. |
| Assistant superintendent | Reviews analysis view, decides where to water. |
| Superintendent | Glances at the heatmap, exports CSV for records. |

The top bar shows the picked tech initials alongside the course name (currently a singleton, `Winnetka Golf Course`). Multi-course support is gated on the stretch auth work in §4.6.

---

## 3. Existing features

This section catalogues what is shipped in the codebase today. Every behaviour listed is wired up in `src/`.

### 3.1 App shell (`src/App.tsx`)

- Three-tab application: **Capture**, **Analysis**, **History** — all wired (History is no longer a stub).
- Sticky top bar with the **TurfIQ** wordmark and contextual meta — a live GPS pill on Capture (real `accuracy` from `watchPosition`) and `{tech} · Winnetka Golf Course · [date] · N READINGS TODAY` on Analysis. The tech badge is tappable to re-open the tech picker.
- A "Reading saved" toast (`✓` glyph, mossy pill, 1.8 s auto-dismiss) confirms each capture.
- Reading state lives in `ReadingsContext` (`src/context/ReadingsContext.tsx`), loaded from Supabase on mount with a realtime subscription so a second device's capture appears live. The course and its geofence polygons load via `CourseContext`.
- Error boundary (`src/components/ErrorBoundary.tsx`) wraps `Shell` so a render error doesn't blank the frame.
- Responsive layout: full viewport on phones; centred 440 px column on desktop. The fixed-390×844 iPhone bezel from the original prototype has been removed.

### 3.2 Capture screen (`src/screens/CaptureScreen.tsx`)

The capture flow is built around the question "What's the moisture on hole N?" rendered as a serif headline.

- **Reading-phase toggle**: a pair of icon buttons for **Before watering** (pre-irrigation) and **After watering** (post-irrigation). Selection is reflected in the meta label.
- **Photo-first VWC capture**: the primary action is a **📷 Photo of TDR** button. It opens the camera (`<input type="file" accept="image/*" capture="environment">`), sends the image to the `analyze-tdr-photo` Edge Function, and pre-fills the VWC field with the number OpenAI Vision reads off the meter. If the read fails, an inline error appears and the field falls back to manual entry.
- **VWC readout**: a giant editable serif number with a `%` unit (range `0–40`), pre-filled by the photo read and editable to confirm/correct. The value snaps to a colour swatch and a moisture band label (Critical dry → Critical wet, see §6.1). An "Adjust manually instead" toggle reveals the 0–40 gradient **slider** for fine manual control.
- **Geofenced hole picker**: a horizontally-scrolling strip of 18 numbered buttons (the selected hole shows its par/yardage, e.g. `Par 4 · 412y`). When the live GPS fix sits inside a green's polygon (and accuracy ≤ ~10 m), the hole auto-selects and a `Detected · hole N` pill appears; a manual tap always overrides. When no polygons are defined yet, a "set up hole map" link opens the setup panel (§3.7).
- **Real GPS**: `useGps()` in `src/lib/gps.ts` calls `navigator.geolocation.watchPosition` with `enableHighAccuracy: true`; falls back to simulated jitter if permission is denied or the API is unavailable. The auto-stamp footer reads `{Live|Sim} · 42.1083°N 87.7305°W · ±{acc}m · HH:MM`.
- **Submit button**: "Submit reading →" — disabled until value > 0 and a hole is selected. On submit it inserts the reading into Supabase (prepending the returned row to state), fires the toast, and clears the value; a failed write raises a loud error toast.
- **Last-reading caption**: under the CTA, "Last: hole N · X.X% · Y ago" using a relative-time formatter.

The tech identifier is sourced from the tech picker (`src/components/TechPicker.tsx`), persisted in localStorage via `src/lib/storage.ts`. First-run flow prompts the user for 2–4 letter initials.

### 3.3 Analysis screen (`src/screens/AnalysisScreen.tsx`)

A page header with `Winnetka Golf Course · Evanston, IL` and a serif "Field analysis" title sits above a 24h / 7d / 30d range picker and a working `⬇ export csv` button (downloads `turfiq_[course]_[range]_[date].csv` via `src/lib/csv.ts`). A three-way mode toggle switches between Heatmap, Trends, and Readings.

**Heatmap mode** is the default and the centerpiece:

- A custom SVG course routing for Winnetka Golf Course renders all 18 holes in a loose 18-stop loop on a 360×460 canvas. Each green is a circle; each tee is a small square; thin lines connect tee → green (fairways) and green → next tee (player path).
- Each green's fill colour is the **average VWC over the selected range**, mapped through `moistureColor()`. Greens with no readings in range render as a muted bone outline.
- Tapping a green selects it: a soft white halo appears and the VWC label floats above the circle.
- Critical greens (avg < 12% or > 26%) get an animated pulsing ring drawn around them to flag attention.
- A compass rose (north arrow with a terracotta tip) and a WGC clubhouse marker decorate the map corners. A faint turf-grid background pattern fills the rest.
- A linear-gradient legend underneath labels `4%` → `34%`.

**Hole detail card** (always visible under the heatmap):

- Header with hole metadata (`Hole 7 · Par 4 · 402y`), serif "Green N" title, and a "Last captured · Xh ago" pill.
- Right-side stat: average VWC for the period as a 32 px serif number, plus a delta (↑/↓ with magnitude in points) comparing the latest reading to the first in range.
- A 130 px trend chart (custom SVG, no library):
  - X-axis: time (24h, 7d, or 30d), ticks labelled with weekday abbreviations.
  - Y-axis: VWC, with grid lines at 10, 17, 25 %.
  - A green-tinted "optimal" band shaded between 14–22 %.
  - Points coloured by their own VWC. **Before** readings are circles, **after** readings are 45°-rotated diamond squares. The most recent point gets an emphasis ring.
  - Legend chips for "Before water" (moss dot) and "After water" (info diamond).
- Three-up stat row: **Avg before**, **Avg after**, **Lift** (delta between the two), with the lift shown as `+X.X pts`.

**Trends mode**: a vertical scroll of every hole as its own detail card with mini-trend chart. Critical holes are tagged `⚠ ATTN`. Tapping a card jumps back to Heatmap with that hole selected.

**Readings mode**: a horizontal hole-strip selector at the top (each button gets a colour dot matching its average), then up to 8 rows showing timestamp + relative time, phase pill (`● before` / `◆ after`), lat/lon, tech initials, and the VWC value with a thin colour swatch.

### 3.4 History screen (`src/screens/HistoryScreen.tsx`)

A chronological reverse-time feed of every reading. Filterable by tech (All / Me / individual techs) and by range (24h / 7d / 30d). Each row shows `#{hole}`, timestamp + relative time, phase pill (`● before` / `◆ after`), tech, and VWC with a colour swatch. Tapping a row jumps to that hole in Analysis. Empty state ("No readings in range") when filters yield nothing. Same CSV export button as Analysis, with the active tech filter applied.

### 3.5 Persistence (`src/lib/supabase.ts`, `src/context/ReadingsContext.tsx`)

Readings live in Supabase Postgres (table `readings`, see §5). On mount `ReadingsContext` issues a `select` for the current course's readings and opens a realtime `INSERT` subscription (deduped by row `id`) so a second tech's capture appears live. `addReading` inserts a row and prepends the returned record; a failed write raises an error toast rather than failing silently. The legacy IndexedDB layer (`src/lib/db.ts`, `idb`) has been **removed**.

### 3.6 Mock data engine (`src/lib/mockData.ts`)

A deterministic-ish seed function generates `7 days × 18 holes × ~3 readings/day` of realistic VWC values:

- Each hole gets a "personality" — baseline (14–22 %), per-day drift, and noise.
- Three holes are overridden to surface interesting visualisation states: **hole 3** runs dry (baseline 9.5 %, falling), **hole 7** runs saturated (baseline 27 %, rising), **hole 14** is trending dry.
- Each hole has a 65 % daily probability of being watered, which adds an `'after'` reading 30–60 minutes after the last `'before'` reading at a +5 to +9 point lift.
- Readings carry: `hole`, `value`, `t` (ms), `phase` (`before|after`), `tech` (`JM|AR|CH`), `lat`, `lon`. They are inserted into Supabase on demand via the setup panel's "Load demo data" (§3.7), not auto-seeded.

Three helpers are exposed on `window`:
- `moistureColor(v)` — 7-stop colour scale from terracotta (dry) through olive/moss (optimal) to teal/navy (wet).
- `moistureBand(v)` — named band + `dry|opt|wet` CSS class.
- `fmtTime(ts)` and `fmtTimeShort(ts)` — relative ("3h ago") and short absolute ("May 14 · 7:42 AM") timestamps.

### 3.7 Course setup & geofencing (`src/components/SetupOverlay.tsx`)

A full-screen setup panel, opened from the ⚙ button in the top bar, holds two tools:

- **Geofence editor** — a Mapbox satellite map (`mapbox-gl` + `mapbox-gl-draw`) that opens on the greenkeeper's live GPS position (Mapbox `GeolocateControl` plus a `useGps`-driven recenter; the Winnetka Golf Club centre is the pre-fix fallback). Pick a hole, trace its green as a polygon, and save — the polygons are written to `courses.geojson_holes` as a GeoJSON `FeatureCollection` (one Polygon per hole, tagged with its number) and drive the capture-screen auto-detect (§3.2). Holes with a saved polygon are marked on the strip.
- **Demo data** — "Load demo data" bulk-inserts the generated mock dataset (§3.6) so Analysis/History are populated for a demo; "Clear all readings" empties the table. The database otherwise starts empty.

The geofence editor is code-split (lazy-loaded), so Mapbox is fetched only when the panel opens. Note `navigator.geolocation` requires a secure context, so the dev server runs over HTTPS (see README).

### 3.8 Hosting & deploy

- Vite-built static site shipped to Vercel. Build command `npm run build`, output `dist/`.
- `vercel.json` provides cache headers and clean URLs.
- README documents Vercel deploy (CLI or GitHub-connected) and "Add to Home Screen" usage on iOS/Android.

---

## 4. Intended features (MVP scope)

The team meeting on 2026-05-20 locked the following items as the MVP scope to get past the demo. Each ships incrementally; the order roughly mirrors dependency (Supabase first, since geofencing/photos/weather all write to it).

**Status (2026-05-24):** §4.1–§4.4 are shipped (see §3). Notable as-built deviations: photo capture is **analyze-only** — the image is sent to the Edge Function as base64 and is *not* stored, so `photo_url` stays null and the `tdr-photos` Storage bucket below was dropped; geofence polygons are traced in-app via a Mapbox editor (§3.7); MVP RLS is intentionally open pending auth (§4.6); demo data loads on demand rather than auto-seeding. §4.5 (weather + prediction) is the remaining MVP item; §4.6 (auth) stays a stretch.

### 4.1 Supabase as primary store (replaces IndexedDB)

- All reads and writes go to Supabase Postgres. The IndexedDB layer in `src/lib/db.ts` is **removed**, not augmented.
- Schema migrations live in `supabase/migrations/`. See §5 for table shapes.
- `ReadingsContext` switches to `@supabase/supabase-js` client. On mount it issues a `select` for the current course's readings; it then subscribes to the `readings` table for live multi-device updates.
- Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- No offline outbox in MVP. If a write fails because the device is offline, the UI surfaces an error toast and the tech retries. (Outbox / offline-first is a future revisit; see Roadmap stretch.)

### 4.2 Geofencing for automatic hole detection

- Each course has a `geojson_holes` column containing a `FeatureCollection` of 18 green polygons (traced once at course onboarding).
- On the Capture screen, the user's lat/lon is point-in-polygon tested against the polygons every GPS tick.
- If a match is found, the hole picker auto-selects that hole and shows a `Detected · hole N` pill above the strip.
- If GPS accuracy is worse than ~10 m or no polygon contains the point, the auto-select is suppressed and the manual hole picker remains the source of truth.
- The horizontal hole strip stays in the UI — geofencing only changes the default selection, never locks it.

### 4.3 Photo-first TDR capture

- The Capture screen's primary action becomes a large `📷 Photo of TDR` button above the VWC readout.
- A toggle (`Type manually instead`) reveals the existing slider + number input as a fallback.
- Photo flow:
  1. User taps the button → `<input type="file" accept="image/*" capture="environment">` opens the camera.
  2. Image uploads to Supabase Storage bucket `tdr-photos` (path `{course_id}/{reading_id}.jpg`).
  3. Frontend calls Edge Function `analyze-tdr-photo` with the storage path.
  4. Edge Function calls OpenAI Vision (`gpt-4o-mini` is enough; cost is well under a cent per call) with a prompt like *"Extract the VWC percentage shown on this TDR-350 screen. Reply with just a number, no units."*
  5. Returned number pre-fills the VWC field; the user confirms or edits before tapping Submit.
  6. On submit, the reading row is written with `photo_url` set to the storage path.
- The OpenAI key lives only in the Edge Function's secret store. The client never sees it.

### 4.4 Remove the position pill

The `front` / `middle` / `back` selector adds no decision value in the field. Cut it:

- Delete `src/components/PositionPill.tsx`.
- Remove the `pos: Position` field from `Reading` in `src/types.ts`.
- Remove the `pos` state and JSX from `src/screens/CaptureScreen.tsx`.
- Remove the `pos` cell from the Readings table in `src/screens/AnalysisScreen.tsx` and from the row template in `src/screens/HistoryScreen.tsx`.
- Drop `position` from the CSV header in `src/lib/csv.ts`.
- Do **not** include a `pos` column in the Supabase `readings` migration.

### 4.5 Weather + 7-day VWC prediction

- **Edge Function `pull-weather`** — runs hourly via Supabase cron. For each course, fetches NOAA's hourly observation + 7-day forecast for the course's lat/lon. Writes one row to `weather_snapshots` per pull.
- **Edge Function `predict-vwc`** — runs nightly. Per hole:
  - Pulls the last 30 days of `readings`.
  - Pulls the next 7 days of NOAA forecast (`weather_snapshots` rows with `t > now()`).
  - Fits a small regression (start with linear; features: recent avg VWC, days since last `after` reading, forecast precip, forecast temp).
  - Writes 7 rows into `vwc_predictions` (`t_target` = now + 1d, +2d, …, +7d).
- **Frontend overlay:**
  - Heatmap gains a `Forecast` toggle: `Today` (current data), `+1d`, `+3d`, `+7d`. Switching the toggle re-colours each green from the matching `vwc_predictions` row instead of measured averages.
  - Trend chart adds a dashed extension after the latest measured point, plotting the 7 predicted values for that hole.

### 4.6 Authentication (stretch)

Slated for the end of the MVP push if time allows. Out of scope for the v1 demo cut.

- Supabase magic-link auth.
- The local tech picker is replaced by the authenticated user's stored initials.
- Row Level Security policies scope `readings` to the user's course memberships.
- A `memberships` join table lets one user belong to multiple courses; a course picker appears on sign-in if `count(memberships) > 1`.

---

## 5. Data model (Supabase schema)

The MVP backend is a single Postgres database. Schema migrations live in `supabase/migrations/`.

### `readings`

| column        | type          | notes                                              |
| ------------- | ------------- | -------------------------------------------------- |
| `id`          | `uuid`        | pk, default `gen_random_uuid()`                    |
| `course_id`   | `uuid`        | fk → `courses.id`                                  |
| `hole`        | `int`         | 1..18                                              |
| `vwc_value`   | `numeric`     | 0..40 (%), rounded to 1 decimal                    |
| `phase`       | `text`        | `'before'` \| `'after'`                            |
| `t`           | `timestamptz` | reading timestamp                                  |
| `lat`         | `numeric`     | decimal degrees                                    |
| `lon`         | `numeric`     | decimal degrees                                    |
| `tech`        | `text`        | initials; becomes fk → `users.id` once auth ships  |
| `photo_url`   | `text`        | nullable; Supabase Storage path for the TDR photo  |
| `created_at`  | `timestamptz` | default `now()`                                    |

**Removed from the prior model:** `pos` (front/middle/back) — feature cut per §4.4.

### `courses`

| column          | type    | notes                                                          |
| --------------- | ------- | -------------------------------------------------------------- |
| `id`            | `uuid`  | pk                                                             |
| `name`          | `text`  | "Winnetka Golf Course"                                                 |
| `city`          | `text`  | "Evanston, IL"                                        |
| `geojson_holes` | `jsonb` | `FeatureCollection` of 18 green polygons; used for geofencing  |

### `weather_snapshots`

| column          | type          | notes                          |
| --------------- | ------------- | ------------------------------ |
| `id`            | `uuid`        | pk                             |
| `course_id`     | `uuid`        | fk → `courses.id`              |
| `t`             | `timestamptz` | snapshot or forecast time      |
| `is_forecast`   | `boolean`     | `false` = observed, `true` = NOAA forecast row |
| `temp_f`        | `numeric`     |                                |
| `humidity_pct`  | `numeric`     |                                |
| `precip_mm`     | `numeric`     | last-hour for observed, hourly for forecast |
| `wind_mph`      | `numeric`     |                                |

### `vwc_predictions`

| column          | type          | notes                                  |
| --------------- | ------------- | -------------------------------------- |
| `id`            | `uuid`        | pk                                     |
| `course_id`     | `uuid`        | fk                                     |
| `hole`          | `int`         | 1..18                                  |
| `t_target`      | `timestamptz` | predicted-for time (1–7 days out)      |
| `predicted_vwc` | `numeric`     |                                        |
| `model_version` | `text`        | bookkeeping for retraining (`'linreg-v1'`, …) |
| `generated_at`  | `timestamptz` | default `now()`                        |

### `users` (stretch — see §4.6)

Supabase auth's built-in `auth.users` plus a `profiles` table with `initials`, `display_name`, and a `memberships` join table to courses. Not in the MVP cut.

---

## 6. Design system

### 6.1 Colour

Defined as CSS custom properties in `styles.css`:

- **Surfaces** — `--paper #faf6ec`, `--bone #f3ede0`, `--bone-2`, `--bone-3` for cards and dividers.
- **Brand greens** — `--moss #1a2a1f` for primary CTAs and selected states, `--moss-2`, `--moss-3` for press / muted accents.
- **Ink** — `--ink #131a14` for body text, `--ink-2` for secondary, `--muted #8a8773` for meta.
- **Moisture scale** — seven stops keyed to VWC bands:
  - `< 10 %` Critical dry → `--dry-1` terracotta
  - `10–14 %` Dry → `--dry-2` orange-tan
  - `14–17 %` Optimal–low → `--opt-1` ochre
  - `17–22 %` Optimal → `--opt-2` olive
  - `22–25 %` Optimal–high → `--opt-3` deep moss
  - `25–28 %` Saturated → `--wet-1` teal
  - `> 28 %` Critical wet → `--wet-2` navy
- **Accents** — `--accent / --warn #c2632d` terracotta, `--good #4a7a3a`, `--info #2e6e7a`.

### 6.2 Typography

- **Serif** — Instrument Serif (display, big numbers, hero headlines). Italic variant is used for the secondary clause in titles ("Field *analysis*", "Green *7*").
- **Sans** — Geist (UI body, buttons, labels).
- **Mono** — Geist Mono (meta, eyebrows, status pills, axis labels). Letter-spacing of 0.04–0.14 em and uppercase are the dominant treatment.

The combination — editorial serif headlines, mono operational metadata, soft paper background — gives the app a "field notebook" feel that distinguishes it from the typical SaaS dashboard.

### 6.3 Motion

- 1.6 s opacity / scale pulse on the GPS dot, the "Live" indicator, and the auto-stamp dot.
- 0.06–0.2 s ease transitions on press states (`:active` shrinks to 0.95–0.98).
- Toast slides up 20 px and fades in over 0.2–0.3 s on capture.
- Critical-hole rings on the heatmap pulse `r: 11 → 18 → 11` over 2.4 s, indefinitely.

### 6.4 Layout primitives

- Phone container is hard-locked to 390×844 (iPhone 14/15 portrait). The app shell uses absolute-positioned tab bar, sticky top bar, scrollable middle screen.
- 22 px horizontal page padding on Capture, 20 px on Analysis.
- Card radius defaults to 12 px (small) or 14–18 px (large surfaces); pills are 999 px.

---

## 7. Architecture & technical notes

| Path | Role |
|---|---|
| `src/main.tsx`, `src/App.tsx` | Entry + shell. Wires `ReadingsContext`, `ErrorBoundary`, top bar, tab bar, toast. |
| `src/types.ts` | `Reading`, `Course`, `Hole`, `Tab`, `Phase`. (`Position`/`pos` removed per §4.4.) |
| `src/context/ReadingsContext.tsx` | Readings state via the Supabase client: initial `select` + realtime subscription + `addReading` insert + demo load/clear. |
| `src/context/CourseContext.tsx` | Loads the course row + geofence polygons; `saveGeofences()`. |
| `src/lib/supabase.ts` | Supabase client singleton (`VITE_SUPABASE_URL` / `_ANON_KEY`). |
| `src/lib/geofence.ts` | GeoJSON types + point-in-polygon `detectHole()` for GPS hole detection. |
| `src/components/SetupOverlay.tsx` | Mapbox geofence editor + demo-data load/clear controls. |
| `src/lib/gps.ts` | `useGps()` — real `watchPosition` with simulation fallback. |
| `src/lib/csv.ts` | `readingsToCsv`, `downloadCsv`, `csvFilename`. |
| `src/lib/storage.ts` | localStorage helpers for tech id. |
| `src/lib/mockData.ts` | Course definition + seeded readings (dev seeding only). |
| `src/lib/moisture.ts` | `moistureColor`, `moistureBand`, `isCritical`. |
| `src/screens/CaptureScreen.tsx` | Capture flow. |
| `src/screens/AnalysisScreen.tsx` | Heatmap / Trends / Readings. |
| `src/screens/HistoryScreen.tsx` | Chronological feed. |
| `src/components/*` | TopBar, TabBar, Toast, CourseHeatmap, TrendChart, TechPicker, SetupOverlay, ErrorBoundary, icons. |
| `src/styles/styles.css` | All design tokens and component CSS. ~1225 lines. No CSS modules / Tailwind. |
| `vite.config.ts`, `tsconfig*.json` | Build + strict TS. |
| `vercel.json` | Cache headers + clean URLs for the static deploy. |
| Supabase migrations | `0001_init` (tables) + `0002_rls_realtime` applied to the project (managed via MCP/dashboard; no local `supabase/` dir). |
| Edge Functions | `analyze-tdr-photo` deployed (analyze-only); `pull-weather` / `predict-vwc` planned (§4.5). |

**Runtime characteristics**

- Vite + strict TypeScript. No Babel-in-browser. `npm run build` runs `tsc -b && vite build`.
- React 18; `@supabase/supabase-js` for data + realtime, `mapbox-gl` + `@mapbox/mapbox-gl-draw` for the geofence editor (code-split). No state-management library; `ReadingsContext` + `CourseContext` are the stores.
- Layout is fluid: full viewport on phones, centred 440 px column on desktop. No fixed iPhone frame.

**Risks to address during the MVP push**

1. **Network dependence** — with Supabase as the only store, a green that's out of cell range has no fallback. An offline outbox is a stretch follow-up; in the meantime the UI surfaces failed writes loudly (error toast on a failed insert).
2. **Photo PII** — TDR photos may incidentally capture turf/shoes/people. Capture is analyze-only — the image is sent to the Edge Function and never stored — which keeps this footprint minimal.
3. **NOAA reliability** — outages or rate limits will leave forecasts stale. The `predict-vwc` job should degrade gracefully (skip prediction, not error).
4. **Font CDN (Google Fonts)** is still a runtime dependency and a privacy footprint.

---

## 8. Roadmap

Canonical roadmap lives in [README.md → Roadmap](./README.md#roadmap). Summary:

- **✅ Shipped** — Vite/React/TS scaffold, real GPS, tech picker, CSV export, History tab, error boundary, Heatmap/Trends/Readings analysis; **Supabase as source of truth (§4.1)**, **geofencing (§4.2)**, **photo-first capture via OpenAI Vision (§4.3)**, and **removal of the position pill (§4.4)**.
- **🎯 MVP remaining** — weather + 7-day VWC prediction (§4.5).
- **🌱 Stretch** — magic-link auth (§4.6), TDR Bluetooth pairing, multi-course view, irrigation-plan suggestions, offline outbox.

---

## 9. Open questions

### Resolved at the 2026-05-20 meeting

- ~~**Course onboarding.**~~ Resolved: each course stores a `geojson_holes` `FeatureCollection`, traced once at onboarding from satellite imagery. The same polygons drive geofencing (§4.2).
- ~~**Multiple probes per green.**~~ Out of scope for MVP — one reading per submit. Revisit if field testers ask for it.
- ~~**Permission model.**~~ Punted to the auth stretch goal (§4.6). MVP assumes a single shared course where every tech sees every reading.

### Still open

- **Optimal band per course.** The hard-coded 14–22 % range is generic USGA. Superintendents will eventually want per-green targets (bermudagrass on a desert course vs. poa annua on temperate links). Acceptable to ship MVP with the global range.
- **Pricing / packaging.** Free for a single tech, paid for a team? Per-course license? Will shape the auth design when it lands.

### New from the meeting

- **Weather API tier.** Start with NOAA free, or stand up Open-Meteo as a backup? NOAA's rate limits may bite at hourly cadence across multiple courses.
- **Prediction model class.** Start with linear regression — it's enough to ship and easy to explain. Move to gradient-boosted (xgboost) once we have >2 weeks of real reading data per course.
- **Photo retention.** How long do TDR photos stick around in Storage — forever, 90 days, until the next reading on the same hole? Affects privacy disclosure copy.

---

*Updated 2026-05-24: §4.1–§4.4 shipped (Supabase primary store + realtime, photo-first capture via OpenAI Vision, GPS-geofenced hole detection, position pill removed); §3 and §7 describe the current build. Remaining MVP work: weather + 7-day VWC prediction (§4.5).*
