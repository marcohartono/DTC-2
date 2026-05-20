import type { Position } from '../types';

interface Props {
  value: Position;
  onChange: (p: Position) => void;
}

const OPTIONS: Position[] = ['front', 'middle', 'back'];

export function PositionPill({ value, onChange }: Props) {
  return (
    <div className="pos-row">
      {OPTIONS.map((p) => (
        <button
          key={p}
          type="button"
          className={value === p ? 'sel' : ''}
          onClick={() => onChange(p)}
        >
          {p}
        </button>
      ))}
    </div>
  );
}
