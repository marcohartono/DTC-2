interface IconProps { active?: boolean }

const color = (active?: boolean) => (active ? 'var(--moss)' : 'currentColor');

export function CaptureIcon({ active }: IconProps) {
  const c = color(active);
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={c} strokeWidth="1.5" />
      <circle cx="12" cy="12" r="3" fill={c} />
      <line x1="12" y1="2" x2="12" y2="5" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="19" x2="12" y2="22" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2" y1="12" x2="5" y2="12" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="19" y1="12" x2="22" y2="12" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function AnalysisIcon({ active }: IconProps) {
  const c = color(active);
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M3 17 L9 11 L13 14 L21 5" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="11" r="1.6" fill={c} />
      <circle cx="13" cy="14" r="1.6" fill={c} />
      <circle cx="21" cy="5" r="1.6" fill={c} />
    </svg>
  );
}

export function HistoryIcon({ active }: IconProps) {
  const c = color(active);
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 6v6l4 2" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="12" r="9" stroke={c} strokeWidth="1.5" />
    </svg>
  );
}

export function PhaseBeforeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 3v9M12 12 L8 8 M12 12 L16 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
      <path d="M5 17 Q12 21 19 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function PhaseAfterIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 3 C8 8 6 11 6 14 a6 6 0 0 0 12 0 c0 -3 -2 -6 -6 -11z" fill="currentColor" opacity="0.85" />
    </svg>
  );
}
