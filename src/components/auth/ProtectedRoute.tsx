import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import type { UserRole } from '../../types';
import { ROUTES } from '../../config/constants';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { currentUser, customClaims, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg
            className="animate-spin h-12 w-12 text-teal-500 mx-auto mb-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="text-sage-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  // Check role-based access
  if (allowedRoles && customClaims?.role) {
    if (!allowedRoles.includes(customClaims.role)) {
      // Redirect to appropriate dashboard
      const dashboardRoutes: Record<UserRole, string> = {
        THERAPIST: ROUTES.THERAPIST_DASHBOARD,
        PATIENT: ROUTES.PATIENT_DASHBOARD,
        ADMIN: ROUTES.ADMIN_DASHBOARD,
      };

      return <Navigate to={dashboardRoutes[customClaims.role]} replace />;
    }
  }

  return <>{children}</>;
}
