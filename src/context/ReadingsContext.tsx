import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Reading } from '../types';
import { makeReadings } from '../lib/mockData';
import { loadAllReadings, saveReading, seedIfEmpty, clearReadings } from '../lib/db';

interface ReadingsContextValue {
  readings: Reading[];
  addReading: (r: Reading) => Promise<void>;
  reseed: () => Promise<void>;
  ready: boolean;
}

const ReadingsContext = createContext<ReadingsContextValue | null>(null);

export function ReadingsProvider({ children }: { children: ReactNode }) {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await seedIfEmpty(makeReadings());
        const rows = await loadAllReadings();
        if (alive) setReadings(rows);
      } catch (err) {
        console.error('[ReadingsContext] hydrate failed', err);
        if (alive) setReadings(makeReadings());
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const addReading = useCallback(async (r: Reading) => {
    const withVersion: Reading = { ...r, v: r.v ?? 1 };
    setReadings((prev) => [withVersion, ...prev]);
    try {
      await saveReading(withVersion);
    } catch (err) {
      console.error('[ReadingsContext] persist failed', err);
    }
  }, []);

  const reseed = useCallback(async () => {
    await clearReadings();
    const fresh = makeReadings();
    await seedIfEmpty(fresh);
    setReadings(await loadAllReadings());
  }, []);

  const value = useMemo<ReadingsContextValue>(
    () => ({ readings, addReading, reseed, ready }),
    [readings, addReading, reseed, ready],
  );

  return <ReadingsContext.Provider value={value}>{children}</ReadingsContext.Provider>;
}

export function useReadings(): ReadingsContextValue {
  const ctx = useContext(ReadingsContext);
  if (!ctx) throw new Error('useReadings must be used inside ReadingsProvider');
  return ctx;
}
