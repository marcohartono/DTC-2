import { useCallback, useMemo, useState } from 'react';
import type { AnalysisRange, AnalysisView, Reading } from '../types';
import { COURSE } from '../lib/mockData';
import { moistureColor } from '../lib/moisture';
import { fmtTime, fmtTimeShort } from '../lib/time';
import { CourseHeatmap } from '../components/CourseHeatmap';
import { TrendChart } from '../components/TrendChart';
import { csvFilename, downloadCsv, readingsToCsv } from '../lib/csv';

interface Props {
  readings: Reading[];
  selectedHole: number;
  onSelectHole: (hole: number) => void;
}

export function AnalysisScreen({ readings, selectedHole, onSelectHole }: Props) {
  const [range, setRange] = useState<AnalysisRange>(7);
  const [view, setView] = useState<AnalysisView>('heatmap');

  const cutoff = Date.now() - range * 86_400_000;

  const stats = useMemo(() => {
    const data = readings.filter((r) => r.hole === selectedHole && r.t >= cutoff);
    if (data.length === 0) return null;
    const sorted = [...data].sort((a, b) => a.t - b.t);
    const vals = data.map((d) => d.value);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const last = sorted[sorted.length - 1]!.value;
    const first = sorted[0]!.value;
    const delta = last - first;
    const before = data.filter((d) => d.phase === 'before');
    const after = data.filter((d) => d.phase === 'after');
    const avgBefore = before.length ? before.reduce((a, b) => a + b.value, 0) / before.length : null;
    const avgAfter = after.length ? after.reduce((a, b) => a + b.value, 0) / after.length : null;
    const lift = avgBefore != null && avgAfter != null ? avgAfter - avgBefore : null;
    return {
      avg,
      min,
      max,
      last,
      delta,
      count: data.length,
      lastT: sorted[sorted.length - 1]!.t,
      avgBefore,
      avgAfter,
      lift,
    };
  }, [readings, selectedHole, cutoff]);

  const tableRows = useMemo(
    () =>
      readings
        .filter((r) => r.hole === selectedHole && r.t >= cutoff)
        .sort((a, b) => b.t - a.t)
        .slice(0, 8),
    [readings, selectedHole, cutoff],
  );

  const holeMeta = COURSE.holes[selectedHole - 1]!;

  const avgByHole = useMemo(() => {
    const m: Record<number, { sum: number; n: number }> = {};
    readings
      .filter((r) => r.t >= cutoff)
      .forEach((r) => {
        if (!m[r.hole]) m[r.hole] = { sum: 0, n: 0 };
        m[r.hole]!.sum += r.value;
        m[r.hole]!.n += 1;
      });
    const out: Record<number, number> = {};
    Object.keys(m).forEach((k) => {
      const key = Number(k);
      out[key] = m[key]!.sum / m[key]!.n;
    });
    return out;
  }, [readings, cutoff]);

  const onExport = useCallback(() => {
    const inRange = readings.filter((r) => r.t >= cutoff).sort((a, b) => a.t - b.t);
    if (inRange.length === 0) return;
    const csv = readingsToCsv(inRange);
    downloadCsv(csvFilename(COURSE.name, range), csv);
  }, [readings, cutoff, range]);

  return (
    <div className="analysis">
      <div className="analysis-head">
        <div className="sub">{COURSE.name} · {COURSE.city}</div>
        <h1>Field <i>analysis</i></h1>
        <div className="range-row">
          {([1, 7, 30] as AnalysisRange[]).map((d) => (
            <button key={d} className={range === d ? 'sel' : ''} onClick={() => setRange(d)}>
              {d === 1 ? '24h' : d + 'd'}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button className="export-btn" onClick={onExport} disabled={readings.length === 0}>
            ⬇ export csv
          </button>
        </div>
      </div>

      <div className="mode-toggle">
        <button className={view === 'heatmap' ? 'sel' : ''} onClick={() => setView('heatmap')}>Heatmap</button>
        <button className={view === 'trends' ? 'sel' : ''} onClick={() => setView('trends')}>Trends</button>
        <button className={view === 'table' ? 'sel' : ''} onClick={() => setView('table')}>Readings</button>
      </div>

      {view === 'heatmap' && (
        <div className="analysis-grid">
          <div className="heatmap-wrap">
            <div className="hm-head">
              <span className="t">Course moisture · last {range === 1 ? '24h' : range + ' days'}</span>
              <span className="s">Tap a green</span>
            </div>
            <CourseHeatmap
              readings={readings}
              range={range}
              selectedHole={selectedHole}
              onSelectHole={onSelectHole}
            />
            <div className="legend">
              <span>4%</span>
              <div className="bar" />
              <span>34%</span>
            </div>
          </div>

          <div className="hole-detail">
            <div className="hd-head">
              <div className="l">
                <div className="lbl">Hole {selectedHole} · Par {holeMeta.par} · {holeMeta.yds}y</div>
                <h2>Green <i>{selectedHole}</i></h2>
                {stats && (
                  <div className="last-cap">
                    <span className="cs-auto-dot" style={{ animation: 'none', background: 'var(--good)' }} />
                    Last captured · <b>{fmtTime(stats.lastT)}</b>
                  </div>
                )}
              </div>
              {stats && (
                <div className="r">
                  <div className="v">{stats.avg.toFixed(1)}<small>%</small></div>
                  <div className={`delta ${stats.delta > 0.5 ? 'up' : stats.delta < -0.5 ? 'down' : 'flat'}`}>
                    {stats.delta > 0 ? '↑' : stats.delta < 0 ? '↓' : '·'} {Math.abs(stats.delta).toFixed(1)} pts
                  </div>
                </div>
              )}
            </div>
            <div className="legend-chips">
              <span><span className="dot-moss" />Before water</span>
              <span><span className="dot-info" />After water</span>
            </div>
            <TrendChart readings={readings} hole={selectedHole} range={range} />
            {stats && (
              <div className="stat-row">
                <div className="s">
                  <div className="k">Avg before</div>
                  <div className="v">{stats.avgBefore != null ? stats.avgBefore.toFixed(1) : '—'}<small>%</small></div>
                </div>
                <div className="s">
                  <div className="k">Avg after</div>
                  <div className="v">{stats.avgAfter != null ? stats.avgAfter.toFixed(1) : '—'}<small>%</small></div>
                </div>
                <div className="s">
                  <div className="k">Lift</div>
                  <div className="v">{stats.lift != null ? '+' + stats.lift.toFixed(1) : '—'}<small>pts</small></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'trends' && (
        <div className="trends-grid">
          {COURSE.holes.map((h) => {
            const v = avgByHole[h.n];
            const critical = v != null && (v < 12 || v > 26);
            return (
              <div
                key={h.n}
                className="hole-detail trend-card"
                onClick={() => { onSelectHole(h.n); setView('heatmap'); }}
              >
                <div className="hd-head" style={{ alignItems: 'center', marginBottom: 4 }}>
                  <div className="l">
                    <div className="lbl">Hole {h.n} · Par {h.par}</div>
                    <h2 style={{ fontSize: 22 }}>Green <i>{h.n}</i></h2>
                  </div>
                  <div className="r">
                    <div className="v" style={{ fontSize: 22 }}>
                      {v != null ? v.toFixed(1) : '—'}<small>%</small>
                    </div>
                    {critical && <div className="delta down" style={{ fontSize: 9 }}>⚠ ATTN</div>}
                  </div>
                </div>
                <TrendChart readings={readings} hole={h.n} range={range} />
              </div>
            );
          })}
        </div>
      )}

      {view === 'table' && (
        <div className="table-wrap">
          <div className="hole-strip" style={{ padding: '0 0 8px', overflowX: 'auto' }}>
            {COURSE.holes.map((h) => {
              const v = avgByHole[h.n];
              return (
                <button
                  key={h.n}
                  className={selectedHole === h.n ? 'sel' : ''}
                  onClick={() => onSelectHole(h.n)}
                >
                  {h.n}
                  <span className="dot" style={{ background: v != null ? moistureColor(v) : 'var(--bone-3)' }} />
                </button>
              );
            })}
          </div>
          <h3>
            Hole {selectedHole} readings
            <small>{tableRows.length} entries</small>
          </h3>
          {tableRows.length === 0 && (
            <div className="empty-state">No readings in range</div>
          )}
          {tableRows.map((r, i) => (
            <div className="t-row" key={i}>
              <div className="h">#{r.hole}</div>
              <div className="info">
                <b>{fmtTimeShort(r.t)} · {fmtTime(r.t)}</b>
                <span className={'phase-pill ' + (r.phase || 'before')} style={{ marginRight: 6 }}>
                  {r.phase === 'after' ? '◆ after' : '● before'}
                </span>
                {r.lat.toFixed(5)}, {Math.abs(r.lon).toFixed(5)} · {r.pos} · {r.tech}
              </div>
              <div className="v">
                {r.value.toFixed(1)}
                <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', marginLeft: 1 }}>%</span>
              </div>
              <div className="sw" style={{ background: moistureColor(r.value) }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
