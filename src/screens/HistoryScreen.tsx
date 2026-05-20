import { useMemo, useState } from 'react';
import type { AnalysisRange, Reading } from '../types';
import { moistureColor } from '../lib/moisture';
import { fmtTime, fmtTimeShort } from '../lib/time';
import { csvFilename, downloadCsv, readingsToCsv } from '../lib/csv';
import { COURSE } from '../lib/mockData';

interface Props {
  readings: Reading[];
  onJumpToHole: (hole: number) => void;
  currentTech: string;
}

const RANGES: AnalysisRange[] = [1, 7, 30];

export function HistoryScreen({ readings, onJumpToHole, currentTech }: Props) {
  const [range, setRange] = useState<AnalysisRange>(7);
  const [techFilter, setTechFilter] = useState<'all' | 'me' | string>('all');

  const techs = useMemo(() => {
    const set = new Set<string>();
    for (const r of readings) set.add(r.tech);
    return Array.from(set).sort();
  }, [readings]);

  const cutoff = Date.now() - range * 86_400_000;

  const filtered = useMemo(() => {
    const matchTech = (t: string) => {
      if (techFilter === 'all') return true;
      if (techFilter === 'me') return t === currentTech;
      return t === techFilter;
    };
    return readings
      .filter((r) => r.t >= cutoff && matchTech(r.tech))
      .sort((a, b) => b.t - a.t);
  }, [readings, cutoff, techFilter, currentTech]);

  const onExport = () => {
    if (filtered.length === 0) return;
    downloadCsv(csvFilename(COURSE.name, range), readingsToCsv([...filtered].reverse()));
  };

  return (
    <div className="history">
      <div className="analysis-head">
        <div className="sub">Reading log · {filtered.length} entries</div>
        <h1>Field <i>history</i></h1>
        <div className="range-row">
          {RANGES.map((d) => (
            <button key={d} className={range === d ? 'sel' : ''} onClick={() => setRange(d)}>
              {d === 1 ? '24h' : d + 'd'}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button className="export-btn" onClick={onExport} disabled={filtered.length === 0}>
            ⬇ export csv
          </button>
        </div>
        <div className="tech-filter-row">
          <button className={techFilter === 'all' ? 'sel' : ''} onClick={() => setTechFilter('all')}>All</button>
          <button className={techFilter === 'me' ? 'sel' : ''} onClick={() => setTechFilter('me')}>Me · {currentTech}</button>
          {techs.filter((t) => t !== currentTech).map((t) => (
            <button key={t} className={techFilter === t ? 'sel' : ''} onClick={() => setTechFilter(t)}>{t}</button>
          ))}
        </div>
      </div>

      <div className="history-list">
        {filtered.length === 0 && (
          <div className="empty-state">No readings in range</div>
        )}
        {filtered.map((r, i) => (
          <button key={i} className="history-row" onClick={() => onJumpToHole(r.hole)}>
            <div className="h">#{r.hole}</div>
            <div className="info">
              <b>{fmtTimeShort(r.t)} · {fmtTime(r.t)}</b>
              <span className={'phase-pill ' + r.phase} style={{ marginRight: 6 }}>
                {r.phase === 'after' ? '◆ after' : '● before'}
              </span>
              {r.pos} · {r.tech}
            </div>
            <div className="v">
              {r.value.toFixed(1)}<span className="vu">%</span>
            </div>
            <div className="sw" style={{ background: moistureColor(r.value) }} />
          </button>
        ))}
      </div>
    </div>
  );
}
