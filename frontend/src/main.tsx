import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from './components';
import {
  ActorsPage,
  CreateLotPage,
  DemoPage,
  LimitationsPage,
  LotDetailPage,
  MeasurementsPage,
  SettingsPage,
  TransferPage,
  VerifyPage,
} from './pages';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 15_000, refetchOnWindowFocus: false, retry: false },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<DemoPage />} />
            <Route path="actors" element={<ActorsPage />} />
            <Route path="lots/new" element={<CreateLotPage />} />
            <Route path="lots/:lotId" element={<LotDetailPage />} />
            <Route path="transfer" element={<TransferPage />} />
            <Route path="verify" element={<VerifyPage />} />
            <Route path="measurements" element={<MeasurementsPage />} />
            <Route path="limitations" element={<LimitationsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
