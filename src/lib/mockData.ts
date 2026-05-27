import type { Course, Reading, Tech } from '../types';

export const COURSE: Course = {
  name: 'Winnetka Golf Course',
  city: 'Evanston, IL',
  w: 360,
  h: 460,
  holes: [
    { n: 1, par: 4, yds: 412, gx: 60, gy: 60, tx: 35, ty: 110 },
    { n: 2, par: 3, yds: 168, gx: 110, gy: 40, tx: 82, ty: 78 },
    { n: 3, par: 5, yds: 528, gx: 170, gy: 56, tx: 130, ty: 105 },
    { n: 4, par: 4, yds: 384, gx: 222, gy: 82, tx: 180, ty: 130 },
    { n: 5, par: 4, yds: 446, gx: 280, gy: 70, tx: 240, ty: 122 },
    { n: 6, par: 3, yds: 192, gx: 318, gy: 116, tx: 290, ty: 158 },
    { n: 7, par: 4, yds: 402, gx: 296, gy: 178, tx: 330, ty: 220 },
    { n: 8, par: 5, yds: 562, gx: 248, gy: 200, tx: 290, ty: 250 },
    { n: 9, par: 4, yds: 428, gx: 188, gy: 224, tx: 232, ty: 268 },
    { n: 10, par: 4, yds: 396, gx: 132, gy: 248, tx: 174, ty: 290 },
    { n: 11, par: 3, yds: 158, gx: 78, gy: 268, tx: 116, ty: 304 },
    { n: 12, par: 5, yds: 512, gx: 44, gy: 304, tx: 78, ty: 352 },
    { n: 13, par: 4, yds: 374, gx: 92, gy: 332, tx: 52, ty: 380 },
    { n: 14, par: 4, yds: 418, gx: 152, gy: 348, tx: 110, ty: 392 },
    { n: 15, par: 3, yds: 186, gx: 208, gy: 372, tx: 168, ty: 412 },
    { n: 16, par: 4, yds: 442, gx: 256, gy: 386, tx: 222, ty: 420 },
    { n: 17, par: 5, yds: 548, gx: 304, gy: 360, tx: 274, ty: 414 },
    { n: 18, par: 4, yds: 458, gx: 320, gy: 296, tx: 318, ty: 360 },
  ],
};

const DAY = 86_400_000;
const TECHS: Tech[] = ['JM', 'AR', 'CH'];

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function seededRand(seed: number): () => number {
  let s = ((seed % 233280) + 233280) % 233280;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// Normalised weather features — identical to the ones predict-vwc fits on, so
// the per-hole regression recovers the coefficients these demo readings were
// generated from. f_temp ≈ 0 at a mild 60°F, f_precip ≈ 1 per 5 mm of rain.
const fTemp = (tempF: number) => (tempF - 60) / 10;
const fPrecip = (mm: number) => mm / 5;

// One day of real observed weather (aggregated from live Open-Meteo rows), used
// only to drive the demo readings — there is no synthetic/scripted weather.
export interface ObservedDay {
  dayIdx: number; // UTC day index (floor(ms / 86_400_000))
  tempF: number; // daily mean
  precipMm: number; // daily sum
}

interface Personality {
  target: number; // managed optimal VWC the greenkeeper irrigates toward
  kT: number; // drying response to heat (negative, applied to f_temp)
  kP: number; // gain response to precip (positive, applied to f_precip)
  mr: number; // mean-reversion strength toward target (the irrigation proxy)
  noise: number;
  waterProb: number;
}

function personalityFor(hole: number): Personality {
  const r = seededRand(hole * 137 + 7);
  const p: Personality = {
    target: 17 + r() * 4, // 17–21: sits inside the 14–22 optimal band
    kT: -(0.7 + r() * 0.7), // -0.7 .. -1.4 (heat-driven drying)
    kP: 1.8 + r() * 0.9, //  1.8 .. 2.7 (precip gain)
    mr: 0.35 + r() * 0.15, // daily pull back toward target
    noise: 0.8 + r() * 0.7,
    waterProb: 0.25 + r() * 0.15,
  };
  // Personality overrides that surface interesting states on the heatmap.
  if (hole === 3) { p.target = 12; p.kT = -1.3; p.mr = 0.28; } // runs dry, fast drier, watered less
  if (hole === 7) { p.target = 24; p.kP = 2.8; p.mr = 0.45; } // kept on the wet side
  if (hole === 14) { p.target = 14; p.kT = -1.2; p.mr = 0.3; } // trending dry
  return p;
}

// Weather-coherent demo readings, driven by the REAL observed-weather series
// (passed in from live Open-Meteo). Each hole's daily VWC is a weather response
// (kT·heat + kP·precip — the form predict-vwc fits) plus a mean-reversion toward
// the hole's managed target, which stands in for routine irrigation and keeps
// measured values realistic (~14–22%). Because the weather signal still drives
// the day-to-day deltas, predict-vwc recovers per-hole coefficients from these
// readings and then forecasts off the LIVE 7-day forecast — no scripted weather.
export function makeReadings(observed: ObservedDay[], now = Date.now()): Reading[] {
  const days = [...observed].sort((a, b) => a.dayIdx - b.dayIdx);
  const readings: Reading[] = [];

  for (const hole of COURSE.holes.map((h) => h.n)) {
    const p = personalityFor(hole);
    const r = seededRand(hole * 911 + 41);
    let vwc = p.target;

    for (const day of days) {
      const weather = p.kT * fTemp(day.tempF) + p.kP * fPrecip(day.precipMm);
      const reversion = p.mr * (p.target - vwc);
      vwc = clamp(vwc + weather + reversion, 4, 34);

      const dayStart = day.dayIdx * DAY;
      const count = 2 + Math.floor(r() * 2);
      for (let k = 0; k < count; k++) {
        const hour = 6 + k * 3 + r() * 1.5;
        readings.push({
          hole,
          value: Math.round(clamp(vwc + (r() - 0.5) * p.noise * 2, 4, 34) * 10) / 10,
          t: dayStart + hour * 3_600_000,
          phase: 'before',
          tech: TECHS[Math.floor(r() * 3)]!,
          lat: 42.1091 + (r() - 0.5) * 0.001,
          lon: -87.7591 + (r() - 0.5) * 0.001,
        });
      }

      // Occasional watering on a dry day → a small 'after' lift (for the
      // before/after UI). Not carried forward; reversion already models upkeep.
      if (r() < p.waterProb && day.precipMm < 2 && vwc < p.target) {
        const after = clamp(vwc + 2.5 + r() * 2, 4, 34);
        readings.push({
          hole,
          value: Math.round(after * 10) / 10,
          t: dayStart + (14 + r() * 2) * 3_600_000,
          phase: 'after',
          tech: TECHS[Math.floor(r() * 3)]!,
          lat: 42.1091 + (r() - 0.5) * 0.001,
          lon: -87.7591 + (r() - 0.5) * 0.001,
        });
      }
    }
  }

  // Drop any readings that land in the future (boundary of the current day).
  return readings.filter((x) => x.t <= now).sort((a, b) => b.t - a.t);
}
