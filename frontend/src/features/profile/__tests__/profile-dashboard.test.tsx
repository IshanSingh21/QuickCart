import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError, AxiosHeaders } from 'axios';
import { ProfilePage } from '../../../pages/ProfilePage';
import { OrdersPage } from '../../../pages/OrdersPage';
import { OrderDetailPage } from '../../../pages/OrderDetailPage';
import { authService } from '../../../services/auth.service';
import { ordersService } from '../../../services/orders.service';
import { paymentsService } from '../../../services/payments.service';
import { useAuthStore } from '../../../store/auth-store';
import { User, Order, Payment } from '../../../types';

const mockCustomer: User = {
  id: 'usr-customer-1',
  email: 'sarah.connor@example.com',
  firstName: 'Sarah',
  lastName: 'Connor',
  role: 'CUSTOMER',
  isActive: true,
  createdAt: '2026-02-10T08:30:00.000Z',
  updatedAt: '2026-02-10T08:30:00.000Z'
};

const mockOrderPending: Order = {
  id: 'ord-pending-1',
  orderNumber: 'ORD-2026-PENDING-01',
  userId: 'usr-customer-1',
  status: 'PENDING_PAYMENT',
  subtotal: '120.00',
  taxAmount: '0.00',
  shippingAmount: '0.00',
  totalAmount: '120.00',
  currency: 'USD',
  idempotencyKey: 'idemp-pending-01',
  shippingAddress: {
    fullName: 'Sarah Connor',
    addressLine1: '404 Resistance Blvd',
    addressLine2: 'Suite 101',
    city: 'Los Angeles',
    state: 'CA',
    postalCode: '90001',
    country: 'United States',
    phone: '213-555-0199'
  },
  itemCount: 1,
  items: [
    {
      id: 'item-1',
      productId: 'prod-cyber-1',
      productName: 'Tactical Watch Pro',
      productSku: 'WATCH-TAC-01',
      unitPrice: '120.00',
      quantity: 1,
      lineTotal: '120.00',
      createdAt: new Date().toISOString()
    }
  ],
  payments: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const mockOrderPaid: Order = {
  id: 'ord-paid-2',
  orderNumber: 'ORD-2026-PAID-02',
  userId: 'usr-customer-1',
  status: 'PAID',
  subtotal: '250.00',
  taxAmount: '0.00',
  shippingAmount: '0.00',
  totalAmount: '250.00',
  currency: 'USD',
  idempotencyKey: 'idemp-paid-02',
  shippingAddress: {
    fullName: 'Sarah Connor',
    addressLine1: '404 Resistance Blvd',
    city: 'Los Angeles',
    state: 'CA',
    postalCode: '90001',
    country: 'United States',
    phone: '213-555-0199'
  },
  itemCount: 2,
  items: [
    {
      id: 'item-2',
      productId: 'prod-boots-2',
      productName: 'Combat Boots Elite',
      productSku: 'BOOT-CMB-02',
      unitPrice: '125.00',
      quantity: 2,
      lineTotal: '250.00',
      createdAt: new Date().toISOString()
    }
  ],
  payments: [],
  createdAt: '2026-03-01T12:00:00.000Z',
  updatedAt: '2026-03-01T12:05:00.000Z'
};

const mockOrderCancelled: Order = {
  id: 'ord-cancelled-3',
  orderNumber: 'ORD-2026-CANC-03',
  userId: 'usr-customer-1',
  status: 'CANCELLED',
  subtotal: '85.00',
  taxAmount: '0.00',
  shippingAmount: '0.00',
  totalAmount: '85.00',
  currency: 'USD',
  idempotencyKey: 'idemp-canc-03',
  shippingAddress: {
    fullName: 'Sarah Connor',
    addressLine1: '404 Resistance Blvd',
    city: 'Los Angeles',
    state: 'CA',
    postalCode: '90001',
    country: 'United States',
    phone: '213-555-0199'
  },
  itemCount: 1,
  items: [
    {
      id: 'item-3',
      productId: 'prod-sunglasses-3',
      productName: 'Polarized Sunglasses',
      productSku: 'SUN-POL-03',
      unitPrice: '85.00',
      quantity: 1,
      lineTotal: '85.00',
      createdAt: new Date().toISOString()
    }
  ],
  payments: [],
  createdAt: '2026-02-20T10:00:00.000Z',
  updatedAt: '2026-02-20T10:30:00.000Z'
};

const mockPaymentsForPaidOrder: Payment[] = [
  {
    id: 'pay-uuid-paid-1',
    orderId: 'ord-paid-2',
    paymentIntentId: 'pi_sim_999888777',
    idempotencyKey: 'idemp_pay_mock_1',
    provider: 'SIMULATED',
    status: 'SUCCEEDED',
    amount: '250.00',
    currency: 'USD',
    gatewayResponse: null,
    createdAt: '2026-03-01T12:05:00.000Z',
    updatedAt: '2026-03-01T12:05:00.000Z'
  }
];

const renderWithProviders = (initialRoute = '/profile') => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false }
    }
  });

  return {
    user: userEvent.setup(),
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialRoute]}>
          <Routes>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/:orderId" element={<OrderDetailPage />} />
            <Route path="/checkout/status/:orderId" element={<div>Checkout Payment View</div>} />
            <Route path="/checkout/confirmation/:orderId" element={<div>Checkout Receipt View</div>} />
            <Route path="/login" element={<div>Login Page Redirect</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
  };
};

describe('Phase 7: User Dashboard and Order Management', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    useAuthStore.getState().setAuth(mockCustomer, {
      accessToken: 'valid-token-mock',
      refreshToken: 'valid-refresh-mock',
      expiresIn: 900
    });

    vi.spyOn(authService, 'getMe').mockResolvedValue(mockCustomer);
    vi.spyOn(ordersService, 'getMyOrders').mockResolvedValue({
      orders: [mockOrderPending, mockOrderPaid, mockOrderCancelled],
      meta: { total: 3, page: 1, limit: 10, totalPages: 1 }
    });
    vi.spyOn(ordersService, 'getOrderById').mockImplementation(async (id: string) => {
      if (id === mockOrderPending.id) return mockOrderPending;
      if (id === mockOrderPaid.id) return mockOrderPaid;
      if (id === mockOrderCancelled.id) return mockOrderCancelled;
      const err = new AxiosError('Order not found', 'ERR_NOT_FOUND', undefined, undefined, {
        status: 404,
        statusText: 'Not Found',
        data: {
          success: false,
          statusCode: 404,
          error: {
            code: 'NOT_FOUND',
            message: 'Order not found or access denied'
          }
        },
        headers: {},
        config: { headers: new AxiosHeaders() }
      });
      throw err;
    });
    vi.spyOn(paymentsService, 'getOrderPayments').mockImplementation(async (orderId: string) => {
      if (orderId === mockOrderPaid.id) {
        return mockPaymentsForPaidOrder;
      }
      return [];
    });
    vi.spyOn(authService, 'logout').mockResolvedValue();
  });

  describe('Account Overview & Metrics', () => {
    it('renders user details, account metrics and recent orders preview', async () => {
      renderWithProviders('/profile');

      // Verify User Details
      expect(await screen.findByText('Sarah Connor')).toBeInTheDocument();
      expect(screen.getByText('sarah.connor@example.com')).toBeInTheDocument();
      expect(screen.getByText('CUSTOMER')).toBeInTheDocument();

      // Verify Dashboard Metrics (3 total orders, 1 completed/paid, 1 pending, total spent $250.00)
      expect(screen.getByText('Total Orders')).toBeInTheDocument();
      expect(screen.getByText('Completed Orders')).toBeInTheDocument();
      expect(screen.getByText('Pending Payment')).toBeInTheDocument();
      expect(screen.getByText('Total Spend')).toBeInTheDocument();

      // Verify Recent Orders in preview
      expect(await screen.findByText('ORD-2026-PENDING-01')).toBeInTheDocument();
      expect(screen.getByText('ORD-2026-PAID-02')).toBeInTheDocument();
      expect(screen.getByText('ORD-2026-CANC-03')).toBeInTheDocument();
    });
  });

  describe('Profile Information (Read-Only Identity)', () => {
    it('displays verified read-only identity credentials and role status', async () => {
      const { user } = renderWithProviders('/profile');

      // Switch to Profile tab
      const profileTab = await screen.findByRole('button', { name: /profile & address book/i });
      await user.click(profileTab);

      // Verify Profile details card
      expect(screen.getByText('Profile Identity')).toBeInTheDocument();
      expect(screen.getByText('usr-customer-1')).toBeInTheDocument();

      // Verify read-only identity disclaimer
      expect(
        screen.getByText(/Profile identity is verified by QuickCart auth service/i)
      ).toBeInTheDocument();
    });
  });

  describe('Saved Shipping Address Management', () => {
    it('manages local shipping address saving and clearing', async () => {
      const { user } = renderWithProviders('/profile');

      // Switch to Profile tab
      const profileTab = await screen.findByRole('button', { name: /profile & address book/i });
      await user.click(profileTab);

      // Verify initially empty address state
      expect(screen.getByText(/No default address saved yet/i)).toBeInTheDocument();

      // Click Add Address
      const addBtn = screen.getByRole('button', { name: /add shipping address/i });
      await user.click(addBtn);

      // Fill modal form
      expect(screen.getByText('Delivery Address')).toBeInTheDocument();
      await user.clear(screen.getByLabelText(/full name/i));
      await user.type(screen.getByLabelText(/full name/i), 'Sarah J. Connor');
      await user.type(screen.getByLabelText(/street address/i), '123 Resistance Way');
      await user.type(screen.getByLabelText(/city/i), 'Pasadena');
      await user.type(screen.getByLabelText(/state \/ province/i), 'CA');
      await user.type(screen.getByLabelText(/postal code/i), '91101');
      await user.type(screen.getByLabelText(/phone/i), '213-555-9999');

      // Submit
      const saveBtn = screen.getByRole('button', { name: /save address/i });
      await user.click(saveBtn);

      // Check modal closed and address is rendered
      await waitFor(() => {
        expect(screen.getByText('Sarah J. Connor')).toBeInTheDocument();
        expect(screen.getByText('123 Resistance Way')).toBeInTheDocument();
        expect(screen.getByText(/Pasadena, CA 91101/i)).toBeInTheDocument();
      });

      // Verify saved to localStorage
      expect(localStorage.getItem('quickcart_saved_address')).toContain('123 Resistance Way');

      // Clear address
      const clearBtn = screen.getByTitle('Remove Saved Address');
      await user.click(clearBtn);

      await waitFor(() => {
        expect(screen.getByText(/No default address saved yet/i)).toBeInTheDocument();
        expect(localStorage.getItem('quickcart_saved_address')).toBeNull();
      });
    });
  });

  describe('Session Security & Role-Based Access Control', () => {
    it('shows token security posture and verifies RBAC permissions', async () => {
      const checkAdminSpy = vi.spyOn(authService, 'checkAdminAccess').mockResolvedValue({
        authorized: true,
        user: {
          id: mockCustomer.id,
          email: mockCustomer.email,
          role: 'ADMIN'
        }
      });

      const { user } = renderWithProviders('/profile');

      // Switch to Security tab
      const securityTab = await screen.findByRole('button', { name: /security & posture/i });
      await user.click(securityTab);

      // Verify token architecture badges
      expect(screen.getByText('Token & Session Posture')).toBeInTheDocument();
      expect(screen.getByText('Memory Only (XSS-Safe)')).toBeInTheDocument();
      expect(screen.getByText('RTR Single-Use Rotation')).toBeInTheDocument();
      expect(screen.getByText('Single Flight Queue')).toBeInTheDocument();
      expect(screen.getByText(/Zero JWT tokens stored in localStorage/i)).toBeInTheDocument();

      // Test RBAC check
      const checkBtn = screen.getByRole('button', { name: /verify admin role privileges/i });
      await user.click(checkBtn);

      expect(checkAdminSpy).toHaveBeenCalledTimes(1);
      await waitFor(() => {
        expect(screen.getByText(/Your session holds active ADMIN privileges/i)).toBeInTheDocument();
      });
    });

    it('handles RBAC unauthorized check gracefully for regular customer', async () => {
      const forbiddenError = new AxiosError('Forbidden', 'ERR_FORBIDDEN', undefined, undefined, {
        status: 403,
        statusText: 'Forbidden',
        data: {
          success: false,
          statusCode: 403,
          error: {
            code: 'FORBIDDEN',
            message: 'Requires ADMIN privileges'
          }
        },
        headers: {},
        config: { headers: new AxiosHeaders() }
      });
      vi.spyOn(authService, 'checkAdminAccess').mockRejectedValue(forbiddenError);

      const { user } = renderWithProviders('/profile');

      const securityTab = await screen.findByRole('button', { name: /security & posture/i });
      await user.click(securityTab);

      const checkBtn = screen.getByRole('button', { name: /verify admin role privileges/i });
      await user.click(checkBtn);

      await waitFor(() => {
        expect(screen.getByText(/Requires ADMIN privileges/i)).toBeInTheDocument();
      });
    });
  });

  describe('Order History Listing (OrdersPage)', () => {
    it('filters orders by status tab and search query', async () => {
      const { user } = renderWithProviders('/orders');

      // Check all 3 orders render initially
      expect(await screen.findByText('ORD-2026-PENDING-01')).toBeInTheDocument();
      expect(screen.getByText('ORD-2026-PAID-02')).toBeInTheDocument();
      expect(screen.getByText('ORD-2026-CANC-03')).toBeInTheDocument();

      // Filter by Paid & Settled
      const paidTab = screen.getByRole('button', { name: /paid & settled/i });
      await user.click(paidTab);

      // Verify getMyOrders was called with status filter
      expect(ordersService.getMyOrders).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'PAID' })
      );

      // Live search input filtering
      const searchInput = screen.getByPlaceholderText(/search by order # or item/i);
      await user.type(searchInput, 'PENDING');

      // The live search filters down to matching order
      expect(screen.getByText('ORD-2026-PENDING-01')).toBeInTheDocument();
      expect(screen.queryByText('ORD-2026-PAID-02')).not.toBeInTheDocument();
    });

    it('shows empty state when no orders match', async () => {
      vi.spyOn(ordersService, 'getMyOrders').mockResolvedValue({
        orders: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 }
      });

      renderWithProviders('/orders');

      expect(await screen.findByText('No Orders Found')).toBeInTheDocument();
    });
  });

  describe('Order Details View (OrderDetailPage)', () => {
    it('renders order progress tracker, item snapshots, delivery destination, and countdown timer for pending orders', async () => {
      renderWithProviders(`/orders/${mockOrderPending.id}`);

      // Order number and status
      expect(await screen.findByRole('heading', { name: 'ORD-2026-PENDING-01' })).toBeInTheDocument();
      expect(screen.getByText('PENDING_PAYMENT')).toBeInTheDocument();

      // Progress Stepper stages
      expect(screen.getByText('Order Placed')).toBeInTheDocument();
      expect(screen.getByText('Payment Confirmed')).toBeInTheDocument();
      expect(screen.getByText('Processing')).toBeInTheDocument();
      expect(screen.getByText('Delivered')).toBeInTheDocument();

      // 15-minute countdown alert and Complete Payment button
      expect(screen.getByText(/Payment Action Required/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /complete payment/i })).toBeInTheDocument();

      // Items snapshot
      expect(screen.getByText('Tactical Watch Pro')).toBeInTheDocument();
      expect(screen.getByText('WATCH-TAC-01')).toBeInTheDocument();

      // Shipping address
      expect(screen.getByText('404 Resistance Blvd')).toBeInTheDocument();
      expect(screen.getByText(/Los Angeles, CA 90001/i)).toBeInTheDocument();
    });

    it('allows cancelling a PENDING_PAYMENT order with restock confirmation', async () => {
      const cancelSpy = vi.spyOn(ordersService, 'cancelOrder').mockResolvedValue({
        ...mockOrderPending,
        status: 'CANCELLED'
      });

      const { user } = renderWithProviders(`/orders/${mockOrderPending.id}`);

      // Cancel button should be available for pending orders
      const cancelBtn = await screen.findByRole('button', { name: /cancel order/i });
      expect(cancelBtn).toBeInTheDocument();
      await user.click(cancelBtn);

      // Confirmation modal
      expect(screen.getByText('Cancel This Order?')).toBeInTheDocument();
      expect(
        screen.getByText(/Cancelling will release reserved stock back into available inventory/i)
      ).toBeInTheDocument();

      // Confirm cancellation
      const confirmBtn = screen.getByRole('button', { name: /confirm cancellation/i });
      await user.click(confirmBtn);

      expect(cancelSpy).toHaveBeenCalledWith('ord-pending-1');
    });

    it('does not display cancellation button for PAID orders and renders payment verification ledger', async () => {
      renderWithProviders(`/orders/${mockOrderPaid.id}`);

      // Paid order details
      expect(await screen.findByRole('heading', { name: 'ORD-2026-PAID-02' })).toBeInTheDocument();
      expect(screen.getByText('Combat Boots Elite')).toBeInTheDocument();

      // Cancellation should NOT be available
      expect(screen.queryByRole('button', { name: /cancel order/i })).not.toBeInTheDocument();

      // Payment ledger breakdown
      expect(screen.getByText('Payment Verification Ledger')).toBeInTheDocument();
      expect(screen.getByText(/Intent: pi_sim_999888777/i)).toBeInTheDocument();
      expect(screen.getByText('SIMULATED')).toBeInTheDocument();
      expect(screen.getByText('SUCCEEDED')).toBeInTheDocument();
    });

    it('renders safe 404 error state preventing IDOR when order is not found or belongs to another user', async () => {
      renderWithProviders('/orders/unauthorized-order-999');

      expect(await screen.findByText('Order Not Found')).toBeInTheDocument();
      expect(screen.getByText('Order not found or access denied')).toBeInTheDocument();
    });
  });

  describe('User Logout', () => {
    it('executes logout mutation, clears authentication state, and redirects to login', async () => {
      const { user } = renderWithProviders('/profile');

      const logoutBtn = await screen.findByRole('button', { name: /sign out/i });
      await user.click(logoutBtn);

      expect(authService.logout).toHaveBeenCalledTimes(1);
      await waitFor(() => {
        expect(useAuthStore.getState().isAuthenticated).toBe(false);
        expect(useAuthStore.getState().user).toBeNull();
        expect(screen.getByText('Login Page Redirect')).toBeInTheDocument();
      });
    });
  });
});
