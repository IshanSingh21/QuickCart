import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError, AxiosHeaders } from 'axios';
import { ProductDetailPage } from '../../../pages/ProductDetailPage';
import { productsService } from '../../../services/products.service';
import { cartService } from '../../../services/cart.service';
import { useAuthStore } from '../../../store/auth-store';
import { useGuestCartStore } from '../../../store/guest-cart-store';
import { Cart, Product } from '../../../types';

const multiImageProduct: Product = {
  id: 'prod-100',
  name: 'Keychron Q1 Pro Keyboard',
  slug: 'keychron-q1-pro',
  sku: 'KEY-Q1-PRO',
  description: 'Wireless custom mechanical keyboard with aluminum chassis.',
  price: '199.99',
  stock: 8,
  version: 1,
  categoryId: 'cat-10',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  category: { id: 'cat-10', name: 'Keyboards', slug: 'keyboards' },
  images: [
    {
      id: 'img-a',
      productId: 'prod-100',
      url: 'https://example.com/q1-front.jpg',
      altText: 'Keychron Q1 Front',
      isPrimary: true,
      sortOrder: 0
    },
    {
      id: 'img-b',
      productId: 'prod-100',
      url: 'https://example.com/q1-side.jpg',
      altText: 'Keychron Q1 Side Profile',
      isPrimary: false,
      sortOrder: 1
    }
  ]
};

const relatedKeyboard: Product = {
  ...multiImageProduct,
  id: 'prod-101',
  name: 'Keychron V1 Max',
  slug: 'keychron-v1-max',
  sku: 'KEY-V1-MAX',
  price: '99.99',
  images: []
};

function renderProductDetail(slug = 'keychron-q1-pro') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/products/${slug}`]}>
        <Routes>
          <Route path="/products" element={<div data-testid="catalog-page">Catalog</div>} />
          <Route path="/products/:slug" element={<ProductDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('ProductDetailPage Gallery, Stock & Add-to-Cart', () => {
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

  it('displays verified product details, switches gallery images, and renders safe related products', async () => {
    const user = userEvent.setup();
    vi.spyOn(productsService, 'getProductBySlugOrId').mockResolvedValueOnce(multiImageProduct);
    vi.spyOn(productsService, 'listProducts').mockResolvedValueOnce({
      products: [multiImageProduct, relatedKeyboard],
      meta: { page: 1, limit: 5, total: 2, totalPages: 1 }
    });

    renderProductDetail();

    expect(
      await screen.findByRole('heading', { name: 'Keychron Q1 Pro Keyboard' })
    ).toBeInTheDocument();
    expect(screen.getByText('SKU: KEY-Q1-PRO')).toBeInTheDocument();
    expect(screen.getByText('$199.99')).toBeInTheDocument();
    expect(screen.getByText(/in stock \(8 available\)/i)).toBeInTheDocument();
    expect(
      screen.getByText('Wireless custom mechanical keyboard with aluminum chassis.')
    ).toBeInTheDocument();

    // Switch gallery thumbnail
    const secondThumb = screen.getByRole('button', { name: /view image 2 of 2/i });
    await user.click(secondThumb);
    expect(secondThumb).toHaveAttribute('aria-current', 'true');
    expect(screen.getAllByAltText('Keychron Q1 Side Profile')).toHaveLength(2);

    // Related products excludes current product and displays sibling
    expect(
      await screen.findByRole('heading', { name: 'Keychron V1 Max' })
    ).toBeInTheDocument();
  });

  it('submits selected quantity to backend POST /cart/items when authenticated', async () => {
    const user = userEvent.setup();
    useAuthStore.setState({
      isAuthenticated: true,
      accessToken: 'jwt-valid',
      user: {
        id: 'u1',
        email: 'user@example.com',
        firstName: 'Sam',
        lastName: 'User',
        role: 'CUSTOMER',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
      }
    });

    vi.spyOn(productsService, 'getProductBySlugOrId').mockResolvedValueOnce(multiImageProduct);
    vi.spyOn(productsService, 'listProducts').mockResolvedValueOnce({
      products: [multiImageProduct],
      meta: { page: 1, limit: 5, total: 1, totalPages: 1 }
    });

    const mockCart: Cart = {
      cartId: 'cart-1',
      items: [],
      subtotal: '599.97',
      itemCount: 3,
      distinctCount: 1
    };
    const addSpy = vi.spyOn(cartService, 'addItem').mockResolvedValueOnce(mockCart);

    renderProductDetail();
    await screen.findByRole('heading', { name: 'Keychron Q1 Pro Keyboard' });

    const incrementBtn = screen.getByRole('button', { name: /increase quantity/i });
    await user.click(incrementBtn);
    await user.click(incrementBtn);

    await user.click(screen.getByRole('button', { name: /add to cart/i }));

    await waitFor(() => {
      expect(addSpy).toHaveBeenCalledWith('prod-100', 3);
    });
  });

  it('disables quantity and add-to-cart controls when product is out of stock', async () => {
    vi.spyOn(productsService, 'getProductBySlugOrId').mockResolvedValueOnce({
      ...multiImageProduct,
      stock: 0
    });
    vi.spyOn(productsService, 'listProducts').mockResolvedValueOnce({
      products: [],
      meta: { page: 1, limit: 5, total: 0, totalPages: 0 }
    });

    renderProductDetail();
    await screen.findByRole('heading', { name: 'Keychron Q1 Pro Keyboard' });

    expect(screen.getByRole('button', { name: /out of stock/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /increase quantity/i })).toBeDisabled();
  });

  it('renders friendly not-found state on 404 product error', async () => {
    const headers = new AxiosHeaders();
    const config = { headers };
    const notFoundErr = new AxiosError(
      'Not Found',
      'ERR_BAD_REQUEST',
      config,
      {},
      { status: 404, statusText: 'Not Found', headers, config, data: {} }
    );

    vi.spyOn(productsService, 'getProductBySlugOrId').mockRejectedValueOnce(notFoundErr);

    renderProductDetail('non-existent-slug');

    expect(await screen.findByText(/product not found/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to products/i })).toHaveAttribute(
      'href',
      '/products'
    );
  });
});
