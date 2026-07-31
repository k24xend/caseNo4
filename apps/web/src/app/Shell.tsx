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
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-background pb-28">
      <header className="sticky top-0 z-20 flex items-center gap-3 bg-background/80 px-4 py-4 backdrop-blur-xl">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-white/70 text-sm font-semibold text-primary shadow-glass backdrop-blur"
          aria-label="ВЫХОД"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-primary/40">
            <span className="h-2 w-2 rounded-full bg-primary" />
          </span>
        </div>
        {dataMode === 'demo' && (
          <Badge variant="muted" className="rounded-full border border-white/50 bg-white/50 uppercase tracking-wide">
            Демо
          </Badge>
        )}
        <div className="ml-auto">
          <ModeDial />
        </div>
      </header>

      <main id="main" className="flex-1 px-4 py-4">
        <Outlet />
      </main>

      <nav
        aria-label="Основная навигация"
        className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-lg px-4 pb-6"
      >
        <div className="grid grid-cols-4 gap-1 rounded-full border border-white/60 bg-white/70 p-1.5 shadow-glass backdrop-blur-xl">
          {items.map(([to, Icon, label]) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-1 rounded-full px-2 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isActive
                    ? 'bg-secondary font-medium text-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )
              }
            >
              <Icon className="h-5 w-5" aria-hidden />
              <span className="text-xs">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
