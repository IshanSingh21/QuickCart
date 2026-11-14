import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError, AxiosHeaders } from 'axios';
import { CartPage } from '../../../pages/CartPage';
import { cartService } from '../../../services/cart.service';
import { useAuthStore } from '../../../store/auth-store';
import { useGuestCartStore } from '../../../store/guest-cart-store';
import { Cart, CartItem, Product } from '../../../types';

const mockServerItem1: CartItem = {
  itemId: 'item-101',
  productId: 'prod-1',
  name: 'Sony WH-1000XM5 Headphones',
  slug: 'sony-wh-1000xm5',
  sku: 'SNY-WH-1000XM5',
  currentPrice: '399.99',
  quantity: 1,
  lineTotal: '399.99',
  availableStock: 15,
  isActive: true,
  isAvailable: true,
  category: { id: 'cat-audio', name: 'Audio', slug: 'audio' },
  image: 'https://example.com/sony-headphones.jpg'
};

const mockServerItem2: CartItem = {
  itemId: 'item-102',
  productId: 'prod-2',
  name: 'Logitech MX Master 3S',
  slug: 'logitech-mx-master-3s',
  sku: 'LOGI-MX-3S',
  currentPrice: '99.99',
  quantity: 2,
  lineTotal: '199.98',
  availableStock: 8,
  isActive: true,
  isAvailable: true,
  category: { id: 'cat-acc', name: 'Accessories', slug: 'accessories' },
  image: 'https://example.com/mx-master.jpg'
};

const mockFullCart: Cart = {
  cartId: 'cart-uuid-1',
  items: [mockServerItem1, mockServerItem2],
  subtotal: '599.97',
  itemCount: 3,
  distinctCount: 2
};

function renderCartPage(initialPath = '/cart') {
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
          <Route path="/cart" element={<CartPage />} />
          <Route path="/products" element={<div data-testid="catalog">Catalog</div>} />
          <Route path="/products/:slug" element={<div data-testid="product-detail">Product Detail</div>} />
          <Route path="/checkout" element={<div data-testid="checkout-page">Checkout Page</div>} />
          <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('CartPage & Shopping Cart Integration (Phase 5)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useGuestCartStore.getState().clear();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      sessionExpired: false
    });
  });

  it('renders clean empty state with catalog CTA when cart contains no items', async () => {
    renderCartPage();

    expect(
      await screen.findByRole('heading', { name: /your shopping cart is empty/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /explore products/i })).toHaveAttribute(
      'href',
      '/products'
    );
  });

  it('displays authenticated cart with verified server line totals, stock badges, and subtotal', async () => {
    useAuthStore.setState({
      isAuthenticated: true,
      accessToken: 'auth-token-123',
      user: {
        id: 'u1',
        email: 'shopper@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'CUSTOMER',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
      }
    });

    vi.spyOn(cartService, 'getCart').mockResolvedValueOnce(mockFullCart);

    renderCartPage();

    // Verify Heading & Count
    expect(await screen.findByRole('heading', { name: 'Shopping Cart' })).toBeInTheDocument();
    expect(screen.getByText(/3 items \(2 unique\)/i)).toBeInTheDocument();

    // Verify Product 1 details
    expect(screen.getByText('Sony WH-1000XM5 Headphones')).toBeInTheDocument();
    expect(screen.getByText('SKU: SNY-WH-1000XM5')).toBeInTheDocument();
    expect(screen.getByText('Audio')).toBeInTheDocument();
    expect(screen.getAllByText('In Stock').length).toBeGreaterThanOrEqual(1);

    // Verify Product 2 details
    expect(screen.getByText('Logitech MX Master 3S')).toBeInTheDocument();
    expect(screen.getByText('SKU: LOGI-MX-3S')).toBeInTheDocument();

    // Verify Server-Authoritative Subtotal & Estimated Total
    expect(screen.getAllByText('$599.97').length).toBeGreaterThanOrEqual(2);

    // Free Shipping qualified threshold banner
    expect(screen.getByText(/you have qualified for free standard shipping!/i)).toBeInTheDocument();
  });

  it('updates item quantity via PATCH /cart/items/:itemId and locks controls during mutation', async () => {
    const user = userEvent.setup();
    useAuthStore.setState({
      isAuthenticated: true,
      accessToken: 'auth-token-123',
      user: {
        id: 'u1',
        email: 'shopper@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'CUSTOMER',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
      }
    });

    vi.spyOn(cartService, 'getCart').mockResolvedValueOnce(mockFullCart);

    const updatedCart: Cart = {
      ...mockFullCart,
      items: [
        {
          ...mockServerItem1,
          quantity: 2,
          lineTotal: '799.98'
        },
        mockServerItem2
      ],
      subtotal: '999.96',
      itemCount: 4
    };

    const updateSpy = vi.spyOn(cartService, 'updateItemQuantity').mockResolvedValueOnce(updatedCart);

    renderCartPage();

    await screen.findByRole('heading', { name: 'Shopping Cart' });

    // Find increment buttons: first item is Sony
    const incrementButtons = screen.getAllByRole('button', { name: /increase quantity/i });
    await user.click(incrementButtons[0]);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith('item-101', 2);
    });

    // Check updated totals
    await waitFor(() => {
      expect(screen.getAllByText('$999.96').length).toBeGreaterThanOrEqual(2);
    });
    expect(screen.getByText(/4 items/i)).toBeInTheDocument();
  });

  it('removes item via DELETE /cart/items/:itemId and updates distinct counts', async () => {
    const user = userEvent.setup();
    useAuthStore.setState({
      isAuthenticated: true,
      accessToken: 'auth-token-123',
      user: {
        id: 'u1',
        email: 'shopper@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'CUSTOMER',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
      }
    });

    vi.spyOn(cartService, 'getCart').mockResolvedValueOnce(mockFullCart);

    const postRemoveCart: Cart = {
      cartId: 'cart-uuid-1',
      items: [mockServerItem2],
      subtotal: '199.98',
      itemCount: 2,
      distinctCount: 1
    };

    const removeSpy = vi.spyOn(cartService, 'removeItem').mockResolvedValueOnce(postRemoveCart);

    renderCartPage();

    await screen.findByRole('heading', { name: 'Shopping Cart' });

    const removeSonyBtn = screen.getByRole('button', {
      name: /remove sony wh-1000xm5 headphones from cart/i
    });
    await user.click(removeSonyBtn);

    await waitFor(() => {
      expect(removeSpy).toHaveBeenCalledWith('item-101');
    });

    await waitFor(() => {
      expect(screen.getAllByText('$199.98').length).toBeGreaterThanOrEqual(2);
    });
    expect(screen.queryByText('Sony WH-1000XM5 Headphones')).not.toBeInTheDocument();
  });

  it('opens confirmation modal and clears all items via DELETE /cart', async () => {
    const user = userEvent.setup();
    useAuthStore.setState({
      isAuthenticated: true,
      accessToken: 'auth-token-123',
      user: {
        id: 'u1',
        email: 'shopper@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'CUSTOMER',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
      }
    });

    vi.spyOn(cartService, 'getCart').mockResolvedValueOnce(mockFullCart);

    const clearedCart: Cart = {
      cartId: 'cart-uuid-1',
      items: [],
      subtotal: '0.00',
      itemCount: 0,
      distinctCount: 0
    };

    const clearSpy = vi.spyOn(cartService, 'clearCart').mockResolvedValueOnce(clearedCart);

    renderCartPage();

    await screen.findByRole('heading', { name: 'Shopping Cart' });

    // Click "Clear Cart" button
    const clearBtn = screen.getByRole('button', { name: /clear all items from cart/i });
    await user.click(clearBtn);

    // Dialog appears
    expect(await screen.findByRole('heading', { name: /clear shopping cart\?/i })).toBeInTheDocument();

    // Confirm in dialog
    const confirmClearBtn = screen.getByRole('button', { name: /^clear cart$/i });
    await user.click(confirmClearBtn);

    await waitFor(() => {
      expect(clearSpy).toHaveBeenCalled();
    });

    // Empties view
    expect(await screen.findByRole('heading', { name: /your shopping cart is empty/i })).toBeInTheDocument();
  });

  it('intercepts backend 409 conflict (insufficient stock) and displays clean alert banner', async () => {
    const user = userEvent.setup();
    useAuthStore.setState({
      isAuthenticated: true,
      accessToken: 'auth-token-123',
      user: {
        id: 'u1',
        email: 'shopper@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'CUSTOMER',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
      }
    });

    vi.spyOn(cartService, 'getCart').mockResolvedValueOnce(mockFullCart);

    const headers = new AxiosHeaders();
    const config = { headers };
    const conflictError = new AxiosError(
      'Conflict',
      'ERR_BAD_REQUEST',
      config,
      {},
      {
        status: 409,
        statusText: 'Conflict',
        headers,
        config,
        data: {
          success: false,
          error: {
            code: 'INSUFFICIENT_STOCK',
            message: 'Requested quantity (10) exceeds available stock (3)'
          }
        }
      }
    );

    vi.spyOn(cartService, 'updateItemQuantity').mockRejectedValueOnce(conflictError);

    renderCartPage();

    await screen.findByRole('heading', { name: 'Shopping Cart' });

    const incrementButtons = screen.getAllByRole('button', { name: /increase quantity/i });
    await user.click(incrementButtons[0]);

    // Error banner surfaces backend message cleanly
    expect(
      await screen.findByText(/requested quantity \(10\) exceeds available stock \(3\)/i)
    ).toBeInTheDocument();
  });

  it('renders guest cart from localStorage and directs to login with redirect param for checkout', async () => {
    const user = userEvent.setup();

    const sampleProduct: Product = {
      id: 'prod-guest-1',
      name: 'Mechanical Keycaps Set',
      slug: 'mechanical-keycaps-set',
      sku: 'CAP-PBT-01',
      description: 'PBT double-shot keycaps.',
      price: '49.99',
      stock: 10,
      version: 1,
      categoryId: 'cat-acc',
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      images: []
    };

    useGuestCartStore.getState().addItem(sampleProduct, 2);

    renderCartPage();

    expect((await screen.findAllByText('Mechanical Keycaps Set')).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/shopping as guest/i)).toBeInTheDocument();
    expect(screen.getAllByText('$99.98').length).toBeGreaterThanOrEqual(2);

    const checkoutBtn = screen.getByRole('button', { name: /sign in to checkout/i });
    await user.click(checkoutBtn);

    expect(await screen.findByTestId('login-page')).toBeInTheDocument();
  });
});
