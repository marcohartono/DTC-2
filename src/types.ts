export type Phase = 'before' | 'after';
export type Tech = string;

export interface Reading {
  id?: string;
  hole: number;
  value: number;
  t: number;
  phase: Phase;
  tech: Tech;
  lat: number;
  lon: number;
  photo_url?: string | null;
  v?: number;
}

export interface Hole {
  n: number;
  par: 3 | 4 | 5;
  yds: number;
  gx: number;
  gy: number;
  tx: number;
  ty: number;
}

export interface Course {
  name: string;
  city: string;
  w: number;
  h: number;
  holes: Hole[];
}

export interface MoistureBand {
  name: string;
  cls: 'dry' | 'opt' | 'wet';
}

export type AnalysisView = 'heatmap' | 'trends' | 'table';
export type AnalysisRange = 1 | 7 | 30;
export type Tab = 'capture' | 'analysis' | 'history';
