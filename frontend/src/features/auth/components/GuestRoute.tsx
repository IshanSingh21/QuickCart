import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../../store/auth-store';
import { LoadingSpinner } from '../../../components/ui/Spinner';
import { resolvePostAuthRedirect } from '../utils/redirect';

export interface GuestRouteProps {
  children?: React.ReactNode;
}

export const GuestRoute: React.FC<GuestRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-4"
        role="status"
        aria-live="polite"
      >
        <LoadingSpinner size="lg" />
        <p className="text-sm font-medium text-gray-500">Checking session status...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    const destination = resolvePostAuthRedirect(location.state);
    return <Navigate to={destination} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
