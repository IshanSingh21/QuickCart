import React, { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Clock, X } from 'lucide-react';
import { HealthBanner } from '../components/layout/HealthBanner';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { CartDrawer } from '../components/common/CartDrawer';
import { SearchModal } from '../components/common/SearchModal';
import { restoreAuthSession } from '../services/auth.service';
import { useAuthStore } from '../store/auth-store';

export const RootLayout: React.FC = () => {
  const location = useLocation();
  const sessionExpired = useAuthStore((state) => state.sessionExpired);
  const dismissSessionExpired = useAuthStore((state) => state.dismissSessionExpired);

  useEffect(() => {
    void restoreAuthSession();
  }, []);

  const isOnAuthPage = location.pathname === '/login' || location.pathname === '/register';

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      {/* Live Backend Health Probe Banner */}
      <HealthBanner />

      {/* Main Navigation Header */}
      <Header />

      {/* Global Session Expiration Banner (shown on public pages when refresh fails) */}
      {sessionExpired && !isOnAuthPage && (
        <div
          role="status"
          className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-900"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Your session expired for security.{' '}
                <Link
                  to="/login"
                  state={{ from: location, sessionExpired: true }}
                  className="font-semibold underline hover:text-amber-950"
                >
                  Sign in again
                </Link>{' '}
                to sync your account and orders.
              </span>
            </div>
            <button
              type="button"
              onClick={dismissSessionExpired}
              aria-label="Dismiss session expiration notice"
              className="p-1 rounded-md text-amber-700 hover:bg-amber-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Primary Page Outlet */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Global Footer */}
      <Footer />

      {/* Global Slide-Over Cart Drawer */}
      <CartDrawer />

      {/* Global Spotlight Search Modal (Cmd+K) */}
      <SearchModal />
    </div>
  );
};
