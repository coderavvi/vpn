import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin) {
    const isAdmin = user?.is_admin || user?.role?.name?.toLowerCase() === 'admin';
    if (!isAdmin) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
}
