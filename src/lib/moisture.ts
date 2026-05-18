import type { MoistureBand } from '../types';

export function moistureColor(v: number): string {
  if (v < 10) return '#b85a2a';
  if (v < 14) return '#d28b4a';
  if (v < 17) return '#b8a23a';
  if (v < 22) return '#6b8a3a';
  if (v < 25) return '#3f6b3c';
  if (v < 28) return '#2e6e7a';
  return '#1f4a6e';
}

export function moistureBand(v: number): MoistureBand {
  if (v < 10) return { name: 'Critical dry', cls: 'dry' };
  if (v < 14) return { name: 'Dry', cls: 'dry' };
  if (v < 17) return { name: 'Optimal–low', cls: 'opt' };
  if (v < 22) return { name: 'Optimal', cls: 'opt' };
  if (v < 25) return { name: 'Optimal–high', cls: 'opt' };
  if (v < 28) return { name: 'Saturated', cls: 'wet' };
  return { name: 'Critical wet', cls: 'wet' };
}

export function isCritical(v: number): boolean {
  return v < 12 || v > 26;
}
