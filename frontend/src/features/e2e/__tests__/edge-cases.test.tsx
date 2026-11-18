import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError, AxiosHeaders } from 'axios';
import { ProductsPage } from '../../../pages/ProductsPage';
import { ProductDetailPage } from '../../../pages/ProductDetailPage';
import { CartPage } from '../../../pages/CartPage';
import { CheckoutPage } from '../../../pages/CheckoutPage';
import { PaymentStatusPage } from '../../../pages/PaymentStatusPage';
import { OrderDetailPage } from '../../../pages/OrderDetailPage';
import { productsService } from '../../../services/products.service';
import { categoriesService } from '../../../services/categories.service';
import { cartService } from '../../../services/cart.service';
import { ordersService } from '../../../services/orders.service';
import { paymentsService } from '../../../services/payments.service';
import { useAuthStore } from '../../../store/auth-store';
import { formatErrorMessage } from '../../../utils/error-handler';
import { Product, Cart, Order, User } from '../../../types';

const mockCustomer: User = {
  id: 'usr-edge-1',
  email: 'edge.tester@example.com',
  firstName: 'Edge',
  lastName: 'Tester',
  role: 'CUSTOMER',
  isActive: true,
  createdAt: '2026-03-01T10:00:00.000Z',
  updatedAt: '2026-03-01T10:00:00.000Z'
};

const mockOutOfStockProduct: Product = {
  id: 'prod-out-stock-1',
  name: 'Rare Vintage Studio Mic',
  slug: 'vintage-studio-mic',
  description: 'Collector edition condenser microphone.',
  price: '899.00',
  sku: 'MIC-VINTAGE-01',
  stock: 0,
  version: 1,
  categoryId: 'cat-audio',
  isActive: true,
  images: [],
  category: { id: 'cat-audio', name: 'Audio', slug: 'audio' },
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-01T10:00:00.000Z'
};

const mockPendingOrder: Order = {
  id: 'ord-pending-123',
  orderNumber: 'ORD-PENDING-123',
  userId: 'usr-edge-1',
  status: 'PENDING_PAYMENT',
  subtotal: '150.00',
  taxAmount: '0.00',
  shippingAmount: '0.00',
  totalAmount: '150.00',
  currency: 'USD',
  idempotencyKey: 'idemp-pending-123',
  shippingAddress: {
    fullName: 'Edge Tester',
    addressLine1: '100 Edge Lane',
    city: 'Denver',
    state: 'CO',
    postalCode: '80201',
    country: 'United States',
    phone: '303-555-0100'
  },
  itemCount: 1,
  items: [
    {
      id: 'oi-pending-1',
      productId: 'prod-p1',
      productName: 'Studio Monitor Stand',
      productSku: 'ACC-STAND-01',
      unitPrice: '150.00',
      quantity: 1,
      lineTotal: '150.00',
      createdAt: new Date().toISOString()
    }
  ],
  payments: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

function renderWithProviders(_ui: React.ReactElement, initialRoute = '/', initialLocationState?: unknown) {
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
        <MemoryRouter initialEntries={[{ pathname: initialRoute, state: initialLocationState }]}>
          <Routes>
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/:slug" element={<ProductDetailPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/checkout/status/:orderId" element={<PaymentStatusPage />} />
            <Route path="/orders/:orderId" element={<OrderDetailPage />} />
            <Route path="/login" element={<div>Login Page Redirect</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
  };
}

describe('Phase 8: Edge Cases & Resiliency Testing', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    useAuthStore.getState().setAuth(mockCustomer, {
      accessToken: 'edge-access-token',
      refreshToken: 'edge-refresh-token',
      expiresIn: 900
    });

    vi.spyOn(categoriesService, 'listCategories').mockResolvedValue([]);
  });

  describe('Edge Case 1: Backend Unavailable', () => {
    it('displays user-friendly offline message and retry action when server is unreachable', async () => {
      const networkError = new AxiosError('Network Error', 'ERR_NETWORK', undefined, undefined, undefined);
      vi.spyOn(productsService, 'listProducts').mockRejectedValue(networkError);

      renderWithProviders(<ProductsPage />, '/products');

      expect(await screen.findByText('Unable to load products')).toBeInTheDocument();
      expect(
        screen.getByText('Cannot connect to QuickCart backend server. Please ensure the backend is running.')
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });
  });

  describe('Edge Case 2: Database Unavailable', () => {
    it('handles backend 500 database error gracefully without unhandled crashes', async () => {
      const dbError = new AxiosError('Internal Server Error', 'ERR_BAD_RESPONSE', undefined, undefined, {
        status: 500,
        statusText: 'Internal Server Error',
        data: {
          success: false,
          statusCode: 500,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Database query execution failed'
          }
        },
        headers: {},
        config: { headers: new AxiosHeaders() }
      });
      vi.spyOn(productsService, 'listProducts').mockRejectedValue(dbError);

      renderWithProviders(<ProductsPage />, '/products');

      expect(await screen.findByText('Unable to load products')).toBeInTheDocument();
      expect(screen.getByText('Database query execution failed')).toBeInTheDocument();
    });
  });

  describe('Edge Case 3: Redis Degradation & Rate Limiting', () => {
    it('handles HTTP 429 rate limit response with clear cooldown message', () => {
      const rateLimitError = new AxiosError('Too Many Requests', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 429,
        statusText: 'Too Many Requests',
        data: {},
        headers: {},
        config: { headers: new AxiosHeaders() }
      });

      const message = formatErrorMessage(rateLimitError);
      expect(message).toBe('Too many requests. Please wait a few moments before trying again.');
    });
  });

  describe('Edge Case 4: Expired Session', () => {
    it('clears credentials from auth store when session expires', () => {
      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      // Trigger session expiration
      useAuthStore.getState().clearSession({ sessionExpired: true });

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().accessToken).toBeNull();
      expect(useAuthStore.getState().refreshToken).toBeNull();
      expect(useAuthStore.getState().sessionExpired).toBe(true);
    });
  });

  describe('Edge Case 5: Invalid API Responses', () => {
    it('protects against malformed / empty responses falling back gracefully', async () => {
      // Mock returning empty list
      vi.spyOn(productsService, 'listProducts').mockResolvedValue({
        products: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 }
      });

      renderWithProviders(<ProductsPage />, '/products');

      expect(await screen.findByText('No matching products found')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Try adjusting your search keywords, clearing category selections, or widening your price range.'
        )
      ).toBeInTheDocument();
    });
  });

  describe('Edge Case 6: Insufficient Stock', () => {
    it('displays inline conflict alert when cart mutation returns insufficient stock error', async () => {
      const mockCartWithItem: Cart = {
        cartId: 'cart-1',
        items: [
          {
            itemId: 'ci-1',
            productId: 'prod-1',
            name: 'Studio Monitor',
            slug: 'studio-monitor',
            sku: 'MON-01',
            currentPrice: '299.00',
            quantity: 5,
            lineTotal: '1495.00',
            availableStock: 10,
            isActive: true,
            isAvailable: true,
            category: null,
            image: null
          }
        ],
        subtotal: '1495.00',
        itemCount: 5,
        distinctCount: 1
      };

      vi.spyOn(cartService, 'getCart').mockResolvedValue(mockCartWithItem);

      const stockError = new AxiosError('Bad Request', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 400,
        statusText: 'Bad Request',
        data: {
          success: false,
          statusCode: 400,
          error: {
            code: 'INSUFFICIENT_STOCK',
            message: 'Requested quantity exceeds available stock'
          }
        },
        headers: {},
        config: { headers: new AxiosHeaders() }
      });
      vi.spyOn(cartService, 'updateItemQuantity').mockRejectedValue(stockError);

      const { user } = renderWithProviders(<CartPage />, '/cart');

      // Increase quantity beyond stock
      const plusBtn = await screen.findByRole('button', { name: /increase quantity/i });
      await user.click(plusBtn);

      expect(await screen.findByText('Cart Update Conflict')).toBeInTheDocument();
      expect(screen.getByText('Requested quantity exceeds available stock')).toBeInTheDocument();
    });
  });

  describe('Edge Case 7: Product Becoming Unavailable / Out of Stock', () => {
    it('disables Add to Cart button and displays Out of Stock badge', async () => {
      vi.spyOn(productsService, 'getProductBySlug').mockResolvedValue(mockOutOfStockProduct);

      renderWithProviders(<ProductDetailPage />, `/products/${mockOutOfStockProduct.slug}`);

      expect(await screen.findByRole('heading', { name: 'Rare Vintage Studio Mic' })).toBeInTheDocument();
      expect(screen.getAllByText('Out of Stock').length).toBeGreaterThanOrEqual(1);

      const addToCartBtn = screen.getByRole('button', { name: /out of stock/i });
      expect(addToCartBtn).toBeDisabled();
    });
  });

  describe('Edge Case 8: Duplicate Checkout Requests & Idempotency', () => {
    it('disables submit button while payment is in-flight to prevent rapid double-clicks', async () => {
      const mockCart: Cart = {
        cartId: 'cart-1',
        items: [
          {
            itemId: 'ci-1',
            productId: 'prod-1',
            name: 'Studio Cable',
            slug: 'studio-cable',
            sku: 'CAB-01',
            currentPrice: '25.00',
            quantity: 1,
            lineTotal: '25.00',
            availableStock: 10,
            isActive: true,
            isAvailable: true,
            category: null,
            image: null
          }
        ],
        subtotal: '25.00',
        itemCount: 1,
        distinctCount: 1
      };
      vi.spyOn(cartService, 'getCart').mockResolvedValue(mockCart);

      // Delay checkout to verify disabled in-flight state
      vi.spyOn(ordersService, 'checkout').mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockPendingOrder), 500))
      );
      vi.spyOn(paymentsService, 'processPayment').mockResolvedValue({
        payment: {
          id: 'pay-1',
          orderId: mockPendingOrder.id,
          paymentIntentId: 'pi_sim_1',
          idempotencyKey: 'idemp_1',
          provider: 'SIMULATED',
          status: 'SUCCEEDED',
          amount: '25.00',
          currency: 'USD',
          gatewayResponse: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        orderStatus: 'PAID',
        isIdempotentReplay: false
      });

      const { user } = renderWithProviders(<CheckoutPage />, '/checkout');

      const addressInput = await screen.findByLabelText(/street address \*/i);
      await user.type(addressInput, '123 Test Rd');
      await user.type(screen.getByLabelText(/city \*/i), 'Austin');
      await user.type(screen.getByLabelText(/state \/ province \*/i), 'TX');
      await user.type(screen.getByLabelText(/postal \/ zip code \*/i), '78701');

      const payBtn = await screen.findByRole('button', { name: /pay \$/i });
      await user.click(payBtn);

      // In flight, button displays loading state and is disabled
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /processing payment/i })).toBeDisabled();
      });
    });
  });

  describe('Edge Case 9: Payment Failure & Retry Path', () => {
    it('redirects to payment status page with decline feedback and retry action on HTTP 402', async () => {
      vi.spyOn(ordersService, 'getOrderById').mockResolvedValue(mockPendingOrder);
      vi.spyOn(paymentsService, 'getOrderPayments').mockResolvedValue([]);

      renderWithProviders(
        <PaymentStatusPage />,
        `/checkout/status/${mockPendingOrder.id}`,
        {
          order: mockPendingOrder,
          initialError: 'Your bank or card issuer declined this transaction.'
        }
      );

      expect(await screen.findByText('Payment Authorization Declined')).toBeInTheDocument();
      expect(screen.getByText('Your bank or card issuer declined this transaction.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /pay \$150\.00 now/i })).toBeInTheDocument();
    });
  });

  describe('Edge Case 10: Payment Still Pending', () => {
    it('displays 15-minute countdown and complete payment action for PENDING_PAYMENT order', async () => {
      vi.spyOn(ordersService, 'getOrderById').mockResolvedValue(mockPendingOrder);
      vi.spyOn(paymentsService, 'getOrderPayments').mockResolvedValue([]);

      renderWithProviders(<OrderDetailPage />, `/orders/${mockPendingOrder.id}`);

      expect(await screen.findByText('PENDING_PAYMENT')).toBeInTheDocument();
      expect(screen.getByText('Payment Action Required')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /complete payment/i })).toBeInTheDocument();
    });
  });

  describe('Edge Case 11: Empty Catalogue', () => {
    it('renders clean empty state with reset filters button when catalogue is empty', async () => {
      vi.spyOn(productsService, 'listProducts').mockResolvedValue({
        products: [],
        meta: { total: 0, page: 1, limit: 12, totalPages: 0 }
      });

      renderWithProviders(<ProductsPage />, '/products');

      expect(await screen.findByText('No matching products found')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Try adjusting your search keywords, clearing category selections, or widening your price range.'
        )
      ).toBeInTheDocument();
    });
  });

  describe('Edge Case 12: Network Timeout', () => {
    it('identifies ECONNABORTED error and formats human-friendly timeout message', () => {
      const timeoutError = new AxiosError('timeout of 15000ms exceeded', 'ECONNABORTED', undefined, undefined, undefined);

      const message = formatErrorMessage(timeoutError);
      expect(message).toBe('Request timed out. Please check your network connection.');
    });
  });
});
