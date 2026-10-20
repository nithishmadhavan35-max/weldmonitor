import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { OverviewPage } from './pages/OverviewPage';
import { MachinesPage } from './pages/MachinesPage';
import { FactoryFloorPage } from './pages/FactoryFloorPage';
import { QualityPage } from './pages/QualityPage';
import { ProductionPage } from './pages/ProductionPage';
import { DowntimePage } from './pages/DowntimePage';
import { MaintenancePage } from './pages/MaintenancePage';
import { AlertsPage } from './pages/AlertsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SimulationPage } from './pages/SimulationPage';
import { AdminPage } from './pages/AdminPage';
import { LoginPage } from './pages/AuthPages';

// Role-based protection wrapper
const ProtectedAdminRoute = ({ children }) => {
  const { isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
};

export default function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[--surface-bg]">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner" />
          <p className="text-sm text-neutral-500 font-medium">Loading WeldMonitor…</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/" element={<AppLayout />}>
        <Route index element={<OverviewPage />} />
        <Route path="machines" element={<MachinesPage />} />
        <Route path="factory-floor" element={<FactoryFloorPage />} />
        <Route path="quality" element={<QualityPage />} />
        <Route path="production" element={<ProductionPage />} />
        <Route path="downtime" element={<DowntimePage />} />
        <Route path="maintenance" element={<MaintenancePage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="simulation" element={<SimulationPage />} />
        <Route
          path="admin"
          element={
            <ProtectedAdminRoute>
              <AdminPage />
            </ProtectedAdminRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
