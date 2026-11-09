import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { HealthBanner } from '../components/layout/HealthBanner';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { useAuthStore } from '../store/auth-store';

export const RootLayout: React.FC = () => {
  const initAuth = useAuthStore((state) => state.initAuth);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      {/* Live Backend Health Probe Banner */}
      <HealthBanner />

      {/* Main Navigation Header */}
      <Header />

      {/* Primary Page Outlet */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Global Footer */}
      <Footer />
    </div>
  );
};
