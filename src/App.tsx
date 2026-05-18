import { useState } from 'react';
import { ReadingsProvider, useReadings } from './context/ReadingsContext';
import { TopBar } from './components/TopBar';
import { TabBar } from './components/TabBar';
import { Toast } from './components/Toast';
import { CaptureScreen } from './screens/CaptureScreen';
import { AnalysisScreen } from './screens/AnalysisScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import type { Reading, Tab } from './types';
import { COURSE } from './lib/mockData';

const TECH = 'JM';

function Shell() {
  const { readings, addReading } = useReadings();
  const [tab, setTab] = useState<Tab>('capture');
  const [toast, setToast] = useState(false);

  const handleLog = (r: Reading) => {
    addReading(r);
    setToast(true);
    setTimeout(() => setToast(false), 1800);
  };

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const todayCount = readings.filter((r) => r.t >= todayStart).length;

  return (
    <div className="app">
      <TopBar
        tab={tab}
        todayCount={todayCount}
        dateStr={dateStr}
        tech={TECH}
        courseName={COURSE.name}
      />

      <div className="screen">
        {tab === 'capture' && <CaptureScreen onLog={handleLog} recent={readings.slice(0, 12)} />}
        {tab === 'analysis' && <AnalysisScreen readings={readings} />}
        {tab === 'history' && <HistoryScreen />}
      </div>

      <Toast show={toast} />

      <TabBar tab={tab} onChange={setTab} />
    </div>
  );
}

export function App() {
  return (
    <ReadingsProvider>
      <Shell />
    </ReadingsProvider>
  );
}
