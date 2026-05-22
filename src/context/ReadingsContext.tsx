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
import { makeReadings } from '../lib/mockData';
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

  // Demo helper: bulk-insert the generated mock dataset (Analysis/History demo).
  const loadDemoData = useCallback(async () => {
    if (!courseId) throw new Error('No course loaded');
    const rows = makeReadings().map((r) => readingToRow(r, courseId));
    const { data, error: insErr } = await supabase.from('readings').insert(rows).select();
    if (insErr) {
      setError('Could not load demo data: ' + insErr.message);
      throw insErr;
    }
    const fresh = (data as ReadingRow[]).map(rowToReading);
    for (const r of fresh) if (r.id) seenIds.current.add(r.id);
    setReadings((prev) => [...fresh, ...prev].sort((a, b) => b.t - a.t));
    return fresh.length;
  }, [courseId]);

  const clearAllReadings = useCallback(async () => {
    if (!courseId) throw new Error('No course loaded');
    const { error: delErr } = await supabase.from('readings').delete().eq('course_id', courseId);
    if (delErr) {
      setError('Could not clear readings: ' + delErr.message);
      throw delErr;
    }
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
