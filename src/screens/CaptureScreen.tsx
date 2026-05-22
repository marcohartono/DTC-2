import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import type { Phase, Reading } from '../types';
import { COURSE } from '../lib/mockData';
import { moistureBand, moistureColor } from '../lib/moisture';
import { fmtTime } from '../lib/time';
import { useGps } from '../lib/gps';
import { PhaseAfterIcon, PhaseBeforeIcon } from '../components/icons';
import { supabase } from '../lib/supabase';
import { useCourse } from '../context/CourseContext';
import { detectHole } from '../lib/geofence';

interface Props {
  onLog: (r: Reading) => void;
  recent: Reading[];
  tech: string;
  onOpenSetup: () => void;
}

// Auto-detect is suppressed when the GPS fix is looser than this (metres).
const GEOFENCE_ACC_LIMIT = 10;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsDataURL(file);
  });
}

export function CaptureScreen({ onLog, recent, tech, onOpenSetup }: Props) {
  const [value, setValue] = useState<number | ''>('');
  const [hole, setHole] = useState(7);
  const [phase, setPhase] = useState<Phase>('before');
  const [now, setNow] = useState(new Date());
  const [showManual, setShowManual] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const gps = useGps();
  const { geofences } = useCourse();
  const fileRef = useRef<HTMLInputElement>(null);
  const prevDetected = useRef<number | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const v = typeof value === 'number' ? value : parseFloat(value) || 0;
  const band = moistureBand(v);
  const swatch = moistureColor(v);

  // Geofencing: which hole's polygon contains the current fix (accuracy-gated).
  const hasGeofences = geofences.features.length > 0;
  const detected = useMemo(() => {
    if (gps.acc != null && gps.acc > GEOFENCE_ACC_LIMIT) return null;
    return detectHole(gps.lat, gps.lon, geofences);
  }, [gps.lat, gps.lon, gps.acc, geofences]);

  // Follow the detected hole, but only when it changes — so a manual tap on a
  // different hole while standing on one green is never yanked back.
  useEffect(() => {
    if (detected == null) return;
    if (detected !== prevDetected.current) {
      prevDetected.current = detected;
      setHole(detected);
    }
  }, [detected]);

  const onSlide = (e: ChangeEvent<HTMLInputElement>) => setValue(parseFloat(e.target.value));
  const onType = (e: ChangeEvent<HTMLInputElement>) => {
    const n = e.target.value;
    if (n === '') { setValue(''); return; }
    const num = parseFloat(n);
    if (!Number.isNaN(num)) setValue(Math.max(0, Math.min(40, num)));
  };

  const onPickPhoto = () => fileRef.current?.click();
  const onPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // let the same file be re-picked
    if (!file) return;
    setPhotoError(null);
    setAnalyzing(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const { data, error } = await supabase.functions.invoke('analyze-tdr-photo', {
        body: { imageBase64: dataUrl },
      });
      if (error) throw error;
      const vwc = (data as { vwc: number | null } | null)?.vwc;
      if (vwc == null || Number.isNaN(vwc)) {
        setPhotoError("Couldn't read the screen — enter the value manually.");
        setShowManual(true);
      } else {
        setValue(Math.round(vwc * 10) / 10);
      }
    } catch {
      setPhotoError('Photo analysis failed — enter the value manually.');
      setShowManual(true);
    } finally {
      setAnalyzing(false);
    }
  };

  const canLog = v > 0 && hole > 0;
  const onSave = () => {
    if (!canLog) return;
    onLog({
      hole,
      value: Math.round(v * 10) / 10,
      t: Date.now(),
      phase,
      tech,
      lat: gps.lat,
      lon: gps.lon,
      photo_url: null,
    });
    setValue('');
    setShowManual(false);
    setPhotoError(null);
  };

  const pct = Math.max(0, Math.min(100, (v / 40) * 100));
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false });
  const meta = COURSE.holes[hole - 1]!;
  const last = recent[0];

  const accLabel =
    gps.source === 'pending'
      ? 'Locking…'
      : gps.acc != null
        ? `±${gps.acc.toFixed(1)}m`
        : 'Unknown';
  const sourceLabel = gps.source === 'real' ? 'Live' : gps.source === 'simulated' ? 'Sim' : '—';

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

        {detected != null ? (
          <div className="cs-detected">
            <span className="cs-detected-dot" />
            Detected · hole {detected}
            {hole !== detected && <span className="cs-detected-sub"> · showing {hole}</span>}
          </div>
        ) : (
          <button className="cs-setup-link" onClick={onOpenSetup}>
            {hasGeofences ? 'Edit hole map' : 'No hole map yet · set it up'} →
          </button>
        )}

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

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onPhoto}
          style={{ display: 'none' }}
        />
        <button
          className={'cs-photo-btn' + (analyzing ? ' analyzing' : '')}
          onClick={onPickPhoto}
          disabled={analyzing}
        >
          {analyzing ? (
            <><span className="cs-photo-spin" /> Reading screen…</>
          ) : (
            <>📷 Photo of TDR</>
          )}
        </button>

        {photoError && <div className="cs-photo-err">{photoError}</div>}

        <div className="cs-readout">
          <input
            className="cs-num"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            max="40"
            placeholder="—"
            value={value}
            onChange={onType}
          />
          <span className="cs-unit">%</span>
          <span className={'cs-band ' + band.cls}>
            <span className="cs-swatch" style={{ background: swatch }} />
            {band.name}
          </span>
        </div>

        <button
          className="cs-manual-toggle"
          onClick={() => setShowManual((s) => !s)}
        >
          {showManual ? 'Hide slider' : 'Adjust manually instead'}
        </button>

        {showManual && (
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
        )}
      </div>

      <div className="cs-auto">
        <span className="cs-auto-dot" />
        {sourceLabel} · {gps.lat.toFixed(4)}°N {Math.abs(gps.lon).toFixed(4)}°W · {accLabel} · {timeStr}
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
