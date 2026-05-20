import { useEffect, useMemo, useState } from 'react';
import { ReadingsProvider, useReadings } from './context/ReadingsContext';
import { TopBar } from './components/TopBar';
import { TabBar } from './components/TabBar';
import { Toast } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TechPicker } from './components/TechPicker';
import { CaptureScreen } from './screens/CaptureScreen';
import { AnalysisScreen } from './screens/AnalysisScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import type { Reading, Tab } from './types';
import { COURSE } from './lib/mockData';
import { loadTech, saveTech } from './lib/storage';
import { useGps } from './lib/gps';

function Shell() {
  const { readings, addReading, ready } = useReadings();
  const [tab, setTab] = useState<Tab>('capture');
  const [selectedHole, setSelectedHole] = useState(7);
  const [toast, setToast] = useState(false);
  const [tech, setTech] = useState<string | null>(() => loadTech());
  const [showPicker, setShowPicker] = useState(false);
  const gps = useGps();

  useEffect(() => {
    if (!tech) setShowPicker(true);
  }, [tech]);

  const handleLog = (r: Reading) => {
    void addReading(r);
    setToast(true);
    setTimeout(() => setToast(false), 1800);
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
      />

      <div className="screen">
        {!ready && <div className="empty-state" style={{ padding: 40 }}>Loading…</div>}
        {ready && tab === 'capture' && (
          <CaptureScreen onLog={handleLog} recent={readings.slice(0, 12)} tech={effectiveTech} />
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

      <TabBar tab={tab} onChange={setTab} />

      {showPicker && (
        <TechPicker
          initial={tech ?? ''}
          onSave={handleSaveTech}
          onClose={() => setShowPicker(false)}
          dismissable={!!tech}
        />
      )}
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <ReadingsProvider>
        <Shell />
      </ReadingsProvider>
    </ErrorBoundary>
  );
}
