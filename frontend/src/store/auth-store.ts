import { create } from 'zustand';
import { User, AuthTokens } from '../types/auth';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, tokens: AuthTokens) => void;
  setTokens: (tokens: Partial<AuthTokens>) => void;
  setUser: (user: User | null) => void;
  logout: () => void;
  initAuth: () => void;
}

const REFRESH_TOKEN_KEY = 'quickcart_refresh_token';
const USER_KEY = 'quickcart_user';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,

  initAuth: () => {
    try {
      const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);

      if (storedRefreshToken && storedUser) {
        const parsedUser = JSON.parse(storedUser) as User;
        set({
          user: parsedUser,
          refreshToken: storedRefreshToken,
          isAuthenticated: true,
          isLoading: false
        });
        return;
      }
    } catch {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
    set({ isLoading: false });
  },

  setAuth: (user: User, tokens: AuthTokens) => {
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      isAuthenticated: true,
      isLoading: false
    });
  },

  setTokens: (tokens: Partial<AuthTokens>) => {
    set((state) => {
      const newRefreshToken = tokens.refreshToken || state.refreshToken;
      if (newRefreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
      }
      return {
        accessToken: tokens.accessToken || state.accessToken,
        refreshToken: newRefreshToken,
        isAuthenticated: true
      };
    });
  },

  setUser: (user: User | null) => {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
    set({ user });
  },

  logout: () => {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false
    });
  }
}));
