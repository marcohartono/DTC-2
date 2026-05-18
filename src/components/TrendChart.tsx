import type { Reading } from '../types';
import { moistureColor } from '../lib/moisture';

interface Props {
  readings: Reading[];
  hole: number;
  range: number;
}

export function TrendChart({ readings, hole, range }: Props) {
  const cutoff = Date.now() - range * 86_400_000;
  const data = readings
    .filter((r) => r.hole === hole && r.t >= cutoff)
    .sort((a, b) => a.t - b.t);

  const W = 320;
  const H = 130;
  const padL = 24;
  const padR = 12;
  const padT = 12;
  const padB = 22;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  if (data.length < 2) {
    return (
      <svg className="trend-chart" viewBox={`0 0 ${W} ${H}`}>
        <text
          x={W / 2}
          y={H / 2}
          textAnchor="middle"
          fontFamily="var(--mono)"
          fontSize="10"
          fill="var(--muted)"
          letterSpacing="0.06em"
        >
          NOT ENOUGH DATA
        </text>
      </svg>
    );
  }

  const tMin = cutoff;
  const tMax = Date.now();
  const yMin = 6;
  const yMax = 32;

  const x = (t: number) => padL + ((t - tMin) / (tMax - tMin)) * innerW;
  const y = (v: number) => padT + (1 - (v - yMin) / (yMax - yMin)) * innerH;

  let d = '';
  data.forEach((r, i) => {
    d += (i === 0 ? 'M' : 'L') + x(r.t).toFixed(1) + ',' + y(r.value).toFixed(1) + ' ';
  });

  const band1 = y(22);
  const band2 = y(14);

  const yTicks = [10, 17, 25];
  const xTicks: number[] = [];
  for (let i = 0; i <= range; i++) xTicks.push(tMin + i * 86_400_000);

  const last = data[data.length - 1]!;

  return (
    <svg className="trend-chart" viewBox={`0 0 ${W} ${H}`}>
      <rect x={padL} y={band1} width={innerW} height={band2 - band1} fill="#6b8a3a" opacity="0.08" />
      <line x1={padL} y1={band1} x2={W - padR} y2={band1} stroke="#6b8a3a" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.4" />
      <line x1={padL} y1={band2} x2={W - padR} y2={band2} stroke="#6b8a3a" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.4" />

      {yTicks.map((t) => (
        <g key={t}>
          <line x1={padL} y1={y(t)} x2={W - padR} y2={y(t)} stroke="var(--bone-3)" strokeWidth="0.5" />
          <text x={padL - 4} y={y(t) + 3} textAnchor="end" fontFamily="var(--mono)" fontSize="8" fill="var(--muted)">
            {t}
          </text>
        </g>
      ))}

      {xTicks.map((t, i) => {
        if (range > 7 && i % 2 !== 0) return null;
        const dt = new Date(t);
        return (
          <text
            key={i}
            x={x(t)}
            y={H - 6}
            textAnchor="middle"
            fontFamily="var(--mono)"
            fontSize="8"
            fill="var(--muted)"
            letterSpacing="0.04em"
          >
            {dt.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase().slice(0, 2)}
          </text>
        );
      })}

      <path d={d} fill="none" stroke="var(--moss)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

      {data.map((r, i) => {
        const cx = x(r.t);
        const cy = y(r.value);
        if (r.phase === 'after') {
          return (
            <rect
              key={i}
              x={cx - 3}
              y={cy - 3}
              width="6"
              height="6"
              fill={moistureColor(r.value)}
              stroke="var(--paper)"
              strokeWidth="1"
              transform={`rotate(45, ${cx}, ${cy})`}
            />
          );
        }
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r="2.6"
            fill={moistureColor(r.value)}
            stroke="var(--paper)"
            strokeWidth="1"
          />
        );
      })}

      <circle cx={x(last.t)} cy={y(last.value)} r="3.5" fill="none" stroke="var(--moss)" strokeWidth="1" />
    </svg>
  );
}
