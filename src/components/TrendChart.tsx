import type { Reading } from '../types';
import { moistureColor } from '../lib/moisture';

interface Props {
  readings: Reading[];
  hole: number;
  range: number;
  predictions?: { tTarget: number; value: number }[];
}

export function TrendChart({ readings, hole, range, predictions = [] }: Props) {
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

  const now = Date.now();
  const fc = predictions
    .filter((p) => p.tTarget > now)
    .sort((a, b) => a.tTarget - b.tTarget);
  const hasForecast = data.length >= 2 && fc.length > 0;

  const tMin = cutoff;
  const tMax = hasForecast ? Math.max(now, fc[fc.length - 1]!.tTarget) : now;
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

  // Dashed forecast: continue from the last measured point through the
  // predicted values (§4.5). Built only when there's a forecast to show.
  let fd = '';
  if (hasForecast) {
    fd = 'M' + x(last.t).toFixed(1) + ',' + y(last.value).toFixed(1) + ' ';
    fc.forEach((p) => {
      fd += 'L' + x(p.tTarget).toFixed(1) + ',' + y(p.value).toFixed(1) + ' ';
    });
  }

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

      {hasForecast && (
        <>
          <line
            x1={x(now)}
            y1={padT}
            x2={x(now)}
            y2={H - padB}
            stroke="var(--bone-3)"
            strokeWidth="0.75"
            strokeDasharray="2 3"
          />
          <path
            d={fd}
            fill="none"
            stroke="var(--ink-2)"
            strokeWidth="1.25"
            strokeDasharray="3 3"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.7"
          />
          {fc.map((p, i) => (
            <circle
              key={`fc-${i}`}
              cx={x(p.tTarget)}
              cy={y(p.value)}
              r="2.4"
              fill="var(--paper)"
              stroke="var(--ink-2)"
              strokeWidth="1"
              opacity="0.85"
            />
          ))}
        </>
      )}
    </svg>
  );
}
