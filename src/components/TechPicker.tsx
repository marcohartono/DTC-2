import { useState, type FormEvent } from 'react';

interface Props {
  initial?: string;
  onSave: (tech: string) => void;
  onClose?: () => void;
  dismissable?: boolean;
}

export function TechPicker({ initial = '', onSave, onClose, dismissable = false }: Props) {
  const [value, setValue] = useState(initial.toUpperCase());

  const trimmed = value.trim().toUpperCase();
  const valid = trimmed.length >= 2 && trimmed.length <= 4 && /^[A-Z0-9]+$/.test(trimmed);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    onSave(trimmed);
  };

  return (
    <div className="modal-veil" role="dialog" aria-modal="true">
      <form className="modal" onSubmit={submit}>
        <div className="eyebrow">First run</div>
        <h2 className="modal-h">Who are <i>you</i>?</h2>
        <p className="modal-p">
          Enter your 2–4 letter initials. We'll stamp every reading you capture with them.
        </p>
        <input
          className="modal-input"
          type="text"
          maxLength={4}
          autoFocus
          inputMode="text"
          autoCapitalize="characters"
          spellCheck={false}
          value={value}
          onChange={(e) => setValue(e.target.value.toUpperCase())}
          placeholder="JM"
        />
        <div className="modal-actions">
          {dismissable && onClose && (
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          )}
          <button type="submit" className="cta modal-cta" disabled={!valid}>
            Save <span className="arrow">→</span>
          </button>
        </div>
      </form>
    </div>
  );
}
