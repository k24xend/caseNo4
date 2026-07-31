import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { CircleUserRound, Compass, MessageCircle, Route } from 'lucide-react';
import { dataMode, useApp } from './AppContext';
import { copy } from '../i18n';
import { ModeDial } from '../components/ModeDial';

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
    <div className="app-shell">
      <header className="liquid-topbar">
        <div className="watermark" aria-label="ВЫХОД">
          <i />
          <i />
          <i />
        </div>
        {dataMode === 'demo' && <span className="demo-mark">Демо</span>}
        <ModeDial />
      </header>
      <main id="main">
        <Outlet />
      </main>
      <nav className="bottom-nav" aria-label="Основная навигация">
        {items.map(([to, Icon, label]) => (
          <NavLink key={to} to={to}>
            <span className="nav-lens">
              <Icon aria-hidden="true" />
            </span>
            <b>{label}</b>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
