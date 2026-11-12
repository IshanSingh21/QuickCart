import React from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuthStore } from '../../../store/auth-store';
import { UserRole } from '../../../types';
import { LoadingSpinner } from '../../../components/ui/Spinner';
import { Button } from '../../../components/ui/Button';

export interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { isAuthenticated, isLoading, user, sessionExpired } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-4"
        role="status"
        aria-live="polite"
      >
        <LoadingSpinner size="lg" />
        <p className="text-sm font-medium text-gray-500">Verifying your session...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    // Guard against redirect loops if current path is an auth screen
    const isAuthPath = location.pathname === '/login' || location.pathname === '/register';
    const fromLocation = isAuthPath ? { pathname: '/' } : location;

    return (
      <Navigate
        to="/login"
        state={{ from: fromLocation, sessionExpired }}
        replace
      />
    );
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Access Restricted</h1>
        <p className="text-sm text-gray-600">
          Your account role (<span className="font-mono font-semibold">{user.role}</span>) does not have permission to view this page.
        </p>
        <div className="pt-2">
          <Link to="/">
            <Button variant="primary" size="md">
              Return to Storefront
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
};
