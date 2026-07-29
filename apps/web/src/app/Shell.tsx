import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { CalendarDays, CircleUserRound, Landmark, ReceiptText } from 'lucide-react';
import { dataMode, useApp } from './AppContext';
import { copy } from '../i18n';
export function Shell() {
  const { settings } = useApp();
  const t = copy[settings.language];
  const items = [
    ['/today', CalendarDays, t.today],
    ['/plan', Landmark, t.plan],
    ['/transactions', ReceiptText, t.transactions],
    ['/profile', CircleUserRound, t.profile],
  ] as const;
  const location = useLocation();
  localStorage.setItem('vyhod-last-route', location.pathname);
  return (
    <div className="app-shell">
      <header className="topbar">
        <strong>
          ВЫХОД <i>•</i>
        </strong>
        <span className="demo-pill">
          {dataMode === 'demo' ? 'ДЕМО · не банк' : 'API · личные данные'}
        </span>
      </header>
      <main id="main">
        <Outlet />
      </main>
      <nav className="bottom-nav" aria-label="Основная навигация">
        {items.map(([to, Icon, label]) => (
          <NavLink key={to} to={to}>
            <Icon />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
