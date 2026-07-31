import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Home, Wallet, MessageCircle, History } from 'lucide-react';

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
    <div className="mint-shell">
      <main id="main" className="mint-main">
        <Outlet />
      </main>
      <nav className="mint-nav" aria-label="Main">
        {items.map(([to, Icon, label]) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => (isActive ? 'active' : undefined)}
          >
            <span className="mint-nav-ic">
              <Icon size={20} strokeWidth={1.75} aria-hidden />
            </span>
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
