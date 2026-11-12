import axios from 'axios';
import { env } from './env';
import { ApiResponse, RefreshTokenResponseData } from '../types';
import { readStoredRefreshToken, useAuthStore } from '../store/auth-store';

let inFlightRefresh: Promise<string> | null = null;
let authSessionVersion = 0;

/**
 * Incremented on explicit login/register/logout/clear so stale async auth operations cannot overwrite newer state.
 */
export function bumpAuthSessionVersion(): number {
  authSessionVersion += 1;
  return authSessionVersion;
}

export function getAuthSessionVersion(): number {
  return authSessionVersion;
}

/**
 * Coordinates Refresh Token Rotation (RTR) with a single shared in-flight promise.
 * Concurrent 401 TOKEN_EXPIRED responses and startup restoration share one backend call,
 * preventing duplicate requests that would trigger backend reuse-detection revocation.
 */
export async function refreshAccessToken(): Promise<string> {
  if (inFlightRefresh) {
    return inFlightRefresh;
  }

  const startVersion = authSessionVersion;
  const currentRefreshToken = useAuthStore.getState().refreshToken ?? readStoredRefreshToken();

  if (!currentRefreshToken) {
    useAuthStore.getState().clearSession({ sessionExpired: false });
    return Promise.reject(new Error('No refresh token available'));
  }

  inFlightRefresh = (async () => {
    try {
      const { data } = await axios.post<ApiResponse<RefreshTokenResponseData>>(
        `${env.VITE_API_BASE_URL}/auth/refresh-token`,
        { refreshToken: currentRefreshToken },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 15000,
          withCredentials: true
        }
      );

      const { accessToken, refreshToken } = data.data.tokens;

      // Ignore result if user logged out or switched sessions while refresh was in flight
      if (authSessionVersion !== startVersion) {
        throw new Error('Authentication session changed during token refresh');
      }

      useAuthStore.getState().setTokens({
        accessToken,
        refreshToken
      });

      return accessToken;
    } catch (error) {
      if (authSessionVersion === startVersion) {
        const isServerAuthRejection =
          axios.isAxiosError(error) && Boolean(error.response);

        if (isServerAuthRejection) {
          // Expired, revoked, malformed, or reused refresh token: wipe session & storage
          useAuthStore.getState().clearSession({ sessionExpired: true });
        } else {
          // Transient network failure: clear in-memory access token without destroying stored refresh token
          useAuthStore.getState().clearSession({
            sessionExpired: false,
            preserveRefreshToken: true
          });
        }
      }
      throw error;
    } finally {
      inFlightRefresh = null;
    }
  })();

  return inFlightRefresh;
}

/**
 * Resets internal refresh coordinator state (primarily for isolated test suites).
 */
export function resetTokenRefreshCoordinator(): void {
  inFlightRefresh = null;
  authSessionVersion += 1;
}
