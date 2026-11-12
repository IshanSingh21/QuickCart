import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { env } from './env';
import { useAuthStore } from '../store/auth-store';
import { refreshAccessToken } from './token-refresh';
import { ApiErrorResponse } from '../types/api';

export interface QuickCartRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _skipAuthRefresh?: boolean;
}

const AUTH_ENDPOINTS_WITHOUT_REFRESH = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh-token',
  '/auth/logout'
];

function shouldSkipRefresh(config: QuickCartRequestConfig): boolean {
  if (config._skipAuthRefresh || config._retry) {
    return true;
  }
  const url = config.url ?? '';
  return AUTH_ENDPOINTS_WITHOUT_REFRESH.some((endpoint) => url.includes(endpoint));
}

function setAuthorizationHeader(config: InternalAxiosRequestConfig, token: string): void {
  if (typeof config.headers?.set === 'function') {
    config.headers.set('Authorization', `Bearer ${token}`);
  } else {
    config.headers = config.headers ?? ({} as InternalAxiosRequestConfig['headers']);
    config.headers.Authorization = `Bearer ${token}`;
  }
}

export const apiClient = axios.create({
  baseURL: env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 15000,
  withCredentials: true
});

// Request Interceptor: Injects active in-memory Bearer Access Token
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const accessToken = useAuthStore.getState().accessToken;
  const hasAuthHeader =
    typeof config.headers?.get === 'function'
      ? Boolean(config.headers.get('Authorization'))
      : Boolean(config.headers?.Authorization);

  if (accessToken && !hasAuthHeader) {
    setAuthorizationHeader(config, accessToken);
  }
  return config;
});

// Response Interceptor: Handles 401 TOKEN_EXPIRED with deduplicated silent RTR
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as QuickCartRequestConfig | undefined;

    if (!error.response || !originalRequest) {
      return Promise.reject(error);
    }

    const statusCode = error.response.status;
    const errorCode = error.response.data?.error?.code;

    if (statusCode === 401 && !shouldSkipRefresh(originalRequest)) {
      if (errorCode === 'TOKEN_EXPIRED') {
        originalRequest._retry = true;

        try {
          const newAccessToken = await refreshAccessToken();
          setAuthorizationHeader(originalRequest, newAccessToken);
          return apiClient(originalRequest);
        } catch (refreshError) {
          return Promise.reject(refreshError);
        }
      }

      // Invalid/tampered token or unexpected unauthorized while store believed session was valid
      if (errorCode === 'INVALID_TOKEN' || useAuthStore.getState().isAuthenticated) {
        useAuthStore.getState().clearSession({ sessionExpired: true });
      }
    }

    return Promise.reject(error);
  }
);
