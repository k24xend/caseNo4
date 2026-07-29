import { useEffect, useRef, useState } from 'react';
import { useApp } from '../app/AppContext';

export function ModeDial({ expanded = false }: { expanded?: boolean }) {
  const { settings, patch } = useApp();
  const [open, setOpen] = useState(expanded);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    addEventListener('pointerdown', close);
    return () => removeEventListener('pointerdown', close);
  }, [open]);
  const choose = (mode: 'base' | 'hard') => {
    void patch({ guidanceMode: mode });
    setOpen(false);
    navigator.vibrate?.(8);
  };
  return (
    <div className={`mode-dial ${open ? 'open' : ''}`} ref={ref}>
      <button
        className="dial-trigger"
        aria-label={`Режим ${settings.guidanceMode}. Изменить`}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span>{settings.guidanceMode === 'base' ? 'Base' : 'Hard'}</span>
      </button>
      <div className="dial-options" aria-hidden={!open}>
        <button
          tabIndex={open ? 0 : -1}
          className={settings.guidanceMode === 'base' ? 'active' : ''}
          onClick={() => choose('base')}
        >
          Base<small>бережно</small>
        </button>
        <button
          tabIndex={open ? 0 : -1}
          className={settings.guidanceMode === 'hard' ? 'active hard' : ''}
          onClick={() => choose('hard')}
        >
          Hard<small>интенсивно</small>
        </button>
      </div>
    </div>
  );
}
