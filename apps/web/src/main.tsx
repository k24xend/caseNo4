import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import { AppProvider } from './app/AppContext';
import { router } from './app/router';
import './index.css';
import './design-system/ref-b.css';
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('Доступна новая версия. Обновить сейчас?')) void updateSW(true);
  },
  onOfflineReady() {
    document.dispatchEvent(new CustomEvent('vyhod-offline-ready'));
  },
});
const query = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30000 } } });
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={query}>
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
