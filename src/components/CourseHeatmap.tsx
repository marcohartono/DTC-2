import type { Reading } from '../types';
import { COURSE } from '../lib/mockData';
import { moistureColor } from '../lib/moisture';

interface Props {
  readings: Reading[];
  range: number;
  selectedHole: number;
  onSelectHole: (hole: number) => void;
}

export function CourseHeatmap({ readings, range, selectedHole, onSelectHole }: Props) {
  const cutoff = Date.now() - range * 86_400_000;
  const recent = readings.filter((r) => r.t >= cutoff);

  const avgByHole: Record<number, { sum: number; n: number }> = {};
  recent.forEach((r) => {
    if (!avgByHole[r.hole]) avgByHole[r.hole] = { sum: 0, n: 0 };
    avgByHole[r.hole]!.sum += r.value;
    avgByHole[r.hole]!.n += 1;
  });

  const W = COURSE.w;
  const H = COURSE.h;

  return (
    <svg className="heatmap-svg" viewBox={`0 0 ${W} ${H}`}>
      <defs>
        <pattern id="turfgrid" width="14" height="14" patternUnits="userSpaceOnUse">
          <path d="M0 14 L14 14 M14 0 L14 14" stroke="rgba(243,237,224,0.04)" strokeWidth="0.5" fill="none" />
        </pattern>
        <radialGradient id="haloGrad">
          <stop offset="0%" stopColor="white" stopOpacity="0.6" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width={W} height={H} fill="#1f2f24" />
      <rect width={W} height={H} fill="url(#turfgrid)" />

      <g stroke="rgba(243,237,224,0.12)" strokeWidth="14" fill="none" strokeLinecap="round">
        {COURSE.holes.map((h) => (
          <line key={`f-${h.n}`} x1={h.tx} y1={h.ty} x2={h.gx} y2={h.gy} />
        ))}
      </g>
      <g stroke="rgba(243,237,224,0.05)" strokeWidth="2" strokeDasharray="2 4" fill="none">
        {COURSE.holes.map((h, i) => {
          const next = COURSE.holes[i + 1];
          if (!next) return null;
          return <line key={`p-${h.n}`} x1={h.gx} y1={h.gy} x2={next.tx} y2={next.ty} />;
        })}
      </g>

      {COURSE.holes.map((h) => (
        <rect
          key={`t-${h.n}`}
          x={h.tx - 2.5}
          y={h.ty - 2.5}
          width="5"
          height="5"
          fill="rgba(243,237,224,0.25)"
          rx="1"
        />
      ))}

      {COURSE.holes.map((h) => {
        const a = avgByHole[h.n];
        const v = a ? a.sum / a.n : null;
        const c = v != null ? moistureColor(v) : 'rgba(243,237,224,0.18)';
        const isSel = h.n === selectedHole;
        const critical = v != null && (v < 12 || v > 26);
        return (
          <g key={`g-${h.n}`} style={{ cursor: 'pointer' }} onClick={() => onSelectHole(h.n)}>
            {isSel && <circle cx={h.gx} cy={h.gy} r="20" fill="url(#haloGrad)" opacity="0.6" />}
            {critical && !isSel && (
              <circle cx={h.gx} cy={h.gy} r="14" fill="none" stroke={c} strokeWidth="1" opacity="0.5">
                <animate attributeName="r" values="11;18;11" dur="2.4s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.6;0;0.6" dur="2.4s" repeatCount="indefinite" />
              </circle>
            )}
            <circle
              cx={h.gx}
              cy={h.gy}
              r={isSel ? 11 : 9}
              fill={c}
              stroke={isSel ? '#f3ede0' : 'rgba(0,0,0,0.2)'}
              strokeWidth={isSel ? 1.5 : 0.5}
            />
            <text
              x={h.gx}
              y={h.gy + 3}
              textAnchor="middle"
              fontFamily="var(--mono)"
              fontSize="9"
              fill={v != null ? 'rgba(0,0,0,0.55)' : 'rgba(243,237,224,0.55)'}
              fontWeight="600"
            >
              {h.n}
            </text>
            {v != null && isSel && (
              <text
                x={h.gx}
                y={h.gy - 16}
                textAnchor="middle"
                fontFamily="var(--mono)"
                fontSize="9"
                fill="#f3ede0"
                letterSpacing="0.04em"
              >
                {v.toFixed(1)}%
              </text>
            )}
          </g>
        );
      })}

      <g transform={`translate(${W - 44}, ${H - 30})`}>
        <rect x="-1" y="-1" width="22" height="14" fill="rgba(243,237,224,0.08)" rx="2" />
        <text
          x="10"
          y="9"
          textAnchor="middle"
          fontFamily="var(--mono)"
          fontSize="7"
          fill="rgba(243,237,224,0.6)"
          letterSpacing="0.1em"
        >
          WGC
        </text>
      </g>

      <g transform="translate(24, 28)">
        <circle r="9" fill="none" stroke="rgba(243,237,224,0.25)" strokeWidth="0.5" />
        <text x="0" y="-11" textAnchor="middle" fontFamily="var(--mono)" fontSize="8" fill="rgba(243,237,224,0.6)">N</text>
        <line x1="0" y1="-7" x2="0" y2="7" stroke="rgba(243,237,224,0.4)" strokeWidth="0.5" />
        <polygon points="0,-7 -2,-3 2,-3" fill="#c2632d" />
      </g>
    </svg>
  );
}
