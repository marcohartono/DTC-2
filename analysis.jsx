// ───────── Analysis screen ─────────
const { useState: useState_a, useMemo, useEffect: useEffect_a } = React;

function CourseHeatmap({ readings, range, selectedHole, onSelectHole }) {
  const cutoff = Date.now() - range * 86400000;
  const recent = readings.filter(r => r.t >= cutoff);

  // average per hole
  const avgByHole = {};
  recent.forEach(r => {
    if (!avgByHole[r.hole]) avgByHole[r.hole] = { sum: 0, n: 0 };
    avgByHole[r.hole].sum += r.value;
    avgByHole[r.hole].n += 1;
  });

  const W = window.COURSE.w, H = window.COURSE.h;

  return (
    <svg className="heatmap-svg" viewBox={`0 0 ${W} ${H}`}>
      <defs>
        <pattern id="turfgrid" width="14" height="14" patternUnits="userSpaceOnUse">
          <path d="M0 14 L14 14 M14 0 L14 14" stroke="rgba(243,237,224,0.04)" strokeWidth="0.5" fill="none"/>
        </pattern>
        <radialGradient id="haloGrad">
          <stop offset="0%" stopColor="white" stopOpacity="0.6"/>
          <stop offset="100%" stopColor="white" stopOpacity="0"/>
        </radialGradient>
      </defs>

      {/* base turf */}
      <rect width={W} height={H} fill="#1f2f24"/>
      <rect width={W} height={H} fill="url(#turfgrid)"/>

      {/* fairway loops connecting tees → greens → next tee */}
      <g stroke="rgba(243,237,224,0.12)" strokeWidth="14" fill="none" strokeLinecap="round">
        {window.COURSE.holes.map(h => (
          <line key={`f-${h.n}`} x1={h.tx} y1={h.ty} x2={h.gx} y2={h.gy} />
        ))}
      </g>
      <g stroke="rgba(243,237,224,0.05)" strokeWidth="2" strokeDasharray="2 4" fill="none">
        {window.COURSE.holes.map((h, i) => {
          const next = window.COURSE.holes[i+1];
          if (!next) return null;
          return <line key={`p-${h.n}`} x1={h.gx} y1={h.gy} x2={next.tx} y2={next.ty} />;
        })}
      </g>

      {/* tee boxes */}
      {window.COURSE.holes.map(h => (
        <rect key={`t-${h.n}`} x={h.tx-2.5} y={h.ty-2.5} width="5" height="5"
              fill="rgba(243,237,224,0.25)" rx="1"/>
      ))}

      {/* greens (heat) */}
      {window.COURSE.holes.map(h => {
        const a = avgByHole[h.n];
        const v = a ? a.sum / a.n : null;
        const color = v != null ? window.moistureColor(v) : 'rgba(243,237,224,0.18)';
        const isSel = h.n === selectedHole;
        const isCritical = v != null && (v < 12 || v > 26);
        return (
          <g key={`g-${h.n}`} style={{ cursor: 'pointer' }} onClick={() => onSelectHole(h.n)}>
            {isSel && (
              <circle cx={h.gx} cy={h.gy} r="20" fill="url(#haloGrad)" opacity="0.6"/>
            )}
            {isCritical && !isSel && (
              <circle cx={h.gx} cy={h.gy} r="14" fill="none"
                      stroke={color} strokeWidth="1" opacity="0.5">
                <animate attributeName="r" values="11;18;11" dur="2.4s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.6;0;0.6" dur="2.4s" repeatCount="indefinite"/>
              </circle>
            )}
            <circle cx={h.gx} cy={h.gy} r={isSel ? 11 : 9} fill={color}
                    stroke={isSel ? "#f3ede0" : "rgba(0,0,0,0.2)"}
                    strokeWidth={isSel ? 1.5 : 0.5}/>
            <text x={h.gx} y={h.gy + 3} textAnchor="middle"
                  fontFamily="var(--mono)" fontSize="9"
                  fill={v != null ? "rgba(0,0,0,0.55)" : "rgba(243,237,224,0.55)"}
                  fontWeight="600">
              {h.n}
            </text>
            {v != null && isSel && (
              <text x={h.gx} y={h.gy - 16} textAnchor="middle"
                    fontFamily="var(--mono)" fontSize="9"
                    fill="#f3ede0" letterSpacing="0.04em">
                {v.toFixed(1)}%
              </text>
            )}
          </g>
        );
      })}

      {/* clubhouse marker */}
      <g transform={`translate(${W-44}, ${H-30})`}>
        <rect x="-1" y="-1" width="22" height="14" fill="rgba(243,237,224,0.08)" rx="2"/>
        <text x="10" y="9" textAnchor="middle" fontFamily="var(--mono)" fontSize="7"
              fill="rgba(243,237,224,0.6)" letterSpacing="0.1em">CLBHS</text>
      </g>

      {/* compass */}
      <g transform="translate(24, 28)">
        <circle r="9" fill="none" stroke="rgba(243,237,224,0.25)" strokeWidth="0.5"/>
        <text x="0" y="-11" textAnchor="middle" fontFamily="var(--mono)" fontSize="8"
              fill="rgba(243,237,224,0.6)">N</text>
        <line x1="0" y1="-7" x2="0" y2="7" stroke="rgba(243,237,224,0.4)" strokeWidth="0.5"/>
        <polygon points="0,-7 -2,-3 2,-3" fill="#c2632d"/>
      </g>
    </svg>
  );
}

function TrendChart({ readings, hole, range }) {
  const cutoff = Date.now() - range * 86400000;
  const data = readings
    .filter(r => r.hole === hole && r.t >= cutoff)
    .sort((a,b) => a.t - b.t);

  const W = 320, H = 130;
  const padL = 24, padR = 12, padT = 12, padB = 22;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  if (data.length < 2) {
    return (
      <svg className="trend-chart" viewBox={`0 0 ${W} ${H}`}>
        <text x={W/2} y={H/2} textAnchor="middle" fontFamily="var(--mono)" fontSize="10"
              fill="var(--muted)" letterSpacing="0.06em">NOT ENOUGH DATA</text>
      </svg>
    );
  }

  const tMin = cutoff;
  const tMax = Date.now();
  const yMin = 6, yMax = 32;

  const x = t => padL + ((t - tMin) / (tMax - tMin)) * innerW;
  const y = v => padT + (1 - (v - yMin) / (yMax - yMin)) * innerH;

  // path
  let d = "";
  data.forEach((r, i) => {
    d += (i === 0 ? "M" : "L") + x(r.t).toFixed(1) + "," + y(r.value).toFixed(1) + " ";
  });

  // optimal band 14–22
  const band1 = y(22), band2 = y(14);

  // y-axis ticks
  const yTicks = [10, 17, 25];
  // x-axis ticks (days)
  const xTicks = [];
  for (let i = 0; i <= range; i++) {
    const t = tMin + i * 86400000;
    xTicks.push(t);
  }

  return (
    <svg className="trend-chart" viewBox={`0 0 ${W} ${H}`}>
      {/* optimal band */}
      <rect x={padL} y={band1} width={innerW} height={band2 - band1}
            fill="#6b8a3a" opacity="0.08"/>
      <line x1={padL} y1={band1} x2={W-padR} y2={band1} stroke="#6b8a3a" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.4"/>
      <line x1={padL} y1={band2} x2={W-padR} y2={band2} stroke="#6b8a3a" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.4"/>

      {/* y grid */}
      {yTicks.map(t => (
        <g key={t}>
          <line x1={padL} y1={y(t)} x2={W-padR} y2={y(t)}
                stroke="var(--bone-3)" strokeWidth="0.5"/>
          <text x={padL - 4} y={y(t)+3} textAnchor="end"
                fontFamily="var(--mono)" fontSize="8" fill="var(--muted)">{t}</text>
        </g>
      ))}

      {/* x labels */}
      {xTicks.map((t, i) => {
        if (range > 7 && i % 2 !== 0) return null;
        const d = new Date(t);
        return (
          <text key={i} x={x(t)} y={H - 6} textAnchor="middle"
                fontFamily="var(--mono)" fontSize="8" fill="var(--muted)" letterSpacing="0.04em">
            {d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase().slice(0,2)}
          </text>
        );
      })}

      {/* line */}
      <path d={d} fill="none" stroke="var(--moss)" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round"/>

      {/* points - differentiate phase */}
      {data.map((r, i) => {
        const isAfter = r.phase === 'after';
        const cx = x(r.t), cy = y(r.value);
        if (isAfter) {
          return (
            <g key={i}>
              <rect x={cx-3} y={cy-3} width="6" height="6"
                    fill={window.moistureColor(r.value)}
                    stroke="var(--paper)" strokeWidth="1"
                    transform={`rotate(45, ${cx}, ${cy})`}/>
            </g>
          );
        }
        return (
          <circle key={i} cx={cx} cy={cy} r="2.6"
                  fill={window.moistureColor(r.value)}
                  stroke="var(--paper)" strokeWidth="1"/>
        );
      })}

      {/* last point emphasis */}
      <circle cx={x(data[data.length-1].t)} cy={y(data[data.length-1].value)} r="3.5"
              fill="none" stroke="var(--moss)" strokeWidth="1"/>
    </svg>
  );
}

function AnalysisScreen({ readings }) {
  const [selectedHole, setSelectedHole] = useState_a(7);
  const [range, setRange] = useState_a(7); // days
  const [view, setView] = useState_a('heatmap'); // heatmap | trends | table

  const stats = useMemo(() => {
    const cutoff = Date.now() - range * 86400000;
    const data = readings.filter(r => r.hole === selectedHole && r.t >= cutoff);
    if (data.length === 0) return null;
    const sorted = [...data].sort((a,b) => a.t - b.t);
    const vals = data.map(d => d.value);
    const avg = vals.reduce((a,b) => a+b, 0) / vals.length;
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const last = sorted[sorted.length - 1].value;
    const first = sorted[0].value;
    const delta = last - first;
    const before = data.filter(d => d.phase === 'before');
    const after = data.filter(d => d.phase === 'after');
    const avgBefore = before.length ? before.reduce((a,b)=>a+b.value,0)/before.length : null;
    const avgAfter  = after.length  ? after.reduce((a,b)=>a+b.value,0)/after.length  : null;
    const lift = (avgBefore != null && avgAfter != null) ? avgAfter - avgBefore : null;
    return { avg, min, max, last, delta, count: data.length, lastT: sorted[sorted.length - 1].t,
             avgBefore, avgAfter, lift };
  }, [readings, selectedHole, range]);

  const cutoff = Date.now() - range * 86400000;
  const tableRows = useMemo(() =>
    readings
      .filter(r => r.hole === selectedHole && r.t >= cutoff)
      .sort((a,b) => b.t - a.t)
      .slice(0, 8)
  , [readings, selectedHole, range]);

  const holeMeta = window.COURSE.holes[selectedHole - 1];

  // per-hole average for the strip
  const avgByHole = useMemo(() => {
    const m = {};
    readings.filter(r => r.t >= cutoff).forEach(r => {
      if (!m[r.hole]) m[r.hole] = { sum: 0, n: 0 };
      m[r.hole].sum += r.value;
      m[r.hole].n += 1;
    });
    const out = {};
    Object.keys(m).forEach(k => { out[k] = m[k].sum / m[k].n; });
    return out;
  }, [readings, range]);

  return (
    <div>
      <div className="analysis-head">
        <div className="sub">{window.COURSE.name} · {window.COURSE.city}</div>
        <h1>Field <i>analysis</i></h1>
        <div className="range-row">
          {[1, 7, 30].map(d => (
            <button key={d} className={range === d ? "sel" : ""} onClick={() => setRange(d)}>
              {d === 1 ? '24h' : d + 'd'}
            </button>
          ))}
          <div style={{ flex: 1 }}></div>
          <button style={{ borderColor: 'transparent', color: 'var(--muted)' }}>
            ⬇ export csv
          </button>
        </div>
      </div>

      <div className="mode-toggle">
        <button className={view === 'heatmap' ? "sel" : ""} onClick={() => setView('heatmap')}>Heatmap</button>
        <button className={view === 'trends' ? "sel" : ""} onClick={() => setView('trends')}>Trends</button>
        <button className={view === 'table' ? "sel" : ""} onClick={() => setView('table')}>Readings</button>
      </div>

      {view === 'heatmap' && (
        <>
          <div className="heatmap-wrap">
            <div className="hm-head">
              <span className="t">Course moisture · last {range === 1 ? '24h' : range + ' days'}</span>
              <span className="s">Tap a green</span>
            </div>
            <CourseHeatmap readings={readings} range={range}
              selectedHole={selectedHole} onSelectHole={setSelectedHole} />
            <div className="legend">
              <span>4%</span>
              <div className="bar"></div>
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
                    <span className="cs-auto-dot" style={{ animation: 'none', background: 'var(--good)' }}></span>
                    Last captured · <b>{window.fmtTime(stats.lastT)}</b>
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
            <div style={{ display: 'flex', gap: 14, marginTop: 6, fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--moss)' }}></span>
                Before water
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 7, height: 7, background: 'var(--info)', transform: 'rotate(45deg)' }}></span>
                After water
              </span>
            </div>
            <TrendChart readings={readings} hole={selectedHole} range={range} />
            {stats && (
              <div className="stat-row">
                <div className="s"><div className="k">Avg before</div><div className="v">{stats.avgBefore != null ? stats.avgBefore.toFixed(1) : '—'}<small>%</small></div></div>
                <div className="s"><div className="k">Avg after</div><div className="v">{stats.avgAfter != null ? stats.avgAfter.toFixed(1) : '—'}<small>%</small></div></div>
                <div className="s"><div className="k">Lift</div><div className="v">{stats.lift != null ? '+' + stats.lift.toFixed(1) : '—'}<small>pts</small></div></div>
              </div>
            )}
          </div>
        </>
      )}

      {view === 'trends' && (
        <div style={{ padding: '0 20px' }}>
          {window.COURSE.holes.map(h => {
            const v = avgByHole[h.n];
            const isCritical = v != null && (v < 12 || v > 26);
            return (
              <div key={h.n} className="hole-detail" style={{ margin: '12px 0 0', padding: '12px 14px' }}
                   onClick={() => { setSelectedHole(h.n); setView('heatmap'); }}>
                <div className="hd-head" style={{ alignItems: 'center', marginBottom: 4 }}>
                  <div className="l">
                    <div className="lbl">Hole {h.n} · Par {h.par}</div>
                    <h2 style={{ fontSize: 22 }}>Green <i>{h.n}</i></h2>
                  </div>
                  <div className="r">
                    <div className="v" style={{ fontSize: 22 }}>
                      {v != null ? v.toFixed(1) : '—'}<small>%</small>
                    </div>
                    {isCritical && (
                      <div className="delta down" style={{ fontSize: 9 }}>⚠ ATTN</div>
                    )}
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
            {window.COURSE.holes.map(h => {
              const v = avgByHole[h.n];
              return (
                <button key={h.n}
                  className={selectedHole === h.n ? "sel" : ""}
                  onClick={() => setSelectedHole(h.n)}>
                  {h.n}
                  <span className="dot" style={{ background: v != null ? window.moistureColor(v) : 'var(--bone-3)' }}></span>
                </button>
              );
            })}
          </div>
          <h3>
            Hole {selectedHole} readings
            <small>{tableRows.length} entries</small>
          </h3>
          {tableRows.length === 0 && (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--muted)',
                          fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              No readings in range
            </div>
          )}
          {tableRows.map((r, i) => (
            <div className="t-row" key={i}>
              <div className="h">#{r.hole}</div>
              <div className="info">
                <b>{window.fmtTimeShort(r.t)} · {window.fmtTime(r.t)}</b>
                <span className={"phase-pill " + (r.phase || 'before')} style={{ marginRight: 6 }}>
                  {r.phase === 'after' ? '◆ after' : '● before'}
                </span>
                {r.lat.toFixed(5)}, {Math.abs(r.lon).toFixed(5)} · {r.pos} · {r.tech}
              </div>
              <div className="v">{r.value.toFixed(1)}<span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', marginLeft: 1 }}>%</span></div>
              <div className="sw" style={{ background: window.moistureColor(r.value) }}></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

window.AnalysisScreen = AnalysisScreen;
