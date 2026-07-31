import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { History, Home, MessageCircle, Wallet } from 'lucide-react';
import { cn } from '../lib/utils';

const items = [
  ['/today', Home, 'Home'],
  ['/plan', Wallet, 'Wallet'],
  ['/assistant', MessageCircle, 'Assistant'],
  ['/transactions', History, 'History'],
] as const;

export function Shell() {
  const location = useLocation();
  localStorage.setItem('vyhod-last-route', location.pathname);

  return (
    <div className="fs-shell">
      <div className="fs-shell-glow" aria-hidden />
      <div className="fs-shell-sheen" aria-hidden />
      <main id="main" className="fs-main relative z-10">
        <Outlet />
      </main>
      <nav className="fs-nav relative z-10" aria-label="Main">
        <div className="flex items-center justify-around">
          {items.map(([to, Icon, label]) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 rounded-2xl px-3 py-2 text-slate-500',
                  isActive && 'bg-white/75 text-cyan-600 shadow-[0_12px_28px_rgba(61,158,168,0.14)]',
                )
              }
            >
              <Icon className="size-5" strokeWidth={1.75} aria-hidden />
              <span className={cn('text-[11px]', location.pathname === to && 'font-semibold')}>
                {label}
              </span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
