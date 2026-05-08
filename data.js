// ───────── TurfIQ — mock data ─────────
// 18 holes with par, distance, and a small course-routing layout
// Coordinates are in a 0-100 unit space mapped to the SVG viewBox

window.COURSE = {
  name: "Cypress Bend",
  city: "Carmel-by-the-Sea, CA",
  // canvas size
  w: 360, h: 460,
  // green positions (x,y) on the canvas — laid out in a loose loop
  holes: [
    { n: 1,  par: 4, yds: 412, gx:  60, gy:  60, tx:  35, ty: 110 },
    { n: 2,  par: 3, yds: 168, gx: 110, gy:  40, tx:  82, ty:  78 },
    { n: 3,  par: 5, yds: 528, gx: 170, gy:  56, tx: 130, ty: 105 },
    { n: 4,  par: 4, yds: 384, gx: 222, gy:  82, tx: 180, ty: 130 },
    { n: 5,  par: 4, yds: 446, gx: 280, gy:  70, tx: 240, ty: 122 },
    { n: 6,  par: 3, yds: 192, gx: 318, gy: 116, tx: 290, ty: 158 },
    { n: 7,  par: 4, yds: 402, gx: 296, gy: 178, tx: 330, ty: 220 },
    { n: 8,  par: 5, yds: 562, gx: 248, gy: 200, tx: 290, ty: 250 },
    { n: 9,  par: 4, yds: 428, gx: 188, gy: 224, tx: 232, ty: 268 },
    // back nine
    { n: 10, par: 4, yds: 396, gx: 132, gy: 248, tx: 174, ty: 290 },
    { n: 11, par: 3, yds: 158, gx:  78, gy: 268, tx: 116, ty: 304 },
    { n: 12, par: 5, yds: 512, gx:  44, gy: 304, tx:  78, ty: 352 },
    { n: 13, par: 4, yds: 374, gx:  92, gy: 332, tx:  52, ty: 380 },
    { n: 14, par: 4, yds: 418, gx: 152, gy: 348, tx: 110, ty: 392 },
    { n: 15, par: 3, yds: 186, gx: 208, gy: 372, tx: 168, ty: 412 },
    { n: 16, par: 4, yds: 442, gx: 256, gy: 386, tx: 222, ty: 420 },
    { n: 17, par: 5, yds: 548, gx: 304, gy: 360, tx: 274, ty: 414 },
    { n: 18, par: 4, yds: 458, gx: 320, gy: 296, tx: 318, ty: 360 }
  ]
};

// deterministic-ish mock readings: 7 days × 18 holes × ~3 readings/day
// values are realistic VWC % for putting greens (USGA spec ~12-18% optimal)
function seededRand(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function makeReadings() {
  const now = Date.now();
  const readings = [];
  // each hole has a "personality": baseline + drift + variability
  const personalities = window.COURSE.holes.map((h, i) => {
    const r = seededRand(h.n * 137 + 7);
    return {
      hole: h.n,
      base: 14 + r() * 8,        // 14–22
      drift: (r() - 0.5) * 0.5,  // per-day drift
      noise: 1.2 + r() * 1.4,
      // a few problem holes
      flag: r()
    };
  });

  // override two holes with notable conditions for visualisation
  personalities[2].base = 9.5;   // hole 3 dry
  personalities[2].drift = -0.4;
  personalities[6].base = 27.0;  // hole 7 saturated
  personalities[6].drift = 0.3;
  personalities[13].base = 11.5; // hole 14 trending dry
  personalities[13].drift = -0.5;

  for (let day = 6; day >= 0; day--) {
    personalities.forEach(p => {
      const hole = p.hole;
      const r = seededRand(hole * 999 + day * 31);
      // 2-3 BEFORE-water readings per day
      const count = 2 + Math.floor(r() * 2);
      // does this hole get watered today?
      const watered = r() > 0.35;
      let waterT = null;
      for (let k = 0; k < count; k++) {
        const hour = 6 + k * 4 + r() * 1.5;
        const t = now - day * 86400000 - (24 - hour) * 3600000;
        const value = Math.max(4, Math.min(34,
          p.base + p.drift * (6 - day) + (r() - 0.5) * p.noise * 2
        ));
        readings.push({
          hole,
          value: Math.round(value * 10) / 10,
          t,
          phase: 'before',
          pos: ['front', 'middle', 'back'][Math.floor(r() * 3)],
          tech: ['JM', 'AR', 'CH'][Math.floor(r() * 3)],
          lat: 36.5547 + (r() - 0.5) * 0.001,
          lon: -121.9230 + (r() - 0.5) * 0.001
        });
        if (k === count - 1) waterT = t + 30 * 60000 + r() * 30 * 60000;
      }
      // AFTER-water reading: 30–60min after last 'before' reading
      if (watered && waterT && waterT < now) {
        const beforeLast = p.base + p.drift * (6 - day);
        const afterValue = Math.max(8, Math.min(34, beforeLast + 5 + r() * 4));
        readings.push({
          hole,
          value: Math.round(afterValue * 10) / 10,
          t: waterT,
          phase: 'after',
          pos: ['front', 'middle', 'back'][Math.floor(r() * 3)],
          tech: ['JM', 'AR', 'CH'][Math.floor(r() * 3)],
          lat: 36.5547 + (r() - 0.5) * 0.001,
          lon: -121.9230 + (r() - 0.5) * 0.001
        });
      }
    });
  }
  return readings.sort((a, b) => b.t - a.t);
}

window.READINGS = makeReadings();

// helpers
window.moistureColor = function(v) {
  if (v < 10)  return '#b85a2a';
  if (v < 14)  return '#d28b4a';
  if (v < 17)  return '#b8a23a';
  if (v < 22)  return '#6b8a3a';
  if (v < 25)  return '#3f6b3c';
  if (v < 28)  return '#2e6e7a';
  return '#1f4a6e';
};

window.moistureBand = function(v) {
  if (v < 10)  return { name: 'Critical dry', cls: 'dry' };
  if (v < 14)  return { name: 'Dry',          cls: 'dry' };
  if (v < 17)  return { name: 'Optimal–low',  cls: 'opt' };
  if (v < 22)  return { name: 'Optimal',      cls: 'opt' };
  if (v < 25)  return { name: 'Optimal–high', cls: 'opt' };
  if (v < 28)  return { name: 'Saturated',    cls: 'wet' };
  return         { name: 'Critical wet', cls: 'wet' };
};

window.fmtTime = function(ts) {
  const d = new Date(ts);
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return Math.floor(diff/60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff/3600000) + 'h ago';
  const days = Math.floor(diff/86400000);
  if (days < 7) return days + 'd ago';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

window.fmtTimeShort = function(ts) {
  const d = new Date(ts);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};
