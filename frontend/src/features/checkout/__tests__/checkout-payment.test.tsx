import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError, AxiosHeaders } from 'axios';
import { CheckoutPage } from '../../../pages/CheckoutPage';
import { OrderConfirmationPage } from '../../../pages/OrderConfirmationPage';
import { PaymentStatusPage } from '../../../pages/PaymentStatusPage';
import { OrdersPage } from '../../../pages/OrdersPage';
import { ordersService } from '../../../services/orders.service';
import { paymentsService } from '../../../services/payments.service';
import { cartService } from '../../../services/cart.service';
import { useAuthStore } from '../../../store/auth-store';
import { useGuestCartStore } from '../../../store/guest-cart-store';
import { Order, Payment, Cart } from '../../../types';

const mockOrder: Order = {
  id: 'ord-uuid-1',
  orderNumber: 'ORD-1731650000-ABCDE',
  userId: 'u1',
  status: 'PENDING_PAYMENT',
  subtotal: '299.98',
  taxAmount: '0.00',
  shippingAmount: '0.00',
  totalAmount: '299.98',
  currency: 'USD',
  idempotencyKey: 'idemp_test_key_1',
  shippingAddress: {
    fullName: 'Alice Walker',
    addressLine1: '742 Evergreen Terrace',
    addressLine2: 'Apt 2',
    city: 'Springfield',
    state: 'OR',
    postalCode: '97477',
    country: 'United States',
    phone: '555-123-4567'
  },
  itemCount: 2,
  items: [
    {
      id: 'oi-1',
      productId: 'prod-10',
      productName: 'Mechanical Keychron Q1',
      productSku: 'KEY-Q1',
      unitPrice: '149.99',
      quantity: 2,
      lineTotal: '299.98',
      createdAt: new Date().toISOString()
    }
  ],
  payments: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const mockPaymentSuccess: Payment = {
  id: 'pay-uuid-1',
  orderId: 'ord-uuid-1',
  paymentIntentId: 'pi_sim_123456789',
  idempotencyKey: 'idemp_pay_key_1',
  provider: 'SIMULATED_GATEWAY',
  status: 'SUCCEEDED',
  amount: '299.98',
  currency: 'USD',
  gatewayResponse: {
    success: true,
    status: 'SUCCEEDED',
    transactionId: 'txn_sim_123'
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

function renderCheckoutFlow(initialPath = '/checkout') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/checkout/confirmation/:orderId" element={<OrderConfirmationPage />} />
          <Route path="/checkout/status/:orderId" element={<PaymentStatusPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/products" element={<div data-testid="products-catalog">Catalog</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Checkout & Payment Integration (Phase 6)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    useGuestCartStore.getState().clear();
    useAuthStore.setState({
      user: {
        id: 'u1',
        email: 'alice@example.com',
        firstName: 'Alice',
        lastName: 'Walker',
        role: 'CUSTOMER',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
      },
      accessToken: 'auth-jwt-token',
      refreshToken: null,
      isAuthenticated: true,
      isLoading: false,
      sessionExpired: false
    });
  });

  it('renders empty cart state with CTA when caller cart is empty', async () => {
    vi.spyOn(cartService, 'getCart').mockResolvedValueOnce({
      cartId: 'c1',
      items: [],
      subtotal: '0.00',
      itemCount: 0,
      distinctCount: 0
    });

    renderCheckoutFlow('/checkout');

    expect(
      await screen.findByRole('heading', { name: /your shopping cart is empty/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /explore products/i })).toHaveAttribute(
      'href',
      '/products'
    );
  });

  it('submits checkout with shipping address and processes successful payment', async () => {
    const user = userEvent.setup();

    const activeCart: Cart = {
      cartId: 'c1',
      items: [
        {
          itemId: 'ci-1',
          productId: 'prod-10',
          name: 'Mechanical Keychron Q1',
          slug: 'mechanical-keychron-q1',
          sku: 'KEY-Q1',
          currentPrice: '149.99',
          quantity: 2,
          lineTotal: '299.98',
          availableStock: 10,
          isActive: true,
          isAvailable: true,
          category: null,
          image: null
        }
      ],
      subtotal: '299.98',
      itemCount: 2,
      distinctCount: 1
    };

    vi.spyOn(cartService, 'getCart').mockResolvedValueOnce(activeCart);
    const checkoutSpy = vi.spyOn(ordersService, 'checkout').mockResolvedValueOnce(mockOrder);
    const paySpy = vi.spyOn(paymentsService, 'processPayment').mockResolvedValueOnce({
      payment: mockPaymentSuccess,
      orderStatus: 'PAID',
      isIdempotentReplay: false
    });
    vi.spyOn(ordersService, 'getOrderById').mockResolvedValueOnce({
      ...mockOrder,
      status: 'PAID'
    });

    renderCheckoutFlow('/checkout');

    expect(await screen.findByRole('heading', { name: /secure checkout/i })).toBeInTheDocument();
    expect(screen.getAllByText('Mechanical Keychron Q1').length).toBeGreaterThanOrEqual(1);

    // Fill shipping address
    await user.type(screen.getByLabelText(/street address/i), '742 Evergreen Terrace');
    await user.type(screen.getByLabelText(/city/i), 'Springfield');
    await user.type(screen.getByLabelText(/state/i), 'OR');
    await user.type(screen.getByLabelText(/postal/i), '97477');

    // Submit checkout & pay
    const payButton = screen.getByRole('button', { name: /pay \$299\.98/i });
    await user.click(payButton);

    await waitFor(() => {
      expect(checkoutSpy).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(paySpy).toHaveBeenCalledWith(
        'ord-uuid-1',
        expect.objectContaining({
          paymentMethod: 'SIMULATED_CARD',
          simulateOutcome: 'SUCCESS'
        })
      );
    });

    // Navigates to Order Confirmation page
    expect(await screen.findByRole('heading', { name: /thank you for your order!/i })).toBeInTheDocument();
    expect(screen.getByText('ORD-1731650000-ABCDE')).toBeInTheDocument();
    expect(screen.getByText(/order confirmed & paid/i)).toBeInTheDocument();
  });

  it('handles payment decline (HTTP 402) safely and redirects to payment status for retry', async () => {
    const user = userEvent.setup();

    const activeCart: Cart = {
      cartId: 'c1',
      items: [
        {
          itemId: 'ci-1',
          productId: 'prod-10',
          name: 'Mechanical Keychron Q1',
          slug: 'mechanical-keychron-q1',
          sku: 'KEY-Q1',
          currentPrice: '149.99',
          quantity: 2,
          lineTotal: '299.98',
          availableStock: 10,
          isActive: true,
          isAvailable: true,
          category: null,
          image: null
        }
      ],
      subtotal: '299.98',
      itemCount: 2,
      distinctCount: 1
    };

    vi.spyOn(cartService, 'getCart').mockResolvedValueOnce(activeCart);
    vi.spyOn(ordersService, 'checkout').mockResolvedValueOnce(mockOrder);

    const headers = new AxiosHeaders();
    const config = { headers };
    const declineErr = new AxiosError(
      'Payment Required',
      'ERR_BAD_REQUEST',
      config,
      {},
      {
        status: 402,
        statusText: 'Payment Required',
        headers,
        config,
        data: {
          success: false,
          error: {
            code: 'PAYMENT_REQUIRED',
            message: 'Payment failed: The payment was declined by the simulated card issuer.'
          }
        }
      }
    );

    vi.spyOn(paymentsService, 'processPayment').mockRejectedValueOnce(declineErr);
    vi.spyOn(ordersService, 'getOrderById').mockResolvedValue(mockOrder);

    renderCheckoutFlow('/checkout');

    await screen.findByRole('heading', { name: /secure checkout/i });

    await user.type(screen.getByLabelText(/street address/i), '742 Evergreen Terrace');
    await user.type(screen.getByLabelText(/city/i), 'Springfield');
    await user.type(screen.getByLabelText(/state/i), 'OR');
    await user.type(screen.getByLabelText(/postal/i), '97477');

    const payButton = screen.getByRole('button', { name: /pay \$299\.98/i });
    await user.click(payButton);

    // Navigates to Payment Status screen showing decline message and PENDING_PAYMENT countdown
    expect(
      await screen.findByRole('heading', { name: /payment action required/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/the payment was declined by the simulated card issuer/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/expires in:/i)).toBeInTheDocument();
  });

  it('allows user to cancel PENDING_PAYMENT order and restock inventory', async () => {
    const user = userEvent.setup();

    vi.spyOn(ordersService, 'getOrderById').mockResolvedValue(mockOrder);
    const cancelSpy = vi.spyOn(ordersService, 'cancelOrder').mockResolvedValueOnce({
      ...mockOrder,
      status: 'CANCELLED'
    });

    renderCheckoutFlow('/checkout/status/ord-uuid-1');

    expect(
      await screen.findByRole('heading', { name: /payment action required/i })
    ).toBeInTheDocument();

    // Click "Cancel Order"
    const cancelBtn = screen.getByRole('button', { name: /^cancel order$/i });
    await user.click(cancelBtn);

    // Confirmation dialog
    expect(await screen.findByRole('heading', { name: /cancel this order\?/i })).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /confirm cancellation/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(cancelSpy).toHaveBeenCalledWith('ord-uuid-1');
    });
  });

  it('renders user order history with live status badges and links to receipts', async () => {
    vi.spyOn(ordersService, 'getMyOrders').mockResolvedValueOnce({
      orders: [
        {
          ...mockOrder,
          status: 'PAID'
        }
      ]
    });

    renderCheckoutFlow('/orders');

    expect(await screen.findByRole('heading', { name: /order history/i })).toBeInTheDocument();
    expect(await screen.findByText('ORD-1731650000-ABCDE')).toBeInTheDocument();
    expect(screen.getByText('PAID')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view receipt/i })).toHaveAttribute(
      'href',
      '/checkout/confirmation/ord-uuid-1'
    );
  });
});
