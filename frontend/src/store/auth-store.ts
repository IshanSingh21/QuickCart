import { create } from 'zustand';
import { User, AuthTokens } from '../types/auth';

export const REFRESH_TOKEN_STORAGE_KEY = 'quickcart_refresh_token';
const LEGACY_USER_STORAGE_KEY = 'quickcart_user';

export function readStoredRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredRefreshToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    }
    // Ensure legacy PII storage is always removed
    localStorage.removeItem(LEGACY_USER_STORAGE_KEY);
  } catch {
    // Ignore storage access errors in restricted browser contexts
  }
}

interface ClearSessionOptions {
  sessionExpired?: boolean;
  preserveRefreshToken?: boolean;
}

interface AuthState {
  user: User | null;
  /** Short-lived JWT stored strictly in memory to protect against XSS extraction */
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionExpired: boolean;
  setAuth: (user: User, tokens: AuthTokens) => void;
  setTokens: (tokens: Partial<AuthTokens>) => void;
  setUser: (user: User | null) => void;
  setLoading: (isLoading: boolean) => void;
  clearSession: (options?: ClearSessionOptions) => void;
  dismissSessionExpired: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: readStoredRefreshToken(),
  isAuthenticated: false,
  isLoading: true,
  sessionExpired: false,

  setAuth: (user: User, tokens: AuthTokens) => {
    writeStoredRefreshToken(tokens.refreshToken);
    set({
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      isAuthenticated: true,
      isLoading: false,
      sessionExpired: false
    });
  },

  setTokens: (tokens: Partial<AuthTokens>) => {
    set((state) => {
      const nextRefreshToken = tokens.refreshToken ?? state.refreshToken;
      if (tokens.refreshToken) {
        writeStoredRefreshToken(tokens.refreshToken);
      }
      return {
        accessToken: tokens.accessToken ?? state.accessToken,
        refreshToken: nextRefreshToken,
        isAuthenticated: Boolean(tokens.accessToken ?? state.accessToken),
        sessionExpired: false
      };
    });
  },

  setUser: (user: User | null) => {
    set({ user });
  },

  setLoading: (isLoading: boolean) => {
    set({ isLoading });
  },

  clearSession: (options?: ClearSessionOptions) => {
    if (!options?.preserveRefreshToken) {
      writeStoredRefreshToken(null);
    }
    set((state) => ({
      user: null,
      accessToken: null,
      refreshToken: options?.preserveRefreshToken ? state.refreshToken : null,
      isAuthenticated: false,
      isLoading: false,
      sessionExpired: Boolean(options?.sessionExpired)
    }));
  },

  dismissSessionExpired: () => {
    set({ sessionExpired: false });
  }
}));
