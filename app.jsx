// ───────── App shell ─────────
const { useState: useS, useEffect: useE } = React;

function CaptureIcon({ active }) {
  const c = active ? "var(--moss)" : "currentColor";
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={c} strokeWidth="1.5"/>
      <circle cx="12" cy="12" r="3" fill={c}/>
      <line x1="12" y1="2" x2="12" y2="5" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="12" y1="19" x2="12" y2="22" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="2" y1="12" x2="5" y2="12" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="19" y1="12" x2="22" y2="12" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}
function AnalysisIcon({ active }) {
  const c = active ? "var(--moss)" : "currentColor";
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M3 17 L9 11 L13 14 L21 5" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="9" cy="11" r="1.6" fill={c}/>
      <circle cx="13" cy="14" r="1.6" fill={c}/>
      <circle cx="21" cy="5" r="1.6" fill={c}/>
    </svg>
  );
}
function HistoryIcon({ active }) {
  const c = active ? "var(--moss)" : "currentColor";
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 6v6l4 2" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="12" cy="12" r="9" stroke={c} strokeWidth="1.5"/>
    </svg>
  );
}

function App() {
  const [tab, setTab] = useS('capture');
  const [readings, setReadings] = useS(window.READINGS);
  const [toast, setToast] = useS(false);

  // recent for capture screen — newest first
  const recent = readings.slice(0, 12);

  const handleLog = (r) => {
    setReadings(prev => [r, ...prev]);
    setToast(true);
    setTimeout(() => setToast(false), 1800);
  };

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
  const todayCount = readings.filter(r => r.t >= new Date().setHours(0,0,0,0)).length;

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          <span className="dot"></span>
          Turf<i>IQ</i>
        </div>
        <div className="meta">
          {tab === 'capture' ? (
            <span className="gps-pill">
              <span className="gps-dot"></span>
              GPS · LOCKED · ±2.4m
            </span>
          ) : (
            <>
              <b>JM · Cypress Bend</b><br/>
              {dateStr} · {todayCount} READINGS TODAY
            </>
          )}
        </div>
      </div>

      <div className="screen" data-screen-label={tab === 'capture' ? '01 Capture' : '02 Analysis'}>
        {tab === 'capture' && <window.CaptureScreen onLog={handleLog} recent={recent} />}
        {tab === 'analysis' && <window.AnalysisScreen readings={readings} />}
      </div>

      <div className={"toast " + (toast ? "show" : "")}>
        <span className="check">✓</span>
        Reading saved
      </div>

      <div className="tabbar">
        <button className={tab === 'capture' ? "active" : ""} onClick={() => setTab('capture')}>
          <span className="icon"><CaptureIcon active={tab === 'capture'}/></span>
          Capture
        </button>
        <button className={tab === 'analysis' ? "active" : ""} onClick={() => setTab('analysis')}>
          <span className="icon"><AnalysisIcon active={tab === 'analysis'}/></span>
          Analysis
        </button>
        <button className={tab === 'history' ? "active" : ""} onClick={() => setTab('analysis')}>
          <span className="icon"><HistoryIcon active={false}/></span>
          History
        </button>
      </div>
    </div>
  );
}

window.App = App;
