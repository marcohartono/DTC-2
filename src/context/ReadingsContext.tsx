import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Reading } from '../types';
import { makeReadings, type ObservedDay } from '../lib/mockData';
import { supabase } from '../lib/supabase';
import { useCourse } from './CourseContext';

interface ReadingRow {
  id: string;
  course_id: string;
  hole: number;
  vwc_value: number | string;
  phase: 'before' | 'after';
  t: string;
  lat: number | string | null;
  lon: number | string | null;
  tech: string | null;
  photo_url: string | null;
}

interface ReadingsContextValue {
  readings: Reading[];
  addReading: (r: Reading) => Promise<void>;
  loadDemoData: () => Promise<number>;
  clearAllReadings: () => Promise<void>;
  ready: boolean;
  error: string | null;
  clearError: () => void;
}

function rowToReading(row: ReadingRow): Reading {
  return {
    id: row.id,
    hole: row.hole,
    value: Number(row.vwc_value),
    t: new Date(row.t).getTime(),
    phase: row.phase,
    tech: row.tech ?? '',
    lat: row.lat == null ? 0 : Number(row.lat),
    lon: row.lon == null ? 0 : Number(row.lon),
    photo_url: row.photo_url,
  };
}

function readingToRow(r: Reading, courseId: string) {
  return {
    course_id: courseId,
    hole: r.hole,
    vwc_value: Math.round(r.value * 10) / 10,
    phase: r.phase,
    t: new Date(r.t).toISOString(),
    lat: r.lat,
    lon: r.lon,
    tech: r.tech,
    photo_url: r.photo_url ?? null,
  };
}

const ReadingsContext = createContext<ReadingsContextValue | null>(null);

export function ReadingsProvider({ children }: { children: ReactNode }) {
  const { courseId, ready: courseReady } = useCourse();
  const [readings, setReadings] = useState<Reading[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Tracks ids we've already applied so a realtime echo of our own insert
  // (or a duplicate event) doesn't double-add.
  const seenIds = useRef<Set<string>>(new Set());

  // Initial load once the course id is known.
  useEffect(() => {
    if (!courseReady || !courseId) return;
    let alive = true;
    (async () => {
      const { data, error: selErr } = await supabase
        .from('readings')
        .select('*')
        .eq('course_id', courseId)
        .order('t', { ascending: false });
      if (!alive) return;
      if (selErr) {
        setError('Could not load readings: ' + selErr.message);
      } else if (data) {
        const rows = (data as ReadingRow[]).map(rowToReading);
        seenIds.current = new Set(rows.map((r) => r.id).filter((id): id is string => !!id));
        setReadings(rows);
      }
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [courseId, courseReady]);

  // Realtime: live INSERTs from any device for this course.
  useEffect(() => {
    if (!courseId) return;
    const channel = supabase
      .channel('readings-' + courseId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'readings',
          filter: `course_id=eq.${courseId}`,
        },
        (payload) => {
          const r = rowToReading(payload.new as ReadingRow);
          if (!r.id || seenIds.current.has(r.id)) return;
          seenIds.current.add(r.id);
          setReadings((prev) => [r, ...prev].sort((a, b) => b.t - a.t));
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [courseId]);

  const addReading = useCallback(
    async (r: Reading) => {
      if (!courseId) {
        setError('No course loaded — cannot save reading.');
        throw new Error('No course loaded');
      }
      const { data, error: insErr } = await supabase
        .from('readings')
        .insert(readingToRow(r, courseId))
        .select()
        .single();
      if (insErr || !data) {
        setError('Could not save reading. Check your connection and retry.');
        throw insErr ?? new Error('insert failed');
      }
      const saved = rowToReading(data as ReadingRow);
      if (saved.id && !seenIds.current.has(saved.id)) {
        seenIds.current.add(saved.id);
        setReadings((prev) => [saved, ...prev]);
      }
    },
    [courseId],
  );

  // Demo helper. Only the past VWC readings are synthetic — all weather and the
  // prediction are LIVE: pull real Open-Meteo weather, generate demo readings
  // that are coherent with that real observed history, then run predict-vwc so
  // it forecasts off the live 7-day forecast. No scripted/hard-coded weather.
  const loadDemoData = useCallback(async () => {
    if (!courseId) throw new Error('No course loaded');

    // Clean slate.
    await supabase.from('readings').delete().eq('course_id', courseId);
    await supabase.from('vwc_predictions').delete().eq('course_id', courseId);
    await supabase.from('weather_snapshots').delete().eq('course_id', courseId);

    // 1) Pull LIVE weather — 30 days observed (to fit on) + 7-day forecast.
    const { error: pwErr } = await supabase.functions.invoke('pull-weather', {
      body: { pastDays: 30 },
    });
    if (pwErr) {
      setError('Could not fetch live weather: ' + pwErr.message);
      throw pwErr;
    }

    // 2) Read the real observed series back, aggregate to daily (mean temp, summed precip).
    const { data: wx, error: wxErr } = await supabase
      .from('weather_snapshots')
      .select('t, temp_f, precip_mm')
      .eq('course_id', courseId)
      .eq('is_forecast', false);
    if (wxErr || !wx || wx.length === 0) {
      setError('No observed weather available to build demo readings.');
      throw wxErr ?? new Error('no observed weather');
    }
    const agg = new Map<number, { tSum: number; tN: number; p: number }>();
    for (const w of wx as { t: string; temp_f: number | string | null; precip_mm: number | string | null }[]) {
      const dayIdx = Math.floor(new Date(w.t).getTime() / 86_400_000);
      const a = agg.get(dayIdx) ?? { tSum: 0, tN: 0, p: 0 };
      if (w.temp_f != null) { a.tSum += Number(w.temp_f); a.tN += 1; }
      if (w.precip_mm != null) a.p += Number(w.precip_mm);
      agg.set(dayIdx, a);
    }
    const observed: ObservedDay[] = [...agg.entries()].map(([dayIdx, a]) => ({
      dayIdx,
      tempF: a.tN ? a.tSum / a.tN : 60,
      precipMm: a.p,
    }));

    // 3) Generate demo readings driven by the real observed weather; insert in chunks.
    const rows = makeReadings(observed).map((r) => readingToRow(r, courseId));
    for (let i = 0; i < rows.length; i += 500) {
      const { error: insErr } = await supabase.from('readings').insert(rows.slice(i, i + 500));
      if (insErr) {
        setError('Could not load demo readings: ' + insErr.message);
        throw insErr;
      }
    }
    // Refresh state from the DB.
    const { data: saved } = await supabase
      .from('readings')
      .select('*')
      .eq('course_id', courseId)
      .order('t', { ascending: false });
    if (saved) {
      const mapped = (saved as ReadingRow[]).map(rowToReading);
      seenIds.current = new Set(mapped.map((r) => r.id).filter((id): id is string => !!id));
      setReadings(mapped);
    }

    // 4) Run inference LIVE on the real forecast.
    const { error: pErr } = await supabase.functions.invoke('predict-vwc');
    if (pErr) console.error('predict-vwc invoke failed:', pErr.message);

    return rows.length;
  }, [courseId]);

  const clearAllReadings = useCallback(async () => {
    if (!courseId) throw new Error('No course loaded');
    const { error: delErr } = await supabase.from('readings').delete().eq('course_id', courseId);
    if (delErr) {
      setError('Could not clear readings: ' + delErr.message);
      throw delErr;
    }
    // Tear down the §4.5 weather + prediction demo data too.
    await supabase.from('vwc_predictions').delete().eq('course_id', courseId);
    await supabase.from('weather_snapshots').delete().eq('course_id', courseId);
    seenIds.current.clear();
    setReadings([]);
  }, [courseId]);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<ReadingsContextValue>(
    () => ({ readings, addReading, loadDemoData, clearAllReadings, ready, error, clearError }),
    [readings, addReading, loadDemoData, clearAllReadings, ready, error, clearError],
  );

  return <ReadingsContext.Provider value={value}>{children}</ReadingsContext.Provider>;
}

export function useReadings(): ReadingsContextValue {
  const ctx = useContext(ReadingsContext);
  if (!ctx) throw new Error('useReadings must be used inside ReadingsProvider');
  return ctx;
}
