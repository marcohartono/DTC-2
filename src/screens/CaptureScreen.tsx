import { useEffect, useState, type ChangeEvent } from 'react';
import type { Phase, Reading } from '../types';
import { COURSE } from '../lib/mockData';
import { moistureBand, moistureColor } from '../lib/moisture';
import { fmtTime } from '../lib/time';
import { PhaseAfterIcon, PhaseBeforeIcon } from '../components/icons';

interface Props {
  onLog: (r: Reading) => void;
  recent: Reading[];
}

export function CaptureScreen({ onLog, recent }: Props) {
  const [value, setValue] = useState<number | ''>(18.0);
  const [hole, setHole] = useState(7);
  const [phase, setPhase] = useState<Phase>('before');
  const [coords, setCoords] = useState({ lat: 36.5547, lon: -121.9231, acc: 2.4 });
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => {
      setCoords((c) => ({
        lat: c.lat + (Math.random() - 0.5) * 0.00002,
        lon: c.lon + (Math.random() - 0.5) * 0.00002,
        acc: 1.8 + Math.random() * 1.4,
      }));
    }, 1500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const v = typeof value === 'number' ? value : parseFloat(value) || 0;
  const band = moistureBand(v);
  const swatch = moistureColor(v);

  const onSlide = (e: ChangeEvent<HTMLInputElement>) => setValue(parseFloat(e.target.value));
  const onType = (e: ChangeEvent<HTMLInputElement>) => {
    const n = e.target.value;
    if (n === '') { setValue(''); return; }
    const num = parseFloat(n);
    if (!Number.isNaN(num)) setValue(Math.max(0, Math.min(40, num)));
  };

  const canLog = v > 0 && hole > 0;
  const onSave = () => {
    if (!canLog) return;
    onLog({
      hole,
      value: Math.round(v * 10) / 10,
      t: Date.now(),
      phase,
      pos: 'middle',
      tech: 'JM',
      lat: coords.lat,
      lon: coords.lon,
      v: 1,
    });
    setValue(18.0);
  };

  const pct = Math.max(0, Math.min(100, (v / 40) * 100));
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false });
  const meta = COURSE.holes[hole - 1]!;
  const last = recent[0];

  return (
    <div className="capture-simple">
      <div className="cs-hero">
        <div className="eyebrow">New reading · TDR-350</div>
        <h1 className="cs-q">
          What's the <i>moisture</i><br />on hole {hole}?
        </h1>
      </div>

      <div className="cs-section">
        <div className="cs-label">
          <span>Reading phase</span>
          <span className="cs-meta">{phase === 'before' ? 'Pre-irrigation' : 'Post-irrigation'}</span>
        </div>
        <div className="cs-phase">
          <button
            className={'cs-phase-btn' + (phase === 'before' ? ' sel' : '')}
            onClick={() => setPhase('before')}
          >
            <span className="cs-phase-ico"><PhaseBeforeIcon /></span>
            <span className="cs-phase-l"><b>Before</b><small>watering</small></span>
          </button>
          <button
            className={'cs-phase-btn' + (phase === 'after' ? ' sel' : '')}
            onClick={() => setPhase('after')}
          >
            <span className="cs-phase-ico"><PhaseAfterIcon /></span>
            <span className="cs-phase-l"><b>After</b><small>watering</small></span>
          </button>
        </div>
      </div>

      <div className="cs-section">
        <div className="cs-label">
          <span>Hole</span>
          <span className="cs-meta">Par {meta.par} · {meta.yds}y</span>
        </div>
        <div className="cs-hole-strip">
          {COURSE.holes.map((h) => (
            <button
              key={h.n}
              className={'cs-hole-btn' + (hole === h.n ? ' sel' : '')}
              onClick={() => setHole(h.n)}
            >
              {h.n}
            </button>
          ))}
        </div>
      </div>

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
          <span className={'cs-band ' + band.cls}>
            <span className="cs-swatch" style={{ background: swatch }} />
            {band.name}
          </span>
        </div>

        <div className="cs-slider-wrap">
          <input
            type="range"
            min="0"
            max="40"
            step="0.1"
            value={v}
            onChange={onSlide}
            className="cs-slider"
            style={{ ['--pct' as never]: pct + '%', ['--c' as never]: swatch }}
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

      <div className="cs-auto">
        <span className="cs-auto-dot" />
        Auto · {coords.lat.toFixed(4)}°N {Math.abs(coords.lon).toFixed(4)}°W · {timeStr}
      </div>

      <button className="cta cs-cta" onClick={onSave} disabled={!canLog}>
        Submit reading <span className="arrow">→</span>
      </button>

      {last && (
        <div className="cs-last">
          <span className="cs-auto-dot" style={{ background: 'var(--bone-3)' }} />
          Last: hole {last.hole} · {last.value.toFixed(1)}% · {fmtTime(last.t)}
        </div>
      )}
    </div>
  );
}
