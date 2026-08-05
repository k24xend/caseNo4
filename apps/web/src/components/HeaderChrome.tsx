import { useEffect, useRef, useState } from 'react';
import { Check, Globe, Palette, Snowflake, SunMoon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../app/AppContext';
import type { AppLanguage, ColorSchemeId } from '../domain/models';
import { colorSchemes, t } from '../i18n';
import { cn } from '../lib/utils';

const schemePreview: Record<ColorSchemeId, string> = {
  mint: '#0f9bb0',
  sky: '#3b82f6',
  sage: '#4f8f6a',
  lavender: '#7c6bc4',
  sand: '#b07a45',
  ocean: '#1f6f8b',
  rose: '#c45b7a',
  slate: '#4b6280',
  aurora: '#2a9d8f',
  graphite: '#3d4450',
};

export function HeaderChrome({ compact }: { compact?: boolean }) {
  const { settings, patch } = useApp();
  const s = t(settings.language);
  const [open, setOpen] = useState<'theme' | 'lang' | 'scheme' | null>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(null);
    };
    addEventListener('pointerdown', onDown);
    return () => removeEventListener('pointerdown', onDown);
  }, [open]);

  const toggleTheme = () => {
    const next =
      settings.theme === 'light' ? 'dark' : settings.theme === 'dark' ? 'system' : 'light';
    void patch({ theme: next });
  };

  return (
    <header className="relative flex items-center justify-between gap-2" ref={root}>
      <div className="flex min-w-0 items-center gap-3">
        <div className="fs-icon-btn shrink-0" style={{ width: 42, height: 42 }} aria-hidden>
          <Snowflake className="size-5 text-accent" style={{ color: 'var(--accent)' }} />
        </div>
        {!compact && (
          <div className="min-w-0">
            <div className="truncate text-[21px] font-semibold tracking-tight text-ink">{s.appName}</div>
            <div className="truncate text-[11px] font-medium leading-4 text-muted">{s.brandTag}</div>
          </div>
        )}
      </div>

      <div className="relative flex shrink-0 items-center gap-1.5">
        <div className="relative">
          <button
            type="button"
            className={cn('fs-icon-btn', open === 'scheme' && 'active-accent')}
            aria-label={s.colorScheme}
            aria-expanded={open === 'scheme'}
            onClick={() => setOpen((v) => (v === 'scheme' ? null : 'scheme'))}
          >
            <Palette className="size-4" />
          </button>
          {open === 'scheme' && (
            <div className="fs-pop" role="menu">
              <div className="fs-pop-label">{s.colorScheme}</div>
              {colorSchemes.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={cn(settings.colorScheme === c.id && 'active')}
                  onClick={() => {
                    void patch({ colorScheme: c.id });
                    setOpen(null);
                  }}
                >
                  <span className="fs-swatch" style={{ background: schemePreview[c.id] }} />
                  {c.label}
                  {settings.colorScheme === c.id && <Check className="ml-auto size-3.5" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            className={cn('fs-icon-btn', open === 'lang' && 'active-accent')}
            aria-label={s.language}
            aria-expanded={open === 'lang'}
            onClick={() => setOpen((v) => (v === 'lang' ? null : 'lang'))}
          >
            <Globe className="size-4" />
          </button>
          {open === 'lang' && (
            <div className="fs-pop" role="menu">
              <div className="fs-pop-label">{s.language}</div>
              {(
                [
                  ['en', 'English'],
                  ['ru', 'Русский'],
                  ['zh', '中文'],
                ] as Array<[AppLanguage, string]>
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={cn(settings.language === id && 'active')}
                  onClick={() => {
                    void patch({ language: id });
                    setOpen(null);
                  }}
                >
                  {label}
                  {settings.language === id && <Check className="ml-auto size-3.5" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          className="fs-icon-btn"
          aria-label={`${s.theme}: ${settings.theme}`}
          title={`${s.theme}: ${settings.theme}`}
          onClick={toggleTheme}
        >
          <SunMoon className="size-4" />
        </button>

        <Link to="/profile" className="fs-icon-btn" aria-label={s.profile}>
          <span className="text-xs font-bold" style={{ color: 'var(--accent)' }}>
            {settings.language === 'zh' ? '我' : settings.language === 'ru' ? 'Я' : 'Me'}
          </span>
        </Link>
      </div>
    </header>
  );
}
