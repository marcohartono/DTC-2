# TurfIQ — Product Specification

**Version:** 0.1 (prototype audit)
**Status:** High-fidelity prototype with seeded mock data
**Last updated:** 2026-05-15
**Source of truth:** `/Users/marcohartono/DTC-2` (commit on `main`)

---

## 1. Product summary

TurfIQ is a soil-moisture tracker built for golf-course greenkeepers — the field technicians and assistant superintendents who walk a course with a TDR (time-domain reflectometry) probe, push it into each green, and record the volumetric water content (VWC %). Today that data lives on clipboards, in spreadsheets, or in the probe's own offline log. TurfIQ replaces that with a phone-first capture flow plus an analysis view that shows the whole course as a heatmap and each green as a trend line.

The current build is a **client-only static prototype** — no server, no auth, no database. It renders as a fixed 390×844 iPhone mockup in a dark stage frame (`index.html`) and uses React + Babel loaded from a CDN with mock data seeded in JavaScript. The README explicitly positions it as "a high-fidelity prototype" and lists the work needed before field testing.

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
| Greenkeeper / field tech | Captures readings (most usage). Identified by 2-letter initials — seeded as `JM`, `AR`, `CH`. |
| Assistant superintendent | Reviews analysis view, decides where to water. |
| Superintendent | Glances at the heatmap, exports CSV for records (intended). |

The top bar hard-codes `JM · Cypress Bend` as the operator in the Analysis view, which is fine for a one-course demo but is the first thing that has to become dynamic.

---

## 3. Existing features

This section catalogues what works in the prototype today. Every behaviour listed has been verified against the source.

### 3.1 App shell (`app.jsx`)

- Two-tab application wrapped in a simulated iPhone bezel (`ios-frame.jsx`, `IOSDevice` 390×844).
- Sticky top bar with the **TurfIQ** wordmark and contextual meta — a pulsing `GPS · LOCKED · ±2.4m` pill on the Capture tab, and `JM · Cypress Bend · [date] · N READINGS TODAY` on Analysis.
- Bottom tab bar with three buttons: **Capture**, **Analysis**, **History**. The History button currently routes to the Analysis screen — it is a stub.
- A "Reading saved" toast (`✓` glyph, mossy pill, 1.8 s auto-dismiss) confirms each capture.
- All state lives in React `useState` on the `App` component. Refreshing the page wipes any newly captured readings.

### 3.2 Capture screen (`capture.jsx`)

The capture flow is built around the question "What's the moisture on hole N?" rendered as a serif headline.

- **Reading-phase toggle**: a pair of icon buttons for **Before watering** (pre-irrigation) and **After watering** (post-irrigation). Selection is reflected in the meta label.
- **Hole picker**: a horizontally-scrolling strip of 18 numbered buttons. The selected hole shows its par and yardage in the section meta (`Par 4 · 412y`).
- **VWC readout**: a giant editable serif number with a `%` unit. Range `0–40` enforced on input. The current value snaps to a colour swatch and a moisture band label (Critical dry → Critical wet, see §6.1).
- **Slider**: a 0–40 range slider with a gradient track matching the moisture scale. The thumb is a paper-coloured pill with a moss border; the slider and the typed number are bound to the same `value`.
- **Auto stamp**: a small mono-font footer reads `Auto · 36.5547°N 121.9230°W · HH:MM` and refreshes the clock every second.
- **GPS simulation**: `useEffect` updates lat/lon every 1.5 s with sub-metre jitter, and accuracy floats in a 1.8–3.2 m range. The `±2.4m` figure in the top bar is decorative.
- **Submit button**: "Submit reading →" — disabled until value > 0 and a hole is selected. On submit it prepends a reading to the in-memory array, fires the toast, and resets the value to 18.0.
- **Last-reading caption**: under the CTA, "Last: hole N · X.X% · Y ago" using a relative-time formatter.

The tech identifier is hard-coded to `'JM'` and `pos` to `'middle'` on every capture — the data model supports `front | middle | back` but the UI does not collect position in this screen.

### 3.3 Analysis screen (`analysis.jsx`)

A page header with `Cypress Bend · Carmel-by-the-Sea, CA` and a serif "Field analysis" title sits above a 24h / 7d / 30d range picker and a (non-functional) `⬇ export csv` button. A three-way mode toggle switches between Heatmap, Trends, and Readings.

**Heatmap mode** is the default and the centerpiece:

- A custom SVG course routing for Cypress Bend renders all 18 holes in a loose 18-stop loop on a 360×460 canvas. Each green is a circle; each tee is a small square; thin lines connect tee → green (fairways) and green → next tee (player path).
- Each green's fill colour is the **average VWC over the selected range**, mapped through `moistureColor()`. Greens with no readings in range render as a muted bone outline.
- Tapping a green selects it: a soft white halo appears and the VWC label floats above the circle.
- Critical greens (avg < 12% or > 26%) get an animated pulsing ring drawn around them to flag attention.
- A compass rose (north arrow with a terracotta tip) and a CLBHS clubhouse marker decorate the map corners. A faint turf-grid background pattern fills the rest.
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

**Readings mode**: a horizontal hole-strip selector at the top (each button gets a colour dot matching its average), then up to 8 rows showing timestamp + relative time, phase pill (`● before` / `◆ after`), lat/lon, position, tech initials, and the VWC value with a thin colour swatch.

### 3.4 Mock data engine (`data.js`)

A deterministic-ish seed function generates `7 days × 18 holes × ~3 readings/day` of realistic VWC values:

- Each hole gets a "personality" — baseline (14–22 %), per-day drift, and noise.
- Three holes are overridden to surface interesting visualisation states: **hole 3** runs dry (baseline 9.5 %, falling), **hole 7** runs saturated (baseline 27 %, rising), **hole 14** is trending dry.
- Each hole has a 65 % daily probability of being watered, which adds an `'after'` reading 30–60 minutes after the last `'before'` reading at a +5 to +9 point lift.
- Readings carry: `hole`, `value`, `t` (ms), `phase` (`before|after`), `pos` (`front|middle|back`), `tech` (`JM|AR|CH`), `lat`, `lon`.

Three helpers are exposed on `window`:
- `moistureColor(v)` — 7-stop colour scale from terracotta (dry) through olive/moss (optimal) to teal/navy (wet).
- `moistureBand(v)` — named band + `dry|opt|wet` CSS class.
- `fmtTime(ts)` and `fmtTimeShort(ts)` — relative ("3h ago") and short absolute ("May 14 · 7:42 AM") timestamps.

### 3.5 iOS device frame (`ios-frame.jsx`)

A self-contained iOS 26 "Liquid Glass" mockup library: the `IOSDevice` bezel, dynamic island, status bar, glass nav pills, grouped list rows, and a full QWERTY keyboard with blurred backdrop. The current app uses only the `IOSDevice` wrapper, but the rest of the components are available and could be wired into onboarding or settings flows later.

### 3.6 Hosting & deploy

- Pure static site, no build step. Vercel auto-detects it and serves the files as-is.
- `vercel.json` provides cache headers and clean URLs (not read in this audit, called out by the README).
- README documents three deploy paths (drag-and-drop, GitHub-connected, CLI) and a PWA-style "Add to Home Screen" instruction for iOS/Android.

---

## 4. Intended features

These are features the README, the data model, or the existing UI shells already imply but which are not yet implemented. They are the natural next-version scope.

### 4.1 Real device integration

- **Live GPS** — replace the simulated coordinate jitter with `navigator.geolocation.watchPosition()`. The capture record already has `lat` / `lon` fields and a footer that displays them; the accuracy pill in the top bar (`±2.4m`) should reflect the real reading's `accuracy`.
- **TDR pairing (future)** — the eyebrow text "New reading · TDR-350" hints at a specific Spectrum Technologies probe. A v2 could read VWC directly via Bluetooth instead of asking the tech to type it. implement the data to update an existing firebase database. 

### 4.2 Persistence

- **Local-first storage** — swap the in-memory `READINGS` array for `localStorage` or IndexedDB so a tab refresh, an Add-to-Home-Screen launch, or a phone reboot does not wipe captures.
- **Schema versioning** — once stored, the reading shape (§5) needs a `v` field so future migrations are safe.

### 4.3 Offline-first PWA

- Add a `manifest.json` with the TurfIQ icon, name, and theme colour.
- Add a service worker that pre-caches the app shell and queues captures while offline (greens are routinely out of cell range).
- Ship a real install card on first run rather than relying on the user to find Safari's Share → Add to Home Screen.

### 4.4 CSV export (wire the existing button)

The Analysis header already renders a `⬇ export csv` button. It is currently inert. Intended behaviour:

- Export the readings inside the selected date range, filtered by hole if a hole is selected.
- Columns: `timestamp_iso, hole, par, value_vwc, phase, position, tech, lat, lon`.
- Produce a `Blob` and trigger a download named `turfiq_[course]_[range].csv`.



### 4.6 History tab

The tab bar already has a **History** button — wired to the Analysis screen as a stub. Intended scope: a chronological reverse-time feed of every reading the current tech has captured (or every reading on the course, switchable), separate from the per-hole Analysis view. This is the "what did we do this week" log, distinct from "where is the course right now".

### 4.7 Position-aware capture

The data model carries `pos: 'front' | 'middle' | 'back'` (where on the green the probe went in), but the simple Capture screen hard-codes `'middle'`. Intended UI: a three-way pill row under the hole picker — the older keypad-style mock (`pos-row` in `styles.css`) is still present in the stylesheet but no longer mounted, suggesting an earlier prototype that should be reintroduced.

### 4.8 Tech identity

`tech: 'JM'` is hard-coded in `capture.jsx`. Intended: pull from the signed-in user (once auth exists), or at minimum a one-time "Who are you?" picker stored locally.

### 4.9 Alerting / push

`isCritical` (VWC < 12 % or > 26 %) already drives a pulsing ring in the heatmap and an `⚠ ATTN` badge in Trends mode. A natural next step is a push notification when a hole crosses into a critical band — useful when the superintendent isn't actively looking at the app.

---

## 5. Data model

The only entity today is a **Reading**. Shape (as emitted by both `data.js` seed and the Capture submit handler):

```
Reading {
  hole:  1..18           // selected hole number
  value: 0..40           // VWC %, rounded to 1 decimal
  t:     number          // unix ms timestamp
  phase: 'before' | 'after'
  pos:   'front' | 'middle' | 'back'
  tech:  'JM' | 'AR' | 'CH'
  lat:   number          // decimal degrees
  lon:   number          // decimal degrees
}
```

The **Course** is currently a singleton on `window.COURSE`:

```
Course {
  name:  string
  city:  string
  w, h:  number         // SVG canvas size
  holes: Hole[18]
}

Hole {
  n:   1..18
  par: 3 | 4 | 5
  yds: number          // yardage
  gx, gy: number       // green coords on canvas
  tx, ty: number       // tee coords on canvas
}
```

For a real backend, this becomes three tables: `courses`, `holes (course_id)`, `readings (course_id, hole_n, …)`, with a `users` table once multi-tech sync ships.

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

| File | Role |
|---|---|
| `index.html` | Loads fonts, React 18 UMD, Babel standalone, all JSX files, then renders the `Mount` stage that frames the app in an `IOSDevice` with two side captions. |
| `styles.css` | All design tokens and component CSS. ~1260 lines. No CSS modules / Tailwind. |
| `data.js` | Course definition and seeded readings. Helpers attached to `window`. |
| `ios-frame.jsx` | iOS bezel + reusable iOS 26 components. |
| `capture.jsx` | Capture screen. |
| `analysis.jsx` | Analysis screen (heatmap, trends, readings table). |
| `app.jsx` | App shell, tabs, toast. |
| `package.json` | Just declares `npx serve .` as `dev`/`start`. |
| `vercel.json` | Cache + clean-URL config for static deploy. |

**Build / runtime constraints:**

- No bundler. JSX is transpiled in the browser by Babel standalone — fine for prototyping, **not** production. Replacing this with Vite or esbuild is a prerequisite for shipping.
- React, ReactDOM, and Babel are pinned to specific UMD URLs with SRI hashes.
- All component state is local; there is no global store. Readings flow from `App` down to both screens.
- All sizes are stage-dependent: the index stages the app at exactly 390×844, so internal layout is built to that fixed viewport, not to a fluid responsive grid.

**Risks to address before field use:**

1. In-browser Babel is slow on first load and blocks rendering — replace with a real build step.
2. No persistence — any captured reading is lost on refresh.
3. No error boundaries; a thrown render error blanks the whole frame.
4. GPS is simulated; real `watchPosition` requires HTTPS and a user permission grant that the current shell does not handle.
5. The font CDN (Google Fonts) is a runtime dependency and a privacy footprint.

---

## 8. Roadmap (proposed)

Phased plan synthesised from §3 and §4. Sequencing prioritises field-readiness over polish.

**Phase 1 — Production prototype (1–2 weeks)**

1. Add a Vite (or equivalent) build, remove Babel-in-browser.
2. Wire `navigator.geolocation.watchPosition()` and surface real accuracy.
3. Persist readings to IndexedDB; add a schema version field.
4. Implement the CSV export button.
5. Add the position pill (front/middle/back) back into the capture flow.
6. Replace the hard-coded `JM` tech identifier with a local "Who are you?" picker.

**Phase 2 — Field-tested PWA (2–3 weeks)**

7. `manifest.json` + service worker, offline app shell, install prompt.
8. Outbox pattern: queue captures while offline, sync when reachable.
9. Real History tab (chronological, filterable by tech and date).
10. Error boundary + telemetry (Sentry or similar).

**Phase 3 — Multi-tech (4–6 weeks)**

11. Supabase project with `courses`, `holes`, `users`, `readings`.
12. Magic-link auth, course selector, per-tech feeds.
13. Conflict-free sync (last-write-wins is probably sufficient — captures are append-only).
14. Push notifications on critical readings.

**Phase 4 — Beyond (exploratory)**

15. Bluetooth TDR pairing (Spectrum TDR-350).
16. Multi-course superintendent view.
17. Irrigation-plan suggestions: compare today's heatmap against the schedule and surface "skip green 12, double green 3" recommendations.
18. Weather overlay — pull NWS or a paid weather API for the course location.

---

## 9. Open questions

- **Course onboarding.** How does a real customer get their 18-hole layout into the app? Trace from satellite imagery? Manual entry of green/tee coordinates? A "tap to drop pins on a map" wizard?
- **Optimal band per course.** The hard-coded 14–22 % optimal range is a generic USGA-spec putting-green target. Superintendents will want to set per-green (or at least per-region) targets — bermudagrass on a desert course needs a different envelope than poa annua on a temperate links.
- **Multiple probes per green.** The current model is one reading per probe-push. Some workflows take 3–5 pokes per green and average them. Does TurfIQ aggregate, or store each one and average on read?
- **Permission model.** When techs share a course, can everyone see everyone's readings? Edit them? Delete them?
- **Pricing / packaging.** Free for a single tech, paid for a team? Per-course license? Out of scope for the spec but it will shape the auth design.

---

*Generated from a direct audit of the `DTC-2` repository on 2026-05-15. Every behaviour in §3 has been verified against the JSX/CSS source; §4 features are inferred from the README's "Next steps" list, the existing data model, and dormant UI affordances (the History tab, the inert CSV button, the unused position-pill stylesheet block).*
