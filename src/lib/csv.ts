import type { Reading } from '../types';
import { COURSE } from './mockData';

const COLUMNS = [
  'timestamp_iso',
  'hole',
  'par',
  'value_vwc',
  'phase',
  'position',
  'tech',
  'lat',
  'lon',
] as const;

function escapeCell(v: string | number): string {
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function readingsToCsv(readings: Reading[]): string {
  const lines: string[] = [COLUMNS.join(',')];
  for (const r of readings) {
    const par = COURSE.holes[r.hole - 1]?.par ?? '';
    lines.push(
      [
        new Date(r.t).toISOString(),
        r.hole,
        par,
        r.value.toFixed(1),
        r.phase,
        r.pos,
        r.tech,
        r.lat.toFixed(6),
        r.lon.toFixed(6),
      ].map(escapeCell).join(','),
    );
  }
  return lines.join('\n');
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function csvFilename(courseName: string, range: number): string {
  const slug = courseName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const today = new Date().toISOString().slice(0, 10);
  const rangeLabel = range === 1 ? '24h' : range + 'd';
  return `turfiq_${slug}_${rangeLabel}_${today}.csv`;
}
