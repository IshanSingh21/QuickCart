import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios, { AxiosAdapter, AxiosError, AxiosHeaders, InternalAxiosRequestConfig } from 'axios';
import { apiClient } from '../../../lib/api-client';
import { performLogout, restoreAuthSession } from '../../../services/auth.service';
import { REFRESH_TOKEN_STORAGE_KEY, useAuthStore } from '../../../store/auth-store';
import { User } from '../../../types';

const sampleUser: User = {
  id: 'user-uuid-1',
  email: 'customer@example.com',
  firstName: 'Alex',
  lastName: 'Mercer',
  role: 'CUSTOMER',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
};

function makeAxiosRejection(
  config: InternalAxiosRequestConfig,
  status: number,
  data: unknown
): AxiosError {
  return new AxiosError(
    `Request failed with status code ${status}`,
    'ERR_BAD_REQUEST',
    config,
    {},
    {
      status,
      statusText: status === 401 ? 'Unauthorized' : 'Error',
      headers: new AxiosHeaders(),
      config,
      data
    }
  );
}

function getAuthHeader(config: InternalAxiosRequestConfig): string | undefined {
  if (typeof config.headers?.get === 'function') {
    const val = config.headers.get('Authorization');
    return typeof val === 'string' ? val : undefined;
  }
  return config.headers?.Authorization as string | undefined;
}

describe('Authentication Token Lifecycle & Interceptors', () => {
  const originalApiAdapter = apiClient.defaults.adapter;
  const originalAxiosAdapter = axios.defaults.adapter;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    apiClient.defaults.adapter = originalApiAdapter;
    axios.defaults.adapter = originalAxiosAdapter;
  });

  it('handles expired access token with a single deduplicated refresh request across concurrent calls and replays both', async () => {
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, 'refresh-token-v1');
    useAuthStore.setState({
      user: sampleUser,
      accessToken: 'expired-access-jwt',
      refreshToken: 'refresh-token-v1',
      isAuthenticated: true,
      isLoading: false,
      sessionExpired: false
    });

    let refreshCallCount = 0;

    const mockAdapter: AxiosAdapter = async (config) => {
      const url = config.url ?? '';
      const authHeader = getAuthHeader(config);

      if (url.includes('/auth/refresh-token')) {
        refreshCallCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 20));
        return {
          status: 200,
          statusText: 'OK',
          headers: new AxiosHeaders(),
          config,
          data: {
            success: true,
            statusCode: 200,
            message: 'Tokens refreshed successfully',
            data: {
              tokens: {
                accessToken: 'fresh-access-jwt',
                refreshToken: 'refresh-token-v2',
                expiresIn: 900
              }
            }
          }
        };
      }

      if (authHeader === 'Bearer expired-access-jwt') {
        throw makeAxiosRejection(config, 401, {
          success: false,
          statusCode: 401,
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Access token has expired'
          }
        });
      }

      if (authHeader === 'Bearer fresh-access-jwt') {
        return {
          status: 200,
          statusText: 'OK',
          headers: new AxiosHeaders(),
          config,
          data: { success: true, data: { endpoint: url } }
        };
      }

      throw makeAxiosRejection(config, 401, {
        success: false,
        statusCode: 401,
        error: { code: 'UNAUTHORIZED', message: 'Missing token' }
      });
    };

    apiClient.defaults.adapter = mockAdapter;
    axios.defaults.adapter = mockAdapter;

    const [ordersRes, cartRes] = await Promise.all([
      apiClient.get('/orders'),
      apiClient.get('/cart')
    ]);

    expect(refreshCallCount).toBe(1);
    expect(ordersRes.data.data.endpoint).toBe('/orders');
    expect(cartRes.data.data.endpoint).toBe('/cart');

    expect(useAuthStore.getState().accessToken).toBe('fresh-access-jwt');
    expect(useAuthStore.getState().refreshToken).toBe('refresh-token-v2');
    expect(localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBe('refresh-token-v2');
  });

  it('clears session and marks sessionExpired when refresh token fails (401 reuse/expiration) without looping', async () => {
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, 'compromised-refresh-token');
    useAuthStore.setState({
      user: sampleUser,
      accessToken: 'expired-access-jwt',
      refreshToken: 'compromised-refresh-token',
      isAuthenticated: true,
      isLoading: false,
      sessionExpired: false
    });

    let refreshCallCount = 0;

    const mockAdapter: AxiosAdapter = async (config) => {
      const url = config.url ?? '';

      if (url.includes('/auth/refresh-token')) {
        refreshCallCount += 1;
        throw makeAxiosRejection(config, 401, {
          success: false,
          statusCode: 401,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid refresh token. Session terminated for security.'
          }
        });
      }

      throw makeAxiosRejection(config, 401, {
        success: false,
        statusCode: 401,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Access token has expired'
        }
      });
    };

    apiClient.defaults.adapter = mockAdapter;
    axios.defaults.adapter = mockAdapter;

    await expect(apiClient.get('/orders')).rejects.toThrow();

    expect(refreshCallCount).toBe(1);
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.sessionExpired).toBe(true);
    expect(localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBeNull();
  });

  it('revokes refresh token on logout and guarantees local cleanup even if server fails', async () => {
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, 'active-refresh-token');
    useAuthStore.setState({
      user: sampleUser,
      accessToken: 'active-access-jwt',
      refreshToken: 'active-refresh-token',
      isAuthenticated: true,
      isLoading: false,
      sessionExpired: false
    });

    let capturedBody: unknown = null;
    let logoutCalled = 0;

    const mockAdapter: AxiosAdapter = async (config) => {
      if (config.url?.includes('/auth/logout')) {
        logoutCalled += 1;
        capturedBody = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
        throw makeAxiosRejection(config, 500, {
          success: false,
          statusCode: 500,
          error: { code: 'INTERNAL_ERROR', message: 'Server unavailable' }
        });
      }
      throw new Error('Unexpected request');
    };

    apiClient.defaults.adapter = mockAdapter;
    axios.defaults.adapter = mockAdapter;

    await performLogout();

    expect(logoutCalled).toBe(1);
    expect(capturedBody).toEqual({ refreshToken: 'active-refresh-token' });

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.user).toBeNull();
    expect(state.sessionExpired).toBe(false);
    expect(localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBeNull();
  });

  it('deduplicates concurrent startup session restoration calls (React StrictMode safety)', async () => {
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, 'stored-refresh-v1');
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: 'stored-refresh-v1',
      isAuthenticated: false,
      isLoading: true,
      sessionExpired: false
    });

    let refreshCount = 0;
    let meCount = 0;

    const mockAdapter: AxiosAdapter = async (config) => {
      const url = config.url ?? '';
      if (url.includes('/auth/refresh-token')) {
        refreshCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 15));
        return {
          status: 200,
          statusText: 'OK',
          headers: new AxiosHeaders(),
          config,
          data: {
            success: true,
            statusCode: 200,
            message: 'Refreshed',
            data: {
              tokens: {
                accessToken: 'restored-access-jwt',
                refreshToken: 'stored-refresh-v2',
                expiresIn: 900
              }
            }
          }
        };
      }

      if (url.includes('/auth/me')) {
        meCount += 1;
        expect(getAuthHeader(config)).toBe('Bearer restored-access-jwt');
        return {
          status: 200,
          statusText: 'OK',
          headers: new AxiosHeaders(),
          config,
          data: {
            success: true,
            statusCode: 200,
            message: 'User fetched',
            data: { user: sampleUser }
          }
        };
      }

      throw new Error(`Unhandled url ${url}`);
    };

    apiClient.defaults.adapter = mockAdapter;
    axios.defaults.adapter = mockAdapter;

    const [firstResult, secondResult] = await Promise.all([
      restoreAuthSession(),
      restoreAuthSession()
    ]);

    expect(firstResult).toBe(true);
    expect(secondResult).toBe(true);
    expect(refreshCount).toBe(1);
    expect(meCount).toBe(1);

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.isLoading).toBe(false);
    expect(state.accessToken).toBe('restored-access-jwt');
    expect(state.refreshToken).toBe('stored-refresh-v2');
    expect(state.user).toEqual(sampleUser);
  });
});
