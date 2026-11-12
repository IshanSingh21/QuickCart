import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { GuestRoute } from '../components/GuestRoute';
import { useAuthStore } from '../../../store/auth-store';
import { User } from '../../../types';

const customerUser: User = {
  id: 'cust-1',
  email: 'customer@example.com',
  firstName: 'Sam',
  lastName: 'Customer',
  role: 'CUSTOMER',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
};

const LoginLocationProbe: React.FC = () => {
  const location = useLocation();
  const state = location.state as { from?: { pathname?: string }; sessionExpired?: boolean } | null;
  return (
    <div data-testid="login-screen">
      <span data-testid="from-path">{state?.from?.pathname ?? 'none'}</span>
      <span data-testid="expired-flag">{String(Boolean(state?.sessionExpired))}</span>
    </div>
  );
};

describe('ProtectedRoute & GuestRoute Guards', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      sessionExpired: false
    });
  });

  it('shows verification spinner without redirecting while session restoration is loading', () => {
    useAuthStore.setState({ isLoading: true });

    render(
      <MemoryRouter initialEntries={['/orders']}>
        <Routes>
          <Route path="/login" element={<LoginLocationProbe />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/orders" element={<div data-testid="protected-orders">Orders</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/verifying your session/i)).toBeInTheDocument();
    expect(screen.queryByTestId('login-screen')).not.toBeInTheDocument();
  });

  it('redirects unauthenticated users to /login while preserving origin location and sessionExpired state', () => {
    useAuthStore.setState({
      isLoading: false,
      isAuthenticated: false,
      sessionExpired: true
    });

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <Routes>
          <Route path="/login" element={<LoginLocationProbe />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<div data-testid="protected-profile">Profile</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('login-screen')).toBeInTheDocument();
    expect(screen.getByTestId('from-path')).toHaveTextContent('/profile');
    expect(screen.getByTestId('expired-flag')).toHaveTextContent('true');
  });

  it('renders protected content for authenticated users', () => {
    useAuthStore.setState({
      user: customerUser,
      accessToken: 'valid-jwt',
      isAuthenticated: true,
      isLoading: false
    });

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<div data-testid="protected-profile">Profile</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('protected-profile')).toBeInTheDocument();
  });

  it('blocks unauthorized roles with 403 UI without redirect loops', () => {
    useAuthStore.setState({
      user: customerUser,
      accessToken: 'valid-jwt',
      isAuthenticated: true,
      isLoading: false
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route path="/admin" element={<div data-testid="admin-panel">Admin</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
    expect(screen.queryByTestId('admin-panel')).not.toBeInTheDocument();
  });

  it('redirects already authenticated users away from GuestRoute and prevents auth redirect loops', () => {
    useAuthStore.setState({
      user: customerUser,
      accessToken: 'valid-jwt',
      isAuthenticated: true,
      isLoading: false
    });

    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { from: { pathname: '/login' } } }]}>
        <Routes>
          <Route path="/" element={<div data-testid="home-screen">Home</div>} />
          <Route element={<GuestRoute />}>
            <Route path="/login" element={<div data-testid="guest-login">Login Form</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('home-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('guest-login')).not.toBeInTheDocument();
  });
});
