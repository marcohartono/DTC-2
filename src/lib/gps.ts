import { useEffect, useRef, useState } from 'react';

export interface GpsState {
  lat: number;
  lon: number;
  acc: number | null;
  source: 'real' | 'simulated' | 'pending';
  error?: string;
}

const FALLBACK: GpsState = {
  lat: 36.5547,
  lon: -121.9231,
  acc: 2.4,
  source: 'simulated',
};

export function useGps(): GpsState {
  const [state, setState] = useState<GpsState>({ ...FALLBACK, source: 'pending' });
  const watchId = useRef<number | null>(null);
  const simId = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const startSimulated = (errMsg?: string) => {
      setState((s) => ({
        ...FALLBACK,
        source: 'simulated',
        ...(errMsg ? { error: errMsg } : {}),
        lat: s.lat || FALLBACK.lat,
        lon: s.lon || FALLBACK.lon,
      }));
      if (simId.current) return;
      simId.current = setInterval(() => {
        setState((c) => ({
          ...c,
          lat: c.lat + (Math.random() - 0.5) * 0.00002,
          lon: c.lon + (Math.random() - 0.5) * 0.00002,
          acc: 1.8 + Math.random() * 1.4,
        }));
      }, 1500);
    };

    if (!('geolocation' in navigator)) {
      startSimulated('Geolocation unsupported');
      return () => {
        if (simId.current) clearInterval(simId.current);
        simId.current = null;
      };
    }

    let cancelled = false;
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (cancelled) return;
        if (simId.current) {
          clearInterval(simId.current);
          simId.current = null;
        }
        setState({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          acc: pos.coords.accuracy,
          source: 'real',
        });
      },
      (err) => {
        if (cancelled) return;
        startSimulated(err.message);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10_000 },
    );

    return () => {
      cancelled = true;
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
      if (simId.current) clearInterval(simId.current);
      simId.current = null;
    };
  }, []);

  return state;
}
