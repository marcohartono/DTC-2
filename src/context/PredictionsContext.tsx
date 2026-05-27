import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { VwcPrediction } from '../types';
import { supabase } from '../lib/supabase';
import { useCourse } from './CourseContext';

interface PredictionRow {
  hole: number;
  t_target: string;
  predicted_vwc: number | string | null;
}

interface PredictionsContextValue {
  predictions: VwcPrediction[];
  refresh: () => Promise<void>;
  ready: boolean;
}

function rowToPrediction(row: PredictionRow): VwcPrediction {
  return {
    hole: row.hole,
    tTarget: new Date(row.t_target).getTime(),
    value: row.predicted_vwc == null ? 0 : Number(row.predicted_vwc),
  };
}

const PredictionsContext = createContext<PredictionsContextValue | null>(null);

export function PredictionsProvider({ children }: { children: ReactNode }) {
  const { courseId, ready: courseReady } = useCourse();
  const [predictions, setPredictions] = useState<VwcPrediction[]>([]);
  const [ready, setReady] = useState(false);

  const fetchPredictions = useCallback(async () => {
    if (!courseId) return;
    const { data, error } = await supabase
      .from('vwc_predictions')
      .select('hole, t_target, predicted_vwc')
      .eq('course_id', courseId)
      .order('t_target', { ascending: true });
    // Predictions are an enhancement layer — a failed/empty fetch just leaves
    // the heatmap on measured data, so swallow the error rather than toasting.
    if (!error && data) setPredictions((data as PredictionRow[]).map(rowToPrediction));
  }, [courseId]);

  useEffect(() => {
    if (!courseReady || !courseId) return;
    let alive = true;
    (async () => {
      await fetchPredictions();
      if (alive) setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [courseId, courseReady, fetchPredictions]);

  const value = useMemo<PredictionsContextValue>(
    () => ({ predictions, refresh: fetchPredictions, ready }),
    [predictions, fetchPredictions, ready],
  );

  return <PredictionsContext.Provider value={value}>{children}</PredictionsContext.Provider>;
}

export function usePredictions(): PredictionsContextValue {
  const ctx = useContext(PredictionsContext);
  if (!ctx) throw new Error('usePredictions must be used inside PredictionsProvider');
  return ctx;
}
