import { apiClient, QuickCartRequestConfig } from '../lib/api-client';
import { queryClient } from '../lib/query-client';
import { bumpAuthSessionVersion, getAuthSessionVersion, refreshAccessToken } from '../lib/token-refresh';
import { readStoredRefreshToken, useAuthStore } from '../store/auth-store';
import {
  AdminCheckResponseData,
  ApiResponse,
  AuthResponseData,
  LoginRequest,
  RegisterRequest,
  User
} from '../types';

let inFlightRestore: Promise<boolean> | null = null;

export const authService = {
  async register(payload: RegisterRequest): Promise<AuthResponseData> {
    const response = await apiClient.post<ApiResponse<AuthResponseData>>('/auth/register', payload);
    return response.data.data;
  },

  async login(payload: LoginRequest): Promise<AuthResponseData> {
    const response = await apiClient.post<ApiResponse<AuthResponseData>>('/auth/login', payload);
    return response.data.data;
  },

  async getMe(): Promise<User> {
    const response = await apiClient.get<ApiResponse<{ user: User }>>('/auth/me');
    return response.data.data.user;
  },

  async checkAdminAccess(): Promise<AdminCheckResponseData> {
    const response = await apiClient.get<ApiResponse<AdminCheckResponseData>>('/auth/admin-check');
    return response.data.data;
  },

  async logout(refreshToken?: string | null): Promise<void> {
    const config = {
      _skipAuthRefresh: true
    } as Partial<QuickCartRequestConfig>;

    await apiClient.post(
      '/auth/logout',
      refreshToken ? { refreshToken } : {},
      config
    );
  }
};

/**
 * Restores the user session on app startup using stored refresh token rotation (RTR) + /auth/me.
 * Deduplicated via a single in-flight promise to remain safe under React StrictMode double-mounts.
 */
export async function restoreAuthSession(): Promise<boolean> {
  if (inFlightRestore) {
    return inFlightRestore;
  }

  const storedRefreshToken = useAuthStore.getState().refreshToken ?? readStoredRefreshToken();
  if (!storedRefreshToken) {
    useAuthStore.getState().clearSession({ sessionExpired: false });
    return false;
  }

  const startVersion = getAuthSessionVersion();
  useAuthStore.getState().setLoading(true);

  inFlightRestore = (async () => {
    try {
      await refreshAccessToken();

      if (getAuthSessionVersion() !== startVersion) {
        return false;
      }

      const user = await authService.getMe();

      if (getAuthSessionVersion() !== startVersion) {
        return false;
      }

      useAuthStore.getState().setUser(user);
      useAuthStore.getState().setLoading(false);
      return true;
    } catch {
      if (getAuthSessionVersion() === startVersion) {
        // Note: refreshAccessToken already handled 4xx vs network clearSession semantics
        if (useAuthStore.getState().accessToken) {
          // /auth/me failed after refresh succeeded (e.g., user deactivated or missing)
          useAuthStore.getState().clearSession({ sessionExpired: true });
        } else {
          useAuthStore.getState().setLoading(false);
        }
      }
      return false;
    } finally {
      inFlightRestore = null;
    }
  })();

  return inFlightRestore;
}

/**
 * Completes authentication state after login/register and resets stale query caches.
 */
export function establishAuthSession(data: AuthResponseData): void {
  bumpAuthSessionVersion();
  useAuthStore.getState().setAuth(data.user, data.tokens);
  queryClient.setQueryData(['auth', 'me'], data.user);
}

/**
 * Revokes backend refresh token (best-effort) and guarantees complete client session termination.
 */
export async function performLogout(): Promise<void> {
  const currentRefreshToken = useAuthStore.getState().refreshToken ?? readStoredRefreshToken();
  const currentAccessToken = useAuthStore.getState().accessToken;

  bumpAuthSessionVersion();

  try {
    if (currentRefreshToken || currentAccessToken) {
      await authService.logout(currentRefreshToken);
    }
  } catch {
    // Always terminate local session even if backend token is already expired or server is unreachable
  } finally {
    useAuthStore.getState().clearSession({ sessionExpired: false });
    queryClient.removeQueries({ queryKey: ['auth'] });
    queryClient.removeQueries({ queryKey: ['cart'] });
    queryClient.removeQueries({ queryKey: ['orders'] });
  }
}

export function resetRestoreSessionGuard(): void {
  inFlightRestore = null;
}
