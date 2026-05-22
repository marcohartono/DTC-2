import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '../lib/supabase';
import { EMPTY_FC, type HoleFeatureCollection } from '../lib/geofence';

// Singleton course for the MVP (matches the seed in migration 0001). Used as a
// fallback id if the select ever races; the row is always present.
const FALLBACK_COURSE_ID = '00000000-0000-0000-0000-0000000c0001';

interface CourseContextValue {
  courseId: string | null;
  geofences: HoleFeatureCollection;
  saveGeofences: (fc: HoleFeatureCollection) => Promise<void>;
  ready: boolean;
  error: string | null;
}

const CourseContext = createContext<CourseContextValue | null>(null);

export function CourseProvider({ children }: { children: ReactNode }) {
  const [courseId, setCourseId] = useState<string | null>(null);
  const [geofences, setGeofences] = useState<HoleFeatureCollection>(EMPTY_FC);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, geojson_holes')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!alive) return;
      if (error) {
        setError(error.message);
        setCourseId(FALLBACK_COURSE_ID);
      } else if (data) {
        setCourseId(data.id);
        const fc = data.geojson_holes as HoleFeatureCollection | null;
        if (fc?.type === 'FeatureCollection') setGeofences(fc);
      } else {
        setCourseId(FALLBACK_COURSE_ID);
      }
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const saveGeofences = useCallback(
    async (fc: HoleFeatureCollection) => {
      if (!courseId) throw new Error('No course loaded');
      const { error } = await supabase
        .from('courses')
        .update({ geojson_holes: fc })
        .eq('id', courseId);
      if (error) throw new Error(error.message);
      setGeofences(fc);
    },
    [courseId],
  );

  const value = useMemo<CourseContextValue>(
    () => ({ courseId, geofences, saveGeofences, ready, error }),
    [courseId, geofences, saveGeofences, ready, error],
  );

  return <CourseContext.Provider value={value}>{children}</CourseContext.Provider>;
}

export function useCourse(): CourseContextValue {
  const ctx = useContext(CourseContext);
  if (!ctx) throw new Error('useCourse must be used inside CourseProvider');
  return ctx;
}
