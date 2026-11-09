import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { env } from './env';
import { useAuthStore } from '../store/auth-store';
import { ApiErrorResponse } from '../types/api';

export const apiClient = axios.create({
  baseURL: env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 15000,
  withCredentials: true
});

// Request Interceptor: Injects active Bearer Access Token
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const accessToken = useAuthStore.getState().accessToken;
  if (accessToken && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Mutex state for silent token refresh queue
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

// Response Interceptor: Silent Refresh on TOKEN_EXPIRED
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (!error.response || !originalRequest) {
      return Promise.reject(error);
    }

    const statusCode = error.response.status;
    const errorCode = error.response.data?.error?.code;

    // Trigger refresh only on 401 with TOKEN_EXPIRED error code
    if (statusCode === 401 && errorCode === 'TOKEN_EXPIRED' && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = useAuthStore.getState().refreshToken;
      if (!refreshToken) {
        useAuthStore.getState().logout();
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${env.VITE_API_BASE_URL}/auth/refresh-token`, {
          refreshToken
        });

        const newAccessToken = data.data.tokens.accessToken;
        const newRefreshToken = data.data.tokens.refreshToken;

        // Update tokens in auth store
        useAuthStore.getState().setTokens({
          accessToken: newAccessToken,
          refreshToken: newRefreshToken
        });

        // Resolve queued requests
        processQueue(null, newAccessToken);

        // Replay original request
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr as Error, null);
        useAuthStore.getState().logout();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
