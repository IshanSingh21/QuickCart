import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError, AxiosHeaders } from 'axios';
import { LoginPage } from '../../../pages/LoginPage';
import { RegisterPage } from '../../../pages/RegisterPage';
import { authService } from '../../../services/auth.service';
import { REFRESH_TOKEN_STORAGE_KEY, useAuthStore } from '../../../store/auth-store';
import { AuthResponseData, User } from '../../../types';

const mockUser: User = {
  id: 'user-uuid-123',
  email: 'jane@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  role: 'CUSTOMER',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
};

const mockAuthData: AuthResponseData = {
  user: mockUser,
  tokens: {
    accessToken: 'jwt-access-token',
    refreshToken: 'hex-refresh-token-12345',
    expiresIn: 900
  }
};

function renderWithProviders(
  ui: React.ReactElement,
  initialEntries: Array<string | { pathname: string; state?: unknown }> = ['/login']
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/" element={<div data-testid="home-page">Storefront Home</div>} />
          <Route path="/orders" element={<div data-testid="orders-page">Orders Workspace</div>} />
          <Route path="/login" element={ui} />
          <Route path="/register" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function makeAxiosError(status: number, data: unknown): AxiosError {
  const headers = new AxiosHeaders();
  const config = { headers };
  return new AxiosError(
    'Request failed',
    'ERR_BAD_REQUEST',
    config,
    {},
    {
      status,
      statusText: 'Error',
      headers,
      config,
      data
    }
  );
}

describe('Authentication Forms (Login & Register)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      sessionExpired: false
    });
  });

  describe('LoginPage', () => {
    it('submits valid credentials, stores access token only in memory, saves refresh token, and redirects', async () => {
      const user = userEvent.setup();
      const loginSpy = vi.spyOn(authService, 'login').mockResolvedValueOnce(mockAuthData);

      renderWithProviders(<LoginPage />, [
        { pathname: '/login', state: { from: { pathname: '/orders' } } }
      ]);

      await user.type(screen.getByLabelText(/email address/i), '  JANE@example.com  ');
      await user.type(screen.getByLabelText(/^password$/i), 'ValidPass123!');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(loginSpy).toHaveBeenCalledWith({
          email: 'jane@example.com',
          password: 'ValidPass123!'
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('orders-page')).toBeInTheDocument();
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.accessToken).toBe('jwt-access-token');
      expect(state.user?.email).toBe('jane@example.com');
      expect(localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBe('hex-refresh-token-12345');
      expect(localStorage.getItem('quickcart_user')).toBeNull();
    });

    it('displays server error on invalid credentials (401) and keeps user unauthenticated', async () => {
      const user = userEvent.setup();
      vi.spyOn(authService, 'login').mockRejectedValueOnce(
        makeAxiosError(401, {
          success: false,
          statusCode: 401,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid email or password'
          }
        })
      );

      renderWithProviders(<LoginPage />, ['/login']);

      await user.type(screen.getByLabelText(/email address/i), 'wrong@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'WrongPassword!');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('Invalid email or password');
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('toggles password visibility via accessible show/hide button', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginPage />, ['/login']);

      const passwordInput = screen.getByLabelText(/^password$/i);
      expect(passwordInput).toHaveAttribute('type', 'password');

      const toggleBtn = screen.getByRole('button', { name: /show password/i });
      await user.click(toggleBtn);
      expect(passwordInput).toHaveAttribute('type', 'text');

      await user.click(screen.getByRole('button', { name: /hide password/i }));
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('displays session expiration notice when redirected with sessionExpired state', () => {
      renderWithProviders(<LoginPage />, [
        { pathname: '/login', state: { sessionExpired: true } }
      ]);

      expect(screen.getByText(/your session has expired/i)).toBeInTheDocument();
    });
  });

  describe('RegisterPage', () => {
    it('enforces client-side Zod validation for required fields, password complexity, and confirmation match', async () => {
      const user = userEvent.setup();
      const registerSpy = vi.spyOn(authService, 'register');

      renderWithProviders(<RegisterPage />, ['/register']);

      await user.click(screen.getByRole('button', { name: /create account/i }));

      expect(await screen.findByText(/first name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/email address is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password must be at least 8 characters long/i)).toBeInTheDocument();
      expect(registerSpy).not.toHaveBeenCalled();

      await user.type(screen.getByLabelText(/first name/i), 'Jane');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email address/i), 'jane@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'StrongPass1!');
      await user.type(screen.getByLabelText(/confirm password/i), 'MismatchPass1!');

      await user.click(screen.getByRole('button', { name: /create account/i }));
      expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
      expect(registerSpy).not.toHaveBeenCalled();
    });

    it('maps server 409 conflict and submits valid registration payload cleanly', async () => {
      const user = userEvent.setup();
      const registerSpy = vi
        .spyOn(authService, 'register')
        .mockRejectedValueOnce(
          makeAxiosError(409, {
            success: false,
            statusCode: 409,
            error: {
              code: 'CONFLICT',
              message: 'An account with this email already exists'
            }
          })
        )
        .mockResolvedValueOnce(mockAuthData);

      renderWithProviders(<RegisterPage />, ['/register']);

      await user.type(screen.getByLabelText(/first name/i), 'Jane');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email address/i), 'jane@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'StrongPass1!');
      await user.type(screen.getByLabelText(/confirm password/i), 'StrongPass1!');

      await user.click(screen.getByRole('button', { name: /create account/i }));

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('An account with this email already exists');

      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(registerSpy).toHaveBeenCalledTimes(2);
        expect(screen.getByTestId('home-page')).toBeInTheDocument();
      });

      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBe('hex-refresh-token-12345');
    });
  });
});
