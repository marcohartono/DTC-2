export type Phase = 'before' | 'after';
export type Position = 'front' | 'middle' | 'back';
export type Tech = string;

export interface Reading {
  hole: number;
  value: number;
  t: number;
  phase: Phase;
  pos: Position;
  tech: Tech;
  lat: number;
  lon: number;
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
