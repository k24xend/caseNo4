import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { History, Home, MessageCircle } from 'lucide-react';
import { useApp } from './AppContext';
import { t } from '../i18n';
import { cn } from '../lib/utils';

export function Shell() {
  const { settings } = useApp();
  const s = t(settings.language);
  const location = useLocation();
  localStorage.setItem('vyhod-last-route', location.pathname);

  const items = [
    ['/today', Home, s.home],
    ['/assistant', MessageCircle, s.assistant],
    ['/transactions', History, s.history],
  ] as const;

  return (
    <div className="fs-shell">
      <div className="fs-shell-glow" aria-hidden />
      <div className="fs-shell-sheen" aria-hidden />
      <main id="main" className="fs-main">
        <Outlet />
      </main>
      <nav className="fs-nav" aria-label="Main">
        <div className="fs-nav-inner">
          {items.map(([to, Icon, label]) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => cn(isActive && 'active')}
            >
              <Icon className="size-5" strokeWidth={1.75} aria-hidden />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
