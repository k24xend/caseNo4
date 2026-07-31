import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { CircleUserRound, Compass, MessageCircle, Route } from 'lucide-react';
import { dataMode, useApp } from './AppContext';
import { copy } from '../i18n';
import { ModeDial } from '../components/ModeDial';
import { Badge } from '../components/ui/badge';
import { cn } from '../lib/utils';

export function Shell() {
  const { settings } = useApp();
  const t = copy[settings.language];
  const items = [
    ['/today', Compass, t.today],
    ['/plan', Route, t.plan],
    ['/assistant', MessageCircle, t.transactions],
    ['/profile', CircleUserRound, t.profile],
  ] as const;
  const location = useLocation();
  localStorage.setItem('vyhod-last-route', location.pathname);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-background pb-24">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border/60 bg-background/90 px-4 py-4 backdrop-blur">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-sm font-semibold text-primary shadow-sm"
          aria-label="ВЫХОД"
        >
          В
        </div>
        {dataMode === 'demo' && <Badge variant="muted">Демо</Badge>}
        <div className="ml-auto">
          <ModeDial />
        </div>
      </header>

      <main id="main" className="flex-1 px-4 py-6">
        <Outlet />
      </main>

      <nav
        aria-label="Основная навигация"
        className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-lg border-t border-border/60 bg-background/95 px-2 pb-4 pt-2 backdrop-blur"
      >
        <div className="grid grid-cols-4 gap-1">
          {items.map(([to, Icon, label]) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isActive
                    ? 'bg-secondary text-foreground font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )
              }
            >
              <Icon className="h-5 w-5" aria-hidden />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
