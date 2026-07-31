import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { CircleUserRound, MessageCircle, CalendarDays } from 'lucide-react';
import { useApp } from './AppContext';
import { copy } from '../i18n';
import { ModeDial } from '../components/ModeDial';

export function Shell() {
  const { settings } = useApp();
  const t = copy[settings.language];
  const items = [
    ['/today', 'blob', t.today],
    ['/plan', CalendarDays, t.plan],
    ['/assistant', MessageCircle, t.transactions],
    ['/profile', CircleUserRound, t.profile],
  ] as const;
  const location = useLocation();
  localStorage.setItem('vyhod-last-route', location.pathname);

  return (
    <div className="app-shell rb-shell">
      <header className="rb-topbar">
        <div className="rb-logo" aria-label="ВЫХОД">
          <span className="rb-logo-blob" />
        </div>
        <ModeDial />
      </header>

      <main id="main" className="rb-main">
        <Outlet />
      </main>

      <nav className="rb-nav" aria-label="Основная навигация">
        {items.map(([to, Icon, label]) => (
          <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : undefined)}>
            <span className="rb-nav-icon">
              {Icon === 'blob' ? (
                <span className="rb-nav-blob" aria-hidden />
              ) : (
                <Icon size={20} strokeWidth={1.7} aria-hidden />
              )}
            </span>
            <b>{label}</b>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
