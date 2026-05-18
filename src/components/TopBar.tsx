import type { Tab } from '../types';

interface Props {
  tab: Tab;
  todayCount: number;
  dateStr: string;
  tech: string;
  courseName: string;
}

export function TopBar({ tab, todayCount, dateStr, tech, courseName }: Props) {
  return (
    <div className="topbar">
      <div className="brand">
        <span className="dot" />
        Turf<i>IQ</i>
      </div>
      <div className="meta">
        {tab === 'capture' ? (
          <span className="gps-pill">
            <span className="gps-dot" />
            GPS · LOCKED · ±2.4m
          </span>
        ) : (
          <>
            <b>{tech} · {courseName}</b><br />
            {dateStr} · {todayCount} READINGS TODAY
          </>
        )}
      </div>
    </div>
  );
}
