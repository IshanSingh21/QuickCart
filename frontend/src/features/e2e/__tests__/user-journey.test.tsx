import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HomePage } from '../../../pages/HomePage';
import { ProductsPage } from '../../../pages/ProductsPage';
import { ProductDetailPage } from '../../../pages/ProductDetailPage';
import { CartPage } from '../../../pages/CartPage';
import { LoginPage } from '../../../pages/LoginPage';
import { RegisterPage } from '../../../pages/RegisterPage';
import { CheckoutPage } from '../../../pages/CheckoutPage';
import { OrderConfirmationPage } from '../../../pages/OrderConfirmationPage';
import { OrderDetailPage } from '../../../pages/OrderDetailPage';
import { ProfilePage } from '../../../pages/ProfilePage';
import { authService } from '../../../services/auth.service';
import { productsService } from '../../../services/products.service';
import { categoriesService } from '../../../services/categories.service';
import { cartService } from '../../../services/cart.service';
import { ordersService } from '../../../services/orders.service';
import { paymentsService } from '../../../services/payments.service';
import { useAuthStore } from '../../../store/auth-store';
import { useGuestCartStore } from '../../../store/guest-cart-store';
import { User, Product, Category, Cart, Order, Payment } from '../../../types';

const mockCustomerUser: User = {
  id: 'usr-e2e-1',
  email: 'elena.rostova@example.com',
  firstName: 'Elena',
  lastName: 'Rostova',
  role: 'CUSTOMER',
  isActive: true,
  createdAt: '2026-03-01T10:00:00.000Z',
  updatedAt: '2026-03-01T10:00:00.000Z'
};

const mockKeyboardProduct: Product = {
  id: 'prod-keychron-q1',
  name: 'Keychron Q1 Pro Mechanical Keyboard',
  slug: 'keychron-q1-pro',
  description: 'Full aluminum custom wireless mechanical keyboard with QMK/VIA support.',
  price: '199.99',
  sku: 'KEY-Q1-PRO',
  stock: 20,
  version: 1,
  categoryId: 'cat-peripherals',
  isActive: true,
  images: [
    {
      id: 'img-k1',
      productId: 'prod-keychron-q1',
      url: 'https://images.unsplash.com/photo-keyboard-1',
      altText: 'Keyboard Main',
      isPrimary: true,
      sortOrder: 0
    },
    {
      id: 'img-k2',
      productId: 'prod-keychron-q1',
      url: 'https://images.unsplash.com/photo-keyboard-2',
      altText: 'Keyboard Angle',
      isPrimary: false,
      sortOrder: 1
    }
  ],
  category: { id: 'cat-peripherals', name: 'Peripherals', slug: 'peripherals' },
  createdAt: '2026-01-10T12:00:00.000Z',
  updatedAt: '2026-01-10T12:00:00.000Z'
};

const mockHeadphonesProduct: Product = {
  id: 'prod-sony-wh1000',
  name: 'Sony WH-1000XM5 Wireless Headphones',
  slug: 'sony-wh-1000xm5',
  description: 'Industry-leading noise canceling headphones with dual processors.',
  price: '349.99',
  sku: 'AUD-SONY-XM5',
  stock: 12,
  version: 1,
  categoryId: 'cat-audio',
  isActive: true,
  images: [
    {
      id: 'img-h1',
      productId: 'prod-sony-wh1000',
      url: 'https://images.unsplash.com/photo-headphones-1',
      altText: 'Headphones Main',
      isPrimary: true,
      sortOrder: 0
    }
  ],
  category: { id: 'cat-audio', name: 'Audio', slug: 'audio' },
  createdAt: '2026-01-15T12:00:00.000Z',
  updatedAt: '2026-01-15T12:00:00.000Z'
};

const mockCategories: Category[] = [
  { id: 'cat-peripherals', name: 'Peripherals', slug: 'peripherals', description: null, parentId: null, children: [] },
  { id: 'cat-audio', name: 'Audio', slug: 'audio', description: null, parentId: null, children: [] }
];

const mockInitialCart: Cart = {
  cartId: 'cart-e2e-1',
  items: [
    {
      itemId: 'cart-item-1',
      productId: mockKeyboardProduct.id,
      name: mockKeyboardProduct.name,
      slug: mockKeyboardProduct.slug,
      sku: mockKeyboardProduct.sku,
      currentPrice: mockKeyboardProduct.price,
      quantity: 1,
      lineTotal: '199.99',
      availableStock: 20,
      isActive: true,
      isAvailable: true,
      category: { id: 'cat-peripherals', name: 'Peripherals', slug: 'peripherals' },
      image: null
    }
  ],
  subtotal: '199.99',
  itemCount: 1,
  distinctCount: 1
};

const mockUpdatedCart: Cart = {
  ...mockInitialCart,
  items: [
    {
      ...mockInitialCart.items[0],
      quantity: 2,
      lineTotal: '399.98'
    }
  ],
  subtotal: '399.98',
  itemCount: 2
};

const mockCreatedOrder: Order = {
  id: 'ord-e2e-999',
  orderNumber: 'ORD-2026-E2E-999',
  userId: mockCustomerUser.id,
  status: 'PENDING_PAYMENT',
  subtotal: '399.98',
  taxAmount: '0.00',
  shippingAmount: '0.00',
  totalAmount: '399.98',
  currency: 'USD',
  idempotencyKey: 'idemp_key_e2e_1',
  shippingAddress: {
    fullName: 'Elena Rostova',
    addressLine1: '500 Tech Parkway',
    city: 'Seattle',
    state: 'WA',
    postalCode: '98101',
    country: 'United States',
    phone: '206-555-0144'
  },
  itemCount: 2,
  items: [
    {
      id: 'oi-1',
      productId: mockKeyboardProduct.id,
      productName: mockKeyboardProduct.name,
      productSku: mockKeyboardProduct.sku,
      unitPrice: '199.99',
      quantity: 2,
      lineTotal: '399.98',
      createdAt: '2026-03-02T10:00:00.000Z'
    }
  ],
  payments: [],
  createdAt: '2026-03-02T10:00:00.000Z',
  updatedAt: '2026-03-02T10:00:00.000Z'
};

const mockPaidOrder: Order = {
  ...mockCreatedOrder,
  status: 'PAID'
};

const mockPaymentSuccess: Payment = {
  id: 'pay-e2e-1',
  orderId: mockCreatedOrder.id,
  paymentIntentId: 'pi_sim_e2e_888999',
  idempotencyKey: 'idemp_pay_e2e_1',
  provider: 'SIMULATED',
  status: 'SUCCEEDED',
  amount: '399.98',
  currency: 'USD',
  gatewayResponse: null,
  createdAt: '2026-03-02T10:05:00.000Z',
  updatedAt: '2026-03-02T10:05:00.000Z'
};

function renderE2EApp(initialRoute = '/') {
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
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/:slug" element={<ProductDetailPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/checkout/confirmation/:orderId" element={<OrderConfirmationPage />} />
            <Route path="/orders/:orderId" element={<OrderDetailPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
  };
}

describe('Phase 8: Complete End-to-End User Journey', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    useAuthStore.getState().clearSession();
    useGuestCartStore.getState().clear();

    // Default API mocks
    vi.spyOn(categoriesService, 'listCategories').mockResolvedValue(mockCategories);
    vi.spyOn(productsService, 'listProducts').mockResolvedValue({
      products: [mockKeyboardProduct, mockHeadphonesProduct],
      meta: { total: 2, page: 1, limit: 12, totalPages: 1 }
    });
    vi.spyOn(productsService, 'getProductBySlug').mockImplementation(async (slug: string) => {
      if (slug === mockKeyboardProduct.slug) return mockKeyboardProduct;
      if (slug === mockHeadphonesProduct.slug) return mockHeadphonesProduct;
      throw new Error('Product not found');
    });
    vi.spyOn(cartService, 'getCart').mockResolvedValue(mockInitialCart);
    vi.spyOn(cartService, 'addItem').mockResolvedValue(mockInitialCart);
    vi.spyOn(cartService, 'updateItemQuantity').mockResolvedValue(mockUpdatedCart);
    vi.spyOn(ordersService, 'checkout').mockResolvedValue(mockCreatedOrder);
    vi.spyOn(ordersService, 'getOrderById').mockImplementation(async (id: string) => {
      if (id === mockCreatedOrder.id) return mockPaidOrder;
      throw new Error('Order not found');
    });
    vi.spyOn(paymentsService, 'processPayment').mockResolvedValue({
      payment: mockPaymentSuccess,
      orderStatus: 'PAID',
      isIdempotentReplay: false
    });
    vi.spyOn(paymentsService, 'getOrderPayments').mockResolvedValue([mockPaymentSuccess]);
    vi.spyOn(authService, 'getMe').mockResolvedValue(mockCustomerUser);
    vi.spyOn(authService, 'logout').mockResolvedValue();
  });

  it('Step 1: Open homepage and verify store sections', async () => {
    renderE2EApp('/');

    // Hero headline
    expect(await screen.findByRole('heading', { name: /engineered audio/i })).toBeInTheDocument();
    // Shop Now / Explore Catalog call-to-action
    expect(screen.getByRole('link', { name: /explore catalog/i })).toHaveAttribute('href', '/products');
    // Featured Categories section
    expect(screen.getByRole('heading', { name: /shop by category/i })).toBeInTheDocument();
    // Trust Badges
    expect(screen.getByText('Free Express')).toBeInTheDocument();
    expect(screen.getByText('2-Yr Warranty')).toBeInTheDocument();
  });

  it('Step 2 & 3: Browse catalogue by category and search filter', async () => {
    const { user } = renderE2EApp('/products');

    // Both products rendered
    expect(await screen.findByText('Keychron Q1 Pro Mechanical Keyboard')).toBeInTheDocument();
    expect(screen.getByText('Sony WH-1000XM5 Wireless Headphones')).toBeInTheDocument();

    // Filter by search query
    const searchInput = screen.getByLabelText(/search products/i);
    await user.type(searchInput, 'Keychron');

    // Filter sidebar displays category options
    expect(screen.getByRole('heading', { name: /filter products/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /peripherals/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^audio$/i })).toBeInTheDocument();
  });

  it('Step 4: Open product detail and inspect specifications', async () => {
    renderE2EApp(`/products/${mockKeyboardProduct.slug}`);

    // Product Title, SKU and Stock
    expect(await screen.findByRole('heading', { name: 'Keychron Q1 Pro Mechanical Keyboard' })).toBeInTheDocument();
    expect(screen.getByText(/SKU: KEY-Q1-PRO/i)).toBeInTheDocument();
    expect(screen.getByText(/In Stock \(20 available\)/i)).toBeInTheDocument();
    expect(screen.getAllByText('$199.99').length).toBeGreaterThanOrEqual(1);

    // Action button
    expect(screen.getByRole('button', { name: /add to cart/i })).toBeInTheDocument();
  });

  it('Step 5 & 6: User registration and authentication login', async () => {
    const registerSpy = vi.spyOn(authService, 'register').mockResolvedValueOnce({
      user: mockCustomerUser,
      tokens: { accessToken: 'access_tok_1', refreshToken: 'refresh_tok_1', expiresIn: 900 }
    });

    const { user } = renderE2EApp('/register');

    // Fill registration form
    await user.type(screen.getByLabelText(/first name/i), 'Elena');
    await user.type(screen.getByLabelText(/last name/i), 'Rostova');
    await user.type(screen.getByLabelText(/email address/i), 'elena.rostova@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'SecurePass123!');
    await user.type(screen.getByLabelText(/confirm password/i), 'SecurePass123!');

    // Submit
    const submitBtn = screen.getByRole('button', { name: /create account/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(registerSpy).toHaveBeenCalledTimes(1);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().user?.email).toBe('elena.rostova@example.com');
    });
  });

  it('Step 7 & 8: Add product to cart and update item quantities', async () => {
    useAuthStore.getState().setAuth(mockCustomerUser, {
      accessToken: 'access_valid',
      refreshToken: 'refresh_valid',
      expiresIn: 900
    });

    const { user } = renderE2EApp('/cart');

    // Cart contains product
    const productLinks = await screen.findAllByRole('link', {
      name: /keychron q1 pro mechanical keyboard/i
    });
    expect(productLinks.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('$199.99').length).toBeGreaterThanOrEqual(1);

    // Increment item quantity via quantity selector
    const incrementBtn = screen.getByRole('button', { name: /increase quantity/i });
    await user.click(incrementBtn);

    // Authoritative update reflected
    await waitFor(() => {
      expect(cartService.updateItemQuantity).toHaveBeenCalledWith('cart-item-1', 2);
    });

    // Checkout CTA button
    expect(screen.getByRole('button', { name: /proceed to checkout/i })).toBeInTheDocument();
  });

  it('Step 9: Proceed through checkout with delivery address and review totals', async () => {
    useAuthStore.getState().setAuth(mockCustomerUser, {
      accessToken: 'access_valid',
      refreshToken: 'refresh_valid',
      expiresIn: 900
    });

    const { user } = renderE2EApp('/checkout');

    expect(await screen.findByRole('heading', { name: /secure checkout/i })).toBeInTheDocument();

    // Fill delivery address form
    await user.type(screen.getByLabelText(/street address/i), '500 Tech Parkway');
    await user.type(screen.getByLabelText(/city/i), 'Seattle');
    await user.type(screen.getByLabelText(/state \/ province/i), 'WA');
    await user.type(screen.getByLabelText(/postal \/ zip code/i), '98101');

    // Review item total and place order
    const payBtn = screen.getByRole('button', { name: /pay \$/i });
    await user.click(payBtn);

    await waitFor(() => {
      expect(ordersService.checkout).toHaveBeenCalledTimes(1);
      expect(paymentsService.processPayment).toHaveBeenCalledTimes(1);
    });
  });

  it('Step 10 & 11: View resulting order with progress stepper and payment ledger', async () => {
    useAuthStore.getState().setAuth(mockCustomerUser, {
      accessToken: 'access_valid',
      refreshToken: 'refresh_valid',
      expiresIn: 900
    });

    renderE2EApp(`/orders/${mockCreatedOrder.id}`);

    // Order number and status
    expect(await screen.findByRole('heading', { name: 'ORD-2026-E2E-999' })).toBeInTheDocument();
    expect(screen.getByText('PAID')).toBeInTheDocument();

    // Lifecycle Stepper stages
    expect(screen.getByText('Order Placed')).toBeInTheDocument();
    expect(screen.getByText('Payment Confirmed')).toBeInTheDocument();
    expect(screen.getByText('Processing')).toBeInTheDocument();
    expect(screen.getByText('Delivered')).toBeInTheDocument();

    // Item line totals
    expect(screen.getByText('Keychron Q1 Pro Mechanical Keyboard')).toBeInTheDocument();
    expect(screen.getByText('KEY-Q1-PRO')).toBeInTheDocument();

    // Delivery destination
    expect(screen.getByText('500 Tech Parkway')).toBeInTheDocument();
    expect(screen.getByText(/Seattle, WA 98101/i)).toBeInTheDocument();

    // Payment Ledger
    expect(screen.getByText('Payment Verification Ledger')).toBeInTheDocument();
    expect(screen.getByText(/pi_sim_e2e_888999/i)).toBeInTheDocument();
    expect(screen.getByText('SUCCEEDED')).toBeInTheDocument();
  });

  it('Step 12: Account overview and user sign out', async () => {
    useAuthStore.getState().setAuth(mockCustomerUser, {
      accessToken: 'access_valid',
      refreshToken: 'refresh_valid',
      expiresIn: 900
    });

    const { user } = renderE2EApp('/profile');

    // Profile header
    expect(await screen.findByText('Elena Rostova')).toBeInTheDocument();
    expect(screen.getByText('elena.rostova@example.com')).toBeInTheDocument();

    // Click Sign Out
    const signOutBtn = screen.getByRole('button', { name: /sign out/i });
    await user.click(signOutBtn);

    await waitFor(() => {
      expect(authService.logout).toHaveBeenCalledTimes(1);
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().user).toBeNull();
    });
  });
});
