import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  SlidersHorizontal,
  X,
  PackageSearch,
  AlertCircle
} from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Select } from '../components/ui/Select';
import { ProductCard } from '../components/ui/ProductCard';
import { ProductGrid } from '../components/ui/ProductGrid';
import { ProductSkeletonGrid } from '../components/ui/ProductSkeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Pagination } from '../components/ui/Pagination';
import { ProductFiltersPanel } from '../features/products/components/ProductFiltersPanel';
import { MobileFilterDrawer } from '../features/products/components/MobileFilterDrawer';
import { useCategoriesQuery } from '../features/categories/hooks/useCategories';
import { useProductsQuery } from '../features/products/hooks/useProducts';
import {
  SortOptionValue,
  useProductFilters
} from '../features/products/hooks/useProductFilters';
import { useAddToCartMutation } from '../features/cart/hooks/useCartActions';
import { useUIStore } from '../store/ui-store';
import { Category, Product } from '../types';
import { formatErrorMessage } from '../utils/error-handler';

const SORT_OPTIONS = [
  { value: 'createdAt-desc', label: 'Newest Arrivals' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'name-asc', label: 'Name: A to Z' },
  { value: 'name-desc', label: 'Name: Z to A' }
];

function findCategoryName(categories: Category[], slugOrId?: string): string | undefined {
  if (!slugOrId) return undefined;
  for (const cat of categories) {
    if (cat.slug === slugOrId || cat.id === slugOrId) {
      return cat.name;
    }
    if (cat.children && cat.children.length > 0) {
      const childMatch = findCategoryName(cat.children, slugOrId);
      if (childMatch) return childMatch;
    }
  }
  return undefined;
}

export const ProductsPage: React.FC = () => {
  const {
    filters,
    sortValue,
    activeFilterCount,
    setSearch,
    setCategory,
    setPriceRange,
    setSort,
    setPage,
    resetFilters
  } = useProductFilters();

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(filters.search ?? '');
  const [addingProductId, setAddingProductId] = useState<string | null>(null);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const [cartFeedbackError, setCartFeedbackError] = useState<string | null>(null);

  const openCartDrawer = useUIStore((state) => state.openCartDrawer);
  const addToCartMutation = useAddToCartMutation();

  const { data: categories = [], isLoading: isCategoriesLoading } = useCategoriesQuery(true);
  const {
    data,
    isLoading,
    isFetching,
    isPlaceholderData,
    isError,
    error,
    refetch
  } = useProductsQuery(filters);

  // Sync local search input when URL param changes externally (e.g. from Header or reset)
  useEffect(() => {
    setSearchInput(filters.search ?? '');
  }, [filters.search]);

  // Debounce search query changes to avoid unnecessary API requests per keystroke
  useEffect(() => {
    const trimmedInput = searchInput.trim();
    const currentSearch = filters.search ?? '';
    if (trimmedInput === currentSearch) return;

    const timer = window.setTimeout(() => {
      setSearch(trimmedInput);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchInput, filters.search, setSearch]);

  const activeCategoryLabel = useMemo(
    () => findCategoryName(categories, filters.category) ?? filters.category,
    [categories, filters.category]
  );

  const products = data?.products ?? [];
  const meta = data?.meta;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    if (typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleAddToCart = async (product: Product) => {
    setCartFeedbackError(null);
    setAddingProductId(product.id);
    try {
      await addToCartMutation.mutateAsync({ product, quantity: 1 });
      setAddedProductId(product.id);
      openCartDrawer();
      window.setTimeout(() => {
        setAddedProductId((current) => (current === product.id ? null : current));
      }, 1500);
    } catch (err) {
      setCartFeedbackError(formatErrorMessage(err));
    } finally {
      setAddingProductId(null);
    }
  };

  const filterPanelProps = {
    categories,
    isCategoriesLoading,
    selectedCategory: filters.category,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    activeFilterCount,
    onSelectCategory: (slug?: string) => {
      setCategory(slug);
      setMobileFiltersOpen(false);
    },
    onApplyPriceRange: (min?: number, max?: number) => {
      setPriceRange(min, max);
    },
    onResetFilters: () => {
      resetFilters();
      setMobileFiltersOpen(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-gray-200/80 pb-5">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-primary-600 block mb-1">
            Catalogue
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
            {activeCategoryLabel ? activeCategoryLabel : 'All Products'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Live inventory with real-time availability and server-side filtering.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-600">
          {meta && (
            <Badge variant="outline" size="md">
              {meta.total} {meta.total === 1 ? 'Product' : 'Products'}
            </Badge>
          )}
          {isFetching && isPlaceholderData && (
            <Badge variant="info" size="sm" dot>
              Updating...
            </Badge>
          )}
        </div>
      </div>

      {/* Top Toolbar: Search, Mobile Filter Trigger & Sort */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 md:max-w-md">
          <Input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search products by name or description..."
            aria-label="Search products"
            leftIcon={<Search className="w-4 h-4 text-gray-400" />}
            rightIcon={
              searchInput ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    setSearch('');
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : undefined
            }
          />
        </form>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => setMobileFiltersOpen(true)}
            className="lg:hidden shrink-0"
            leftIcon={<SlidersHorizontal className="w-4 h-4" />}
          >
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </Button>

          <div className="w-full sm:w-52">
            <Select
              aria-label="Sort products"
              value={sortValue}
              onChange={(e) => setSort(e.target.value as SortOptionValue)}
              options={SORT_OPTIONS}
            />
          </div>
        </div>
      </div>

      {/* Active Filter Chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs" aria-label="Active filters">
          <span className="text-gray-500 font-medium">Active:</span>

          {filters.search && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                setSearch('');
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 border border-primary-200 px-3 py-1 font-medium text-primary-800 hover:bg-primary-100 transition-colors"
            >
              <span>Search: &ldquo;{filters.search}&rdquo;</span>
              <X className="w-3 h-3" />
            </button>
          )}

          {filters.category && (
            <button
              type="button"
              onClick={() => setCategory(undefined)}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 border border-primary-200 px-3 py-1 font-medium text-primary-800 hover:bg-primary-100 transition-colors"
            >
              <span>Category: {activeCategoryLabel}</span>
              <X className="w-3 h-3" />
            </button>
          )}

          {(filters.minPrice !== undefined || filters.maxPrice !== undefined) && (
            <button
              type="button"
              onClick={() => setPriceRange(undefined, undefined)}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 border border-primary-200 px-3 py-1 font-medium text-primary-800 hover:bg-primary-100 transition-colors"
            >
              <span>
                Price: {filters.minPrice !== undefined ? `$${filters.minPrice}` : '$0'} –{' '}
                {filters.maxPrice !== undefined ? `$${filters.maxPrice}` : 'Any'}
              </span>
              <X className="w-3 h-3" />
            </button>
          )}

          <button
            type="button"
            onClick={resetFilters}
            className="text-gray-500 hover:text-gray-800 underline ml-1"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Cart Feedback Error Alert */}
      {cartFeedbackError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{cartFeedbackError}</span>
          </div>
          <button
            type="button"
            onClick={() => setCartFeedbackError(null)}
            className="p-1 rounded text-rose-600 hover:bg-rose-100"
            aria-label="Dismiss alert"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Content Layout: Desktop Sidebar + Product Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block lg:col-span-3 sticky top-24 bg-white rounded-2xl border border-gray-200/80 p-5 shadow-2xs">
          <ProductFiltersPanel {...filterPanelProps} />
        </aside>

        {/* Product Results Column */}
        <div className="lg:col-span-9 space-y-8">
          {isLoading ? (
            <ProductSkeletonGrid count={6} />
          ) : isError ? (
            <ErrorState
              title="Unable to load products"
              message={formatErrorMessage(error)}
              onRetry={() => refetch()}
            />
          ) : products.length === 0 ? (
            <EmptyState
              icon={<PackageSearch className="w-8 h-8" />}
              title="No matching products found"
              description="Try adjusting your search keywords, clearing category selections, or widening your price range."
              action={
                activeFilterCount > 0 ? (
                  <Button variant="primary" size="md" onClick={resetFilters}>
                    Clear All Filters
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <div
                className={
                  isFetching && isPlaceholderData
                    ? 'opacity-70 transition-opacity duration-200'
                    : undefined
                }
              >
                <ProductGrid columns={3}>
                  {products.map((product) => {
                    const primaryImage = product.images[0];
                    return (
                      <ProductCard
                        key={product.id}
                        id={product.id}
                        name={product.name}
                        slug={product.slug}
                        sku={product.sku}
                        price={product.price}
                        imageUrl={primaryImage?.url}
                        imageAlt={primaryImage?.altText || product.name}
                        categoryName={product.category?.name}
                        categorySlug={product.category?.slug}
                        stock={product.stock}
                        isAddingToCart={addingProductId === product.id}
                        isAddedToCart={addedProductId === product.id}
                        onAddToCart={() => void handleAddToCart(product)}
                      />
                    );
                  })}
                </ProductGrid>
              </div>

              {meta && meta.totalPages > 1 && (
                <div className="pt-4 border-t border-gray-200/70">
                  <Pagination
                    page={meta.page}
                    totalPages={meta.totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      <MobileFilterDrawer
        isOpen={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        totalResults={meta?.total}
      >
        <ProductFiltersPanel {...filterPanelProps} />
      </MobileFilterDrawer>
    </div>
  );
};
