import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Components
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PortalsPage from './pages/PortalsPage';
import VPNConfigPage from './pages/VPNConfigPage';

// Admin Pages
import UsersPage from './pages/admin/UsersPage';
import RolesPage from './pages/admin/RolesPage';
import WireGuardPage from './pages/admin/WireGuardPage';
import SessionsPage from './pages/admin/SessionsPage';
import LogsPage from './pages/admin/LogsPage';

function MainLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected User Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout>
                <DashboardPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/portals"
          element={
            <ProtectedRoute>
              <MainLayout>
                <PortalsPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/vpn-config"
          element={
            <ProtectedRoute>
              <MainLayout>
                <VPNConfigPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Protected Admin Routes */}
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute requireAdmin={true}>
              <MainLayout>
                <UsersPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/roles"
          element={
            <ProtectedRoute requireAdmin={true}>
              <MainLayout>
                <RolesPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/wireguard"
          element={
            <ProtectedRoute requireAdmin={true}>
              <MainLayout>
                <WireGuardPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/sessions"
          element={
            <ProtectedRoute requireAdmin={true}>
              <MainLayout>
                <SessionsPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/logs"
          element={
            <ProtectedRoute requireAdmin={true}>
              <MainLayout>
                <LogsPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
