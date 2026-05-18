import type { Tab } from '../types';
import { AnalysisIcon, CaptureIcon, HistoryIcon } from './icons';

interface Props {
  tab: Tab;
  onChange: (tab: Tab) => void;
}

export function TabBar({ tab, onChange }: Props) {
  return (
    <div className="tabbar">
      <button className={tab === 'capture' ? 'active' : ''} onClick={() => onChange('capture')}>
        <span className="icon"><CaptureIcon active={tab === 'capture'} /></span>
        Capture
      </button>
      <button className={tab === 'analysis' ? 'active' : ''} onClick={() => onChange('analysis')}>
        <span className="icon"><AnalysisIcon active={tab === 'analysis'} /></span>
        Analysis
      </button>
      <button className={tab === 'history' ? 'active' : ''} onClick={() => onChange('history')}>
        <span className="icon"><HistoryIcon active={tab === 'history'} /></span>
        History
      </button>
    </div>
  );
}
