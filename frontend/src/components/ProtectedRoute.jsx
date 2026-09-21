import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { canAccessDepartment, canAccessSegment } from '../utils/navigation';
import MainLayout from './MainLayout';
import AccessDeniedCard from './AccessDeniedCard';

export default function ProtectedRoute({
  children,
  requireAdmin = false,
  requiredDepartment = null,
  requiredSegment = null,
  targetDepartment = null,
  targetIp = null,
}) {
  const { isAuthenticated, user, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const isAdmin = user?.is_admin || user?.role?.name?.toLowerCase() === 'admin';

  // Admin route check
  if (requireAdmin && !isAdmin) {
    return (
      <MainLayout>
        <AccessDeniedCard
          targetDepartment="System Administration"
          targetSegment="admin-control-plane"
          targetIp="10.10.0.1:8000"
          errorMessage="Administrator credentials are required to access this system control interface."
        />
      </MainLayout>
    );
  }

  // Department-specific permission check
  if (requiredDepartment && !canAccessDepartment(user, requiredDepartment)) {
    const deptInfoMap = {
      hr: {
        name: 'Human Resources',
        segment: 'hr-ns (10.20.10.0/24)',
        ip: '10.20.10.2:9001',
      },
      finance: {
        name: 'Finance & Accounts',
        segment: 'finance-ns (10.20.20.0/24)',
        ip: '10.20.20.2:9002',
      },
      it: {
        name: 'IT Operations',
        segment: 'it-ns (10.20.30.0/24)',
        ip: '10.20.30.2:9003',
      },
    };

    const info = deptInfoMap[requiredDepartment.toLowerCase()] || {
      name: targetDepartment || 'Department Resource',
      segment: requiredSegment || 'department-ns',
      ip: targetIp || '10.20.0.0',
    };

    return (
      <MainLayout>
        <AccessDeniedCard
          targetDepartment={info.name}
          targetSegment={info.segment}
          targetIp={info.ip}
          deptKey={requiredDepartment}
          errorMessage={`Zero-Trust Firewall Policy: nftables strictly filters incoming packets to ${info.ip}. Your role does not hold permissions for ${info.segment}.`}
        />
      </MainLayout>
    );
  }

  // Segment-specific check
  if (requiredSegment && !canAccessSegment(user, requiredSegment)) {
    return (
      <MainLayout>
        <AccessDeniedCard
          targetDepartment={targetDepartment || 'Restricted Micro-Segment'}
          targetSegment={requiredSegment}
          targetIp={targetIp || '10.20.0.0'}
          errorMessage={`Cryptographic tunnel inspection failed: role does not permit access to ${requiredSegment}.`}
        />
      </MainLayout>
    );
  }

  return children;
}
