import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProductsPage } from '../../../pages/ProductsPage';
import { categoriesService } from '../../../services/categories.service';
import { productsService, ProductListResult } from '../../../services/products.service';
import { Category, Product } from '../../../types';

const mockCategories: Category[] = [
  {
    id: 'cat-1',
    name: 'Audio',
    slug: 'audio',
    description: 'Studio headphones',
    parentId: null,
    _count: { products: 2 },
    children: []
  },
  {
    id: 'cat-2',
    name: 'Peripherals',
    slug: 'peripherals',
    description: 'Input devices',
    parentId: null,
    _count: { products: 1 },
    children: []
  }
];

const mockProducts: Product[] = [
  {
    id: 'prod-1',
    name: 'Sony WH-1000XM5 Headphones',
    slug: 'sony-wh-1000xm5',
    sku: 'SONY-XM5-BLK',
    description: 'Noise canceling wireless headphones',
    price: '349.99',
    stock: 15,
    version: 1,
    categoryId: 'cat-1',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    category: { id: 'cat-1', name: 'Audio', slug: 'audio' },
    images: [
      {
        id: 'img-1',
        productId: 'prod-1',
        url: 'https://example.com/xm5.jpg',
        altText: 'Sony XM5',
        isPrimary: true,
        sortOrder: 0
      }
    ]
  },
  {
    id: 'prod-2',
    name: 'Logitech MX Master 3S',
    slug: 'logitech-mx-master-3s',
    sku: 'LOGI-MX3S',
    description: 'Precision wireless mouse',
    price: '99.99',
    stock: 0,
    version: 1,
    categoryId: 'cat-2',
    isActive: true,
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    category: { id: 'cat-2', name: 'Peripherals', slug: 'peripherals' },
    images: []
  }
];

const LocationSearchProbe: React.FC = () => {
  const location = useLocation();
  return <div data-testid="url-search">{location.search}</div>;
};

function renderProductsPage(initialEntry = '/products') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route
            path="/products"
            element={
              <>
                <ProductsPage />
                <LocationSearchProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('ProductsPage Catalogue & Discovery', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(categoriesService, 'listCategories').mockResolvedValue(mockCategories);
  });

  it('renders loading skeletons then displays real backend products without fabricated ratings', async () => {
    let resolveProducts!: (value: ProductListResult) => void;
    const pendingPromise = new Promise<ProductListResult>((resolve) => {
      resolveProducts = resolve;
    });

    vi.spyOn(productsService, 'listProducts').mockReturnValueOnce(pendingPromise);

    const { container } = renderProductsPage();

    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);

    resolveProducts({
      products: mockProducts,
      meta: { page: 1, limit: 12, total: 2, totalPages: 1 }
    });

    expect(
      await screen.findByRole('heading', { name: 'Sony WH-1000XM5 Headphones' })
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Logitech MX Master 3S' })).toBeInTheDocument();
    expect(screen.getByText('$349.99')).toBeInTheDocument();
    expect(screen.getByText('Sold Out')).toBeInTheDocument();
    expect(screen.getByText('15 in stock')).toBeInTheDocument();

    // Ensure no fabricated star ratings appear
    expect(screen.queryByText('(24)')).not.toBeInTheDocument();
  });

  it('synchronizes category selection, sorting, and debounced search with URL query parameters', async () => {
    const user = userEvent.setup();
    const listSpy = vi.spyOn(productsService, 'listProducts').mockResolvedValue({
      products: mockProducts,
      meta: { page: 1, limit: 12, total: 2, totalPages: 1 }
    });

    renderProductsPage();
    await screen.findByText('Sony WH-1000XM5 Headphones');

    await user.click(screen.getByRole('button', { name: /audio/i }));

    await waitFor(() => {
      expect(screen.getByTestId('url-search')).toHaveTextContent('category=audio');
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'audio' })
      );
    });

    await user.selectOptions(screen.getByLabelText(/sort products/i), 'price-asc');

    await waitFor(() => {
      expect(screen.getByTestId('url-search')).toHaveTextContent('sortBy=price');
      expect(screen.getByTestId('url-search')).toHaveTextContent('order=asc');
    });

    await user.type(screen.getByLabelText(/search products/i), 'Sony');

    await waitFor(
      () => {
        expect(screen.getByTestId('url-search')).toHaveTextContent('search=Sony');
      },
      { timeout: 1500 }
    );
  });

  it('prevents invalid maxPrice < minPrice query and submits valid price bounds', async () => {
    const user = userEvent.setup();
    const listSpy = vi.spyOn(productsService, 'listProducts').mockResolvedValue({
      products: mockProducts,
      meta: { page: 1, limit: 12, total: 2, totalPages: 1 }
    });

    renderProductsPage();
    await screen.findByText('Sony WH-1000XM5 Headphones');
    const callsBefore = listSpy.mock.calls.length;

    await user.type(screen.getByLabelText(/min \(\$\)/i), '500');
    await user.type(screen.getByLabelText(/max \(\$\)/i), '100');
    await user.click(screen.getByRole('button', { name: /apply price filter/i }));

    expect(
      await screen.findByText(/maximum price must be greater than or equal to minimum price/i)
    ).toBeInTheDocument();
    expect(listSpy.mock.calls.length).toBe(callsBefore);

    await user.clear(screen.getByLabelText(/max \(\$\)/i));
    await user.type(screen.getByLabelText(/max \(\$\)/i), '800');
    await user.click(screen.getByRole('button', { name: /apply price filter/i }));

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({ minPrice: 500, maxPrice: 800 })
      );
    });
  });

  it('displays empty state with filter reset action and supports pagination', async () => {
    const user = userEvent.setup();
    const listSpy = vi
      .spyOn(productsService, 'listProducts')
      .mockResolvedValueOnce({
        products: [mockProducts[0]],
        meta: { page: 1, limit: 12, total: 24, totalPages: 2 }
      })
      .mockResolvedValueOnce({
        products: [],
        meta: { page: 2, limit: 12, total: 0, totalPages: 0 }
      });

    renderProductsPage('/products?search=missing');

    await screen.findByText('Sony WH-1000XM5 Headphones');
    await user.click(screen.getByRole('button', { name: '2' }));

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }));
    });

    expect(await screen.findByText(/no matching products found/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /clear all filters/i }));

    expect(screen.getByTestId('url-search')).toHaveTextContent('');
  });

  it('displays error state and retries fetch on button click', async () => {
    const user = userEvent.setup();
    vi.spyOn(productsService, 'listProducts')
      .mockRejectedValueOnce(new Error('Network offline'))
      .mockResolvedValueOnce({
        products: mockProducts,
        meta: { page: 1, limit: 12, total: 2, totalPages: 1 }
      });

    renderProductsPage();

    expect(await screen.findByText(/unable to load products/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByText('Sony WH-1000XM5 Headphones')).toBeInTheDocument();
  });
});
