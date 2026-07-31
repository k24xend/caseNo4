import { useEffect, useRef, useState } from 'react';
import { useApp } from '../app/AppContext';

type HardRiskLevel = 'moderate' | 'high' | 'extreme';

const riskOptions: Array<[HardRiskLevel, string]> = [
  ['moderate', 'Умеренный'],
  ['high', 'Высокий'],
  ['extreme', 'Предельный'],
];

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
    navigator.vibrate?.(10);
    if (mode === 'base') setOpen(false);
  };

  const chooseRisk = (level: HardRiskLevel) => {
    void patch({ guidanceMode: 'hard', hardRiskLevel: level });
    navigator.vibrate?.(8);
    setOpen(false);
  };

  const toggle = () => {
    setOpen((value) => !value);
    navigator.vibrate?.(6);
  };

  return (
    <div
      className={`mode-dial ${open ? 'open' : ''} mode-${settings.guidanceMode}`}
      ref={ref}
      data-mode={settings.guidanceMode}
    >
      <div className="dial-orbit" aria-hidden={!open}>
        <button
          type="button"
          tabIndex={open ? 0 : -1}
          className={`dial-arc base ${settings.guidanceMode === 'base' ? 'active' : ''}`}
          onClick={() => choose('base')}
        >
          <span>Base</span>
          <small>бережно</small>
        </button>
        <button
          type="button"
          tabIndex={open ? 0 : -1}
          className={`dial-arc hard ${settings.guidanceMode === 'hard' ? 'active' : ''}`}
          onClick={() => choose('hard')}
        >
          <span>Hard</span>
          <small>интенсивно</small>
        </button>
      </div>

      <button
        type="button"
        className="dial-trigger"
        aria-label={`Режим ${settings.guidanceMode}. Изменить`}
        aria-expanded={open}
        onClick={toggle}
      >
        <span className="dial-refract" aria-hidden="true" />
        <span>{settings.guidanceMode === 'base' ? 'Base' : 'Hard'}</span>
      </button>

      {open && settings.guidanceMode === 'hard' && (
        <div className="dial-risk" role="group" aria-label="Допустимый риск">
          {riskOptions.map(([id, label]) => (
            <button
              type="button"
              key={id}
              className={settings.hardRiskLevel === id ? 'active' : ''}
              onClick={() => chooseRisk(id)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
