import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { COURSE } from '../lib/mockData';
import { useCourse } from '../context/CourseContext';
import { useReadings } from '../context/ReadingsContext';
import { usePredictions } from '../context/PredictionsContext';
import { useGps } from '../lib/gps';
import type { HoleFeatureCollection } from '../lib/geofence';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

interface Props {
  onClose: () => void;
}

export function SetupOverlay({ onClose }: Props) {
  const { geofences, saveGeofences } = useCourse();
  const { readings, loadDemoData, clearAllReadings } = useReadings();
  const { refresh: refreshPredictions } = usePredictions();
  const gps = useGps();

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  // MapboxDraw / mapbox-gl v3 type friction — keep the instance loosely typed.
  const drawRef = useRef<any>(null);
  const activeHoleRef = useRef(1);
  const geofencesRef = useRef<HoleFeatureCollection>(geofences);
  // Pre-resolve center (the Winnetka Golf Club fallback); we fly to the
  // device's real position once GPS resolves.
  const initialCenterRef = useRef<[number, number]>([gps.lon, gps.lat]);
  const didAutoCenterRef = useRef(false);

  const [activeHole, setActiveHole] = useState(1);
  const [definedHoles, setDefinedHoles] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => { activeHoleRef.current = activeHole; }, [activeHole]);
  useEffect(() => { geofencesRef.current = geofences; }, [geofences]);

  const refreshDefined = () => {
    const draw = drawRef.current;
    if (!draw) return;
    const holes: number[] = draw
      .getAll()
      .features.map((f: any) => Number(f.properties?.hole))
      .filter((n: number) => Number.isFinite(n) && n >= 1 && n <= 18);
    setDefinedHoles(Array.from(new Set(holes)).sort((a, b) => a - b));
  };

  // Build + tear down the map once.
  useEffect(() => {
    const container = mapContainer.current;
    if (!container) return;
    if (!MAPBOX_TOKEN) {
      setMapError('Missing VITE_MAPBOX_TOKEN in .env — map editor unavailable.');
      return;
    }
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: initialCenterRef.current,
      zoom: 16,
      attributionControl: false,
    });
    mapRef.current = map;

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: true },
    });
    drawRef.current = draw;
    map.addControl(draw as unknown as mapboxgl.IControl);
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

    const geolocate = new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true,
    });
    map.addControl(geolocate, 'top-right');

    map.on('load', () => {
      const fc = geofencesRef.current;
      if (fc.features.length) {
        draw.set(fc as any);
        refreshDefined();
      }
      // Open on the greenkeeper's actual position so they can geofence in place.
      geolocate.trigger();
    });

    const onCreate = (e: any) => {
      const f = e.features?.[0];
      if (f) draw.setFeatureProperty(String(f.id), 'hole', activeHoleRef.current);
      refreshDefined();
      // Jump the active hole to the next one still missing a polygon.
      const defined = new Set<number>(
        draw.getAll().features.map((x: any) => Number(x.properties?.hole)),
      );
      for (let n = 1; n <= 18; n++) {
        if (!defined.has(n)) { setActiveHole(n); break; }
      }
    };
    const onChange = () => refreshDefined();

    (map as any).on('draw.create', onCreate);
    (map as any).on('draw.update', onChange);
    (map as any).on('draw.delete', onChange);

    return () => {
      map.remove();
      mapRef.current = null;
      drawRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recenter on the greenkeeper's real position the moment GPS resolves —
  // independent of GeolocateControl, whose trigger() can be blocked on some
  // mobile browsers. Until then the map sits on the Winnetka Golf Club center.
  useEffect(() => {
    if (didAutoCenterRef.current || gps.source !== 'real') return;
    const map = mapRef.current;
    if (!map) return;
    didAutoCenterRef.current = true;
    map.flyTo({ center: [gps.lon, gps.lat], zoom: 17, duration: 1200 });
  }, [gps.source, gps.lat, gps.lon]);

  const onSelectHole = (n: number) => {
    setActiveHole(n);
    const draw = drawRef.current;
    if (!draw) return;
    const feat = draw.getAll().features.find((f: any) => Number(f.properties?.hole) === n);
    if (feat) {
      draw.changeMode('simple_select', { featureIds: [String(feat.id)] });
    } else {
      draw.changeMode('draw_polygon');
    }
  };

  const onSave = async () => {
    const draw = drawRef.current;
    if (!draw) return;
    setSaving(true);
    setMsg(null);
    try {
      const features = draw
        .getAll()
        .features.filter(
          (f: any) =>
            f.geometry?.type === 'Polygon' && Number.isFinite(Number(f.properties?.hole)),
        )
        .map((f: any) => ({
          type: 'Feature' as const,
          properties: { hole: Number(f.properties.hole) },
          geometry: { type: 'Polygon' as const, coordinates: f.geometry.coordinates },
        }));
      const fc: HoleFeatureCollection = { type: 'FeatureCollection', features };
      await saveGeofences(fc);
      setMsg(`Saved ${features.length} hole polygon${features.length === 1 ? '' : 's'}.`);
    } catch {
      setMsg('Failed to save hole map.');
    } finally {
      setSaving(false);
    }
  };

  const onLoadDemo = async () => {
    setBusy('demo');
    setMsg(null);
    try {
      const n = await loadDemoData();
      await refreshPredictions();
      setMsg(`Loaded ${n} readings + weather, generated 7-day forecast.`);
    } catch {
      setMsg('Failed to load demo data.');
    } finally {
      setBusy(null);
    }
  };

  const onClear = async () => {
    if (!window.confirm('Delete ALL readings, weather, and forecasts for this course? This cannot be undone.')) return;
    setBusy('clear');
    setMsg(null);
    try {
      await clearAllReadings();
      await refreshPredictions();
      setMsg('All readings, weather, and forecasts cleared.');
    } catch {
      setMsg('Failed to clear readings.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="setup-veil" role="dialog" aria-modal="true">
      <div className="setup-panel">
        <div className="setup-head">
          <div>
            <div className="eyebrow">Course setup</div>
            <h2 className="setup-h">{COURSE.name} <i>hole map</i></h2>
          </div>
          <button className="setup-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="setup-body">
          <section className="setup-section">
            <div className="cs-label">
              <span>Geofence polygons</span>
              <span className="cs-meta">{definedHoles.length}/18 set</span>
            </div>
            <p className="setup-p">
              Pick a hole, then draw its green's outline with the polygon tool (▱, top-left of
              the map). Drawing on a hole that already has a shape adds another — delete extras
              with the trash tool. The capture screen auto-selects a hole when your GPS sits
              inside its polygon.
            </p>

            <div className="cs-hole-strip setup-strip">
              {COURSE.holes.map((h) => (
                <button
                  key={h.n}
                  className={
                    'cs-hole-btn' +
                    (activeHole === h.n ? ' sel' : '') +
                    (definedHoles.includes(h.n) ? ' done' : '')
                  }
                  onClick={() => onSelectHole(h.n)}
                >
                  {h.n}
                </button>
              ))}
            </div>

            {mapError ? (
              <div className="setup-map-err">{mapError}</div>
            ) : (
              <div ref={mapContainer} className="setup-map" />
            )}

            <button className="cta setup-save" onClick={onSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save hole map'} <span className="arrow">→</span>
            </button>
          </section>

          <section className="setup-section">
            <div className="cs-label">
              <span>Demo data</span>
              <span className="cs-meta">{readings.length} readings</span>
            </div>
            <p className="setup-p">
              The database starts empty. "Load demo data" pulls <b>live</b> weather for the
              course, generates four weeks of readings coherent with that real history, then runs
              the prediction model against the <b>live 7-day forecast</b> — only the past readings
              are synthetic; the forecast is real. Or clear everything to start fresh.
            </p>
            <div className="setup-demo-row">
              <button className="btn-ghost" onClick={onLoadDemo} disabled={busy != null}>
                {busy === 'demo' ? 'Loading…' : 'Load demo data'}
              </button>
              <button className="btn-ghost danger" onClick={onClear} disabled={busy != null}>
                {busy === 'clear' ? 'Clearing…' : 'Clear all data'}
              </button>
            </div>
          </section>

          {msg && <div className="setup-msg">{msg}</div>}
        </div>
      </div>
    </div>
  );
}
