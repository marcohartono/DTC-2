import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Reading } from '../types';
import { makeReadings } from '../lib/mockData';

interface ReadingsContextValue {
  readings: Reading[];
  addReading: (r: Reading) => void;
}

const ReadingsContext = createContext<ReadingsContextValue | null>(null);

export function ReadingsProvider({ children }: { children: ReactNode }) {
  const [readings, setReadings] = useState<Reading[]>(() => makeReadings());

  const value = useMemo<ReadingsContextValue>(
    () => ({
      readings,
      addReading: (r) => setReadings((prev) => [r, ...prev]),
    }),
    [readings],
  );

  return <ReadingsContext.Provider value={value}>{children}</ReadingsContext.Provider>;
}

export function useReadings(): ReadingsContextValue {
  const ctx = useContext(ReadingsContext);
  if (!ctx) throw new Error('useReadings must be used inside ReadingsProvider');
  return ctx;
}
