import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { ReadingsProvider, useReadings } from './context/ReadingsContext';
import { CourseProvider } from './context/CourseContext';
import { TopBar } from './components/TopBar';
import { TabBar } from './components/TabBar';
import { Toast } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TechPicker } from './components/TechPicker';
// Lazy-loaded: pulls in Mapbox only when the setup overlay is opened.
const SetupOverlay = lazy(() =>
  import('./components/SetupOverlay').then((m) => ({ default: m.SetupOverlay })),
);
import { CaptureScreen } from './screens/CaptureScreen';
import { AnalysisScreen } from './screens/AnalysisScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import type { Reading, Tab } from './types';
import { COURSE } from './lib/mockData';
import { loadTech, saveTech } from './lib/storage';
import { useGps } from './lib/gps';

function Shell() {
  const { readings, addReading, ready, error, clearError } = useReadings();
  const [tab, setTab] = useState<Tab>('capture');
  const [selectedHole, setSelectedHole] = useState(7);
  const [toast, setToast] = useState(false);
  const [tech, setTech] = useState<string | null>(() => loadTech());
  const [showPicker, setShowPicker] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const gps = useGps();

  useEffect(() => {
    if (!tech) setShowPicker(true);
  }, [tech]);

  // Auto-dismiss the error toast a few seconds after a failed write/load.
  useEffect(() => {
    if (!error) return;
    const id = setTimeout(() => clearError(), 4000);
    return () => clearTimeout(id);
  }, [error, clearError]);

  const handleLog = async (r: Reading) => {
    try {
      await addReading(r);
      setToast(true);
      setTimeout(() => setToast(false), 1800);
    } catch {
      // Failure is surfaced through the error toast (context `error`).
    }
  };

  const handleJumpToHole = (hole: number) => {
    setSelectedHole(hole);
    setTab('analysis');
  };

  const handleSaveTech = (next: string) => {
    saveTech(next);
    setTech(next);
    setShowPicker(false);
  };

  const { dateStr, todayCount } = useMemo(() => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const todayCount = readings.filter((r) => r.t >= todayStart).length;
    return { dateStr, todayCount };
  }, [readings]);

  const effectiveTech = tech ?? 'JM';

  return (
    <div className="app">
      <TopBar
        tab={tab}
        onTabChange={setTab}
        todayCount={todayCount}
        dateStr={dateStr}
        tech={effectiveTech}
        courseName={COURSE.name}
        gps={gps}
        onTechClick={() => setShowPicker(true)}
        onOpenSetup={() => setShowSetup(true)}
      />

      <div className="screen">
        {!ready && <div className="empty-state" style={{ padding: 40 }}>Loading…</div>}
        {ready && tab === 'capture' && (
          <CaptureScreen
            onLog={handleLog}
            recent={readings.slice(0, 12)}
            tech={effectiveTech}
            onOpenSetup={() => setShowSetup(true)}
          />
        )}
        {ready && tab === 'analysis' && (
          <AnalysisScreen
            readings={readings}
            selectedHole={selectedHole}
            onSelectHole={setSelectedHole}
          />
        )}
        {ready && tab === 'history' && (
          <HistoryScreen
            readings={readings}
            onJumpToHole={handleJumpToHole}
            currentTech={effectiveTech}
          />
        )}
      </div>

      <Toast show={toast} />
      {error && <Toast show variant="error" message={error} />}

      <TabBar tab={tab} onChange={setTab} />

      {showPicker && (
        <TechPicker
          initial={tech ?? ''}
          onSave={handleSaveTech}
          onClose={() => setShowPicker(false)}
          dismissable={!!tech}
        />
      )}

      {showSetup && (
        <Suspense fallback={null}>
          <SetupOverlay onClose={() => setShowSetup(false)} />
        </Suspense>
      )}
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <CourseProvider>
        <ReadingsProvider>
          <Shell />
        </ReadingsProvider>
      </CourseProvider>
    </ErrorBoundary>
  );
}
