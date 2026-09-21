import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { getDepartmentRoute } from './utils/navigation';

// Layout & Route Protection
import MainLayout from './components/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';

// Public & General Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PortalsPage from './pages/PortalsPage';
import VPNConfigPage from './pages/VPNConfigPage';

// Real Departmental Pages (Zero-Trust Micro-Segments)
import HRDepartmentPage from './pages/departments/HRDepartmentPage';
import FinanceDepartmentPage from './pages/departments/FinanceDepartmentPage';
import ITDepartmentPage from './pages/departments/ITDepartmentPage';

// Admin Pages
import UsersPage from './pages/admin/UsersPage';
import RolesPage from './pages/admin/RolesPage';
import WireGuardPage from './pages/admin/WireGuardPage';
import SessionsPage from './pages/admin/SessionsPage';
import LogsPage from './pages/admin/LogsPage';

/**
 * Root Route Controller:
 * Directs administrators to the Overview Dashboard, and directs
 * departmental users immediately to their designated micro-segment view.
 */
function RootRoute() {
  const { user } = useAuthStore();
  const isAdmin = user?.is_admin || user?.role?.name?.toLowerCase() === 'admin';

  if (isAdmin) {
    return (
      <MainLayout>
        <DashboardPage />
      </MainLayout>
    );
  }

  const roleRoute = getDepartmentRoute(user);
  return <Navigate to={roleRoute} replace />;
}

export default function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Authentication Route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Root Route: Role-Based Automated Dispatch */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <RootRoute />
            </ProtectedRoute>
          }
        />

        {/* Real Departmental Pages with Cryptographic Segment Enforcement */}
        <Route
          path="/departments/hr"
          element={
            <ProtectedRoute
              requiredDepartment="hr"
              targetDepartment="Human Resources"
              requiredSegment="hr-ns"
              targetIp="10.20.10.2:9001"
            >
              <MainLayout>
                <HRDepartmentPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/departments/finance"
          element={
            <ProtectedRoute
              requiredDepartment="finance"
              targetDepartment="Finance & Accounts"
              requiredSegment="finance-ns"
              targetIp="10.20.20.2:9002"
            >
              <MainLayout>
                <FinanceDepartmentPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/departments/it"
          element={
            <ProtectedRoute
              requiredDepartment="it"
              targetDepartment="IT Operations"
              requiredSegment="it-ns"
              targetIp="10.20.30.2:9003"
            >
              <MainLayout>
                <ITDepartmentPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Zero-Trust Micro-Segment Verification / Admin Testing Console */}
        <Route
          path="/portals"
          element={
            <ProtectedRoute requireAdmin={true}>
              <MainLayout>
                <PortalsPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* User VPN Tunnel Configuration Download & Key Management */}
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

        {/* Admin Management Routes (Access Denied for Non-Admins) */}
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
