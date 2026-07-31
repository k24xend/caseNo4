import { useEffect, useRef, useState } from 'react';
import { useApp } from '../app/AppContext';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { Card } from './ui/card';

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
    navigator.vibrate?.(8);
    if (mode === 'base') setOpen(false);
  };

  const chooseRisk = (level: HardRiskLevel) => {
    void patch({ guidanceMode: 'hard', hardRiskLevel: level });
    navigator.vibrate?.(8);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="min-w-16 rounded-full"
        aria-label={`Режим ${settings.guidanceMode}. Изменить`}
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v);
          navigator.vibrate?.(6);
        }}
      >
        {settings.guidanceMode === 'base' ? 'Base' : 'Hard'}
      </Button>

      {open && (
        <Card className="absolute right-0 top-12 z-50 w-56 space-y-2 p-3 shadow-md">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              size="sm"
              variant={settings.guidanceMode === 'base' ? 'default' : 'ghost'}
              onClick={() => choose('base')}
            >
              Base
            </Button>
            <Button
              type="button"
              size="sm"
              variant={settings.guidanceMode === 'hard' ? 'default' : 'ghost'}
              onClick={() => choose('hard')}
            >
              Hard
            </Button>
          </div>
          {settings.guidanceMode === 'hard' && (
            <div className="space-y-2 border-t border-border pt-3" role="group" aria-label="Допустимый риск">
              {riskOptions.map(([id, label]) => (
                <Button
                  key={id}
                  type="button"
                  size="sm"
                  variant={settings.hardRiskLevel === id ? 'secondary' : 'ghost'}
                  className={cn('w-full justify-start')}
                  onClick={() => chooseRisk(id)}
                >
                  {label}
                </Button>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
