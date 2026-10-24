import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-600">Loading EcoNexus Portal...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    // Redirect to user's assigned portal
    if (user?.role === 'CITIZEN') return <Navigate to="/citizen/dashboard" replace />;
    if (user?.role === 'WORKER') return <Navigate to="/worker/dashboard" replace />;
    if (user?.role === 'ORGANIZATION_ADMIN') return <Navigate to="/organization/overview" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
};
