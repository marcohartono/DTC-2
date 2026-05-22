import type { Tab } from '../types';
import type { GpsState } from '../lib/gps';
import { AnalysisIcon, CaptureIcon, HistoryIcon } from './icons';

interface Props {
  tab: Tab;
  onTabChange: (t: Tab) => void;
  todayCount: number;
  dateStr: string;
  tech: string;
  courseName: string;
  gps: GpsState;
  onTechClick: () => void;
  onOpenSetup: () => void;
}

function GpsMeta({ gps }: { gps: GpsState }) {
  const label =
    gps.source === 'pending'
      ? 'GPS · LOCKING…'
      : gps.source === 'real'
        ? `GPS · LIVE · ±${(gps.acc ?? 0).toFixed(1)}m`
        : `GPS · SIM · ±${(gps.acc ?? 0).toFixed(1)}m`;
  return (
    <span className={'gps-pill' + (gps.source === 'real' ? '' : ' sim')}>
      <span className="gps-dot" />
      {label}
    </span>
  );
}

export function TopBar({ tab, onTabChange, todayCount, dateStr, tech, courseName, gps, onTechClick, onOpenSetup }: Props) {
  return (
    <div className="topbar">
      <div className="topbar-row">
        <div className="brand">
          <span className="dot" />
          Turf<i>IQ</i>
        </div>

        <nav className="top-nav">
          <button className={tab === 'capture' ? 'active' : ''} onClick={() => onTabChange('capture')}>
            <span className="icon"><CaptureIcon active={tab === 'capture'} /></span>
            Capture
          </button>
          <button className={tab === 'analysis' ? 'active' : ''} onClick={() => onTabChange('analysis')}>
            <span className="icon"><AnalysisIcon active={tab === 'analysis'} /></span>
            Analysis
          </button>
          <button className={tab === 'history' ? 'active' : ''} onClick={() => onTabChange('history')}>
            <span className="icon"><HistoryIcon active={tab === 'history'} /></span>
            History
          </button>
        </nav>

        <div className="meta">
          {tab === 'capture' ? (
            <GpsMeta gps={gps} />
          ) : (
            <button className="tech-badge" onClick={onTechClick} title="Change identity">
              <b>{tech} · {courseName}</b><br />
              {dateStr} · {todayCount} READINGS TODAY
            </button>
          )}
        </div>

        <button className="topbar-settings" onClick={onOpenSetup} title="Course setup" aria-label="Course setup">
          ⚙
        </button>
      </div>
    </div>
  );
}
