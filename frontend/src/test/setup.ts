import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { useAuthStore } from '../store/auth-store';
import { resetTokenRefreshCoordinator } from '../lib/token-refresh';
import { resetRestoreSessionGuard } from '../services/auth.service';
import { queryClient } from '../lib/query-client';

if (typeof window !== 'undefined') {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  queryClient.clear();
  resetTokenRefreshCoordinator();
  resetRestoreSessionGuard();
  useAuthStore.setState({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: false,
    sessionExpired: false
  });
});
