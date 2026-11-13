import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ProductQueryParams } from '../../../types';

export const DEFAULT_PRODUCTS_LIMIT = 12;
export type SortOptionValue =
  | 'createdAt-desc'
  | 'createdAt-asc'
  | 'price-asc'
  | 'price-desc'
  | 'name-asc'
  | 'name-desc';

const VALID_SORT_BY = new Set(['createdAt', 'price', 'name']);
const VALID_ORDER = new Set(['asc', 'desc']);

function parsePositiveInt(value: string | null, fallback: number, max?: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) return fallback;
  return max ? Math.min(parsed, max) : parsed;
}

function parseNonNegativeNumber(value: string | null): number | undefined {
  if (!value || value.trim() === '') return undefined;
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0) return undefined;
  return parsed;
}

export function useProductFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters: ProductQueryParams = useMemo(() => {
    const rawSortBy = searchParams.get('sortBy') ?? 'createdAt';
    const rawOrder = searchParams.get('order') ?? 'desc';
    const minPrice = parseNonNegativeNumber(searchParams.get('minPrice'));
    const maxPrice = parseNonNegativeNumber(searchParams.get('maxPrice'));

    const validMaxPrice =
      minPrice !== undefined && maxPrice !== undefined && maxPrice < minPrice
        ? undefined
        : maxPrice;

    return {
      page: parsePositiveInt(searchParams.get('page'), 1),
      limit: parsePositiveInt(searchParams.get('limit'), DEFAULT_PRODUCTS_LIMIT, 50),
      search: searchParams.get('search')?.trim() || undefined,
      category: searchParams.get('category')?.trim() || undefined,
      minPrice,
      maxPrice: validMaxPrice,
      sortBy: (VALID_SORT_BY.has(rawSortBy) ? rawSortBy : 'createdAt') as ProductQueryParams['sortBy'],
      order: (VALID_ORDER.has(rawOrder) ? rawOrder : 'desc') as ProductQueryParams['order']
    };
  }, [searchParams]);

  const sortValue = `${filters.sortBy ?? 'createdAt'}-${filters.order ?? 'desc'}` as SortOptionValue;

  const updateParams = useCallback(
    (mutator: (next: URLSearchParams) => void) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          mutator(next);
          // Keep default page/sort out of URL for crisp shareable links
          if (next.get('page') === '1') next.delete('page');
          if (next.get('limit') === String(DEFAULT_PRODUCTS_LIMIT)) next.delete('limit');
          if (next.get('sortBy') === 'createdAt' && next.get('order') === 'desc') {
            next.delete('sortBy');
            next.delete('order');
          }
          return next;
        },
        { replace: false }
      );
    },
    [setSearchParams]
  );

  const setSearch = useCallback(
    (search: string) => {
      updateParams((next) => {
        const trimmed = search.trim();
        if (trimmed) {
          next.set('search', trimmed);
        } else {
          next.delete('search');
        }
        next.delete('page');
      });
    },
    [updateParams]
  );

  const setCategory = useCallback(
    (categorySlugOrId?: string) => {
      updateParams((next) => {
        if (categorySlugOrId && categorySlugOrId.trim()) {
          next.set('category', categorySlugOrId.trim());
        } else {
          next.delete('category');
        }
        next.delete('page');
      });
    },
    [updateParams]
  );

  const setPriceRange = useCallback(
    (minPrice?: number, maxPrice?: number) => {
      updateParams((next) => {
        if (minPrice !== undefined && !Number.isNaN(minPrice) && minPrice >= 0) {
          next.set('minPrice', String(minPrice));
        } else {
          next.delete('minPrice');
        }

        if (maxPrice !== undefined && !Number.isNaN(maxPrice) && maxPrice >= 0) {
          next.set('maxPrice', String(maxPrice));
        } else {
          next.delete('maxPrice');
        }

        next.delete('page');
      });
    },
    [updateParams]
  );

  const setSort = useCallback(
    (value: SortOptionValue) => {
      const [sortBy, order] = value.split('-') as [
        NonNullable<ProductQueryParams['sortBy']>,
        NonNullable<ProductQueryParams['order']>
      ];
      updateParams((next) => {
        if (sortBy === 'createdAt' && order === 'desc') {
          next.delete('sortBy');
          next.delete('order');
        } else {
          next.set('sortBy', sortBy);
          next.set('order', order);
        }
        next.delete('page');
      });
    },
    [updateParams]
  );

  const setPage = useCallback(
    (page: number) => {
      updateParams((next) => {
        if (page <= 1) {
          next.delete('page');
        } else {
          next.set('page', String(page));
        }
      });
    },
    [updateParams]
  );

  const resetFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: false });
  }, [setSearchParams]);

  const activeFilterCount =
    (filters.search ? 1 : 0) +
    (filters.category ? 1 : 0) +
    (filters.minPrice !== undefined || filters.maxPrice !== undefined ? 1 : 0);

  return {
    filters,
    sortValue,
    activeFilterCount,
    setSearch,
    setCategory,
    setPriceRange,
    setSort,
    setPage,
    resetFilters
  };
}
