// ───────── Capture screen — simple ─────────
const { useState, useEffect, useRef } = React;

function CaptureScreen({ onLog, recent }) {
  const [value, setValue] = useState(18.0);
  const [hole, setHole] = useState(7);
  const [phase, setPhase] = useState('before');

  // simulated GPS lock
  const [coords, setCoords] = useState({ lat: 36.5547, lon: -121.9231, acc: 2.4 });
  useEffect(() => {
    const id = setInterval(() => {
      setCoords(c => ({
        lat: c.lat + (Math.random() - 0.5) * 0.00002,
        lon: c.lon + (Math.random() - 0.5) * 0.00002,
        acc: 1.8 + Math.random() * 1.4,
      }));
    }, 1500);
    return () => clearInterval(id);
  }, []);

  // live clock for stamp
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const v = parseFloat(value) || 0;
  const band = window.moistureBand(v);
  const swatch = window.moistureColor(v);

  const onSlide = (e) => setValue(parseFloat(e.target.value));
  const onType = (e) => {
    const n = e.target.value;
    if (n === "") { setValue(""); return; }
    const num = parseFloat(n);
    if (!isNaN(num)) setValue(Math.max(0, Math.min(40, num)));
  };

  const canLog = parseFloat(value) > 0 && hole;
  const onSave = () => {
    if (!canLog) return;
    onLog({
      hole,
      value: Math.round(parseFloat(value) * 10) / 10,
      t: Date.now(),
      phase,
      pos: 'middle',
      tech: 'JM',
      lat: coords.lat,
      lon: coords.lon
    });
    setValue(18.0);
  };

  // marker on slider track (0–40 → 0–100%)
  const pct = Math.max(0, Math.min(100, (v / 40) * 100));
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false });

  return (
    <div className="capture-simple">
      <div className="cs-hero">
        <div className="eyebrow">New reading · TDR-350</div>
        <h1 className="cs-q">
          What's the <i>moisture</i><br/>on hole {hole}?
        </h1>
      </div>

      {/* Before / After watering */}
      <div className="cs-section">
        <div className="cs-label">
          <span>Reading phase</span>
          <span className="cs-meta">{phase === 'before' ? 'Pre-irrigation' : 'Post-irrigation'}</span>
        </div>
        <div className="cs-phase">
          <button
            className={"cs-phase-btn" + (phase === 'before' ? ' sel' : '')}
            onClick={() => setPhase('before')}>
            <span className="cs-phase-ico">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 3v9M12 12 L8 8 M12 12 L16 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"/>
                <path d="M5 17 Q12 21 19 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
              </svg>
            </span>
            <span className="cs-phase-l">
              <b>Before</b>
              <small>watering</small>
            </span>
          </button>
          <button
            className={"cs-phase-btn" + (phase === 'after' ? ' sel' : '')}
            onClick={() => setPhase('after')}>
            <span className="cs-phase-ico">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 3 C8 8 6 11 6 14 a6 6 0 0 0 12 0 c0 -3 -2 -6 -6 -11z" fill="currentColor" opacity="0.85"/>
              </svg>
            </span>
            <span className="cs-phase-l">
              <b>After</b>
              <small>watering</small>
            </span>
          </button>
        </div>
      </div>

      {/* Hole picker — compact */}
      <div className="cs-section">
        <div className="cs-label">
          <span>Hole</span>
          <span className="cs-meta">Par {window.COURSE.holes[hole-1].par} · {window.COURSE.holes[hole-1].yds}y</span>
        </div>
        <div className="cs-hole-strip">
          {window.COURSE.holes.map(h => (
            <button
              key={h.n}
              className={"cs-hole-btn" + (hole === h.n ? " sel" : "")}
              onClick={() => setHole(h.n)}>
              {h.n}
            </button>
          ))}
        </div>
      </div>

      {/* Big number + slider */}
      <div className="cs-section cs-moisture">
        <div className="cs-label">
          <span>Volumetric water content</span>
          <span className="cs-meta">VWC %</span>
        </div>

        <div className="cs-readout">
          <input
            className="cs-num"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            max="40"
            value={value}
            onChange={onType}
          />
          <span className="cs-unit">%</span>
          <span className={"cs-band " + band.cls}>
            <span className="cs-swatch" style={{ background: swatch }}></span>
            {band.name}
          </span>
        </div>

        <div className="cs-slider-wrap">
          <input
            type="range"
            min="0"
            max="40"
            step="0.1"
            value={value || 0}
            onChange={onSlide}
            className="cs-slider"
            style={{ '--pct': pct + '%', '--c': swatch }}
          />
          <div className="cs-slider-ticks">
            <span>0</span>
            <span>10</span>
            <span>20</span>
            <span>30</span>
            <span>40</span>
          </div>
        </div>
      </div>

      {/* Auto-captured footer (small) */}
      <div className="cs-auto">
        <span className="cs-auto-dot"></span>
        Auto · {coords.lat.toFixed(4)}°N {Math.abs(coords.lon).toFixed(4)}°W · {timeStr}
      </div>

      <button className="cta cs-cta" onClick={onSave} disabled={!canLog}>
        Submit reading <span className="arrow">→</span>
      </button>

      {recent.length > 0 && (
        <div className="cs-last">
          <span className="cs-auto-dot" style={{ background: 'var(--bone-3)' }}></span>
          Last: hole {recent[0].hole} · {recent[0].value.toFixed(1)}% · {window.fmtTime(recent[0].t)}
        </div>
      )}
    </div>
  );
}

window.CaptureScreen = CaptureScreen;
