import { Navigate, createBrowserRouter } from 'react-router-dom';
import { useApp } from './AppContext';
import { Shell } from './Shell';
import {
  Debts,
  NotFound,
  Onboarding,
  Plan,
  Profile,
  Today,
  Transactions,
  Welcome,
} from '../features';

const validRoutes = new Set(['/today', '/plan', '/debts', '/transactions', '/profile']);
export function EntryRoute() {
  const { settings, loading } = useApp();
  if (loading) return null;
  if (!settings.entered) return <Welcome />;
  const stored = localStorage.getItem('vyhod-last-route');
  return <Navigate replace to={stored && validRoutes.has(stored) ? stored : '/today'} />;
}
export function ProtectedRoute() {
  const { settings, loading } = useApp();
  if (loading) return null;
  return settings.entered ? <Shell /> : <Navigate replace to="/" />;
}
export const router = createBrowserRouter([
  { path: '/', element: <EntryRoute /> },
  { path: '/onboarding', element: <Onboarding /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/today', element: <Today /> },
      { path: '/plan', element: <Plan /> },
      { path: '/debts', element: <Debts /> },
      { path: '/transactions', element: <Transactions /> },
      { path: '/profile', element: <Profile /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
