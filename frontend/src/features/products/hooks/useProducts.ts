import { keepPreviousData, QueryClient, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  cleanProductQueryParams,
  ProductListResult,
  productsService
} from '../../../services/products.service';
import { Product, ProductQueryParams } from '../../../types';

export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (params: ProductQueryParams) =>
    [...productKeys.lists(), cleanProductQueryParams(params)] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (slugOrId: string) => [...productKeys.details(), slugOrId] as const,
  related: (categorySlug: string, excludeProductId: string) =>
    [...productKeys.all, 'related', { categorySlug, excludeProductId }] as const
};

export function useProductsQuery(
  params: ProductQueryParams,
  options?: { enabled?: boolean }
) {
  const normalizedParams = cleanProductQueryParams(params);

  return useQuery<ProductListResult>({
    queryKey: productKeys.list(params),
    queryFn: () => productsService.listProducts(normalizedParams),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 2,
    enabled: options?.enabled ?? true
  });
}

export function useProductDetailQuery(slugOrId: string | undefined) {
  return useQuery<Product>({
    queryKey: productKeys.detail(slugOrId ?? ''),
    queryFn: () => productsService.getProductBySlugOrId(slugOrId!),
    enabled: Boolean(slugOrId && slugOrId.trim().length > 0),
    staleTime: 1000 * 60,
    retry: (failureCount, error) => {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return false;
      }
      return failureCount < 1;
    }
  });
}

export function useRelatedProductsQuery(
  categorySlug: string | undefined,
  excludeProductId: string | undefined
) {
  return useQuery<Product[]>({
    queryKey: productKeys.related(categorySlug ?? '', excludeProductId ?? ''),
    queryFn: async () => {
      const { products } = await productsService.listProducts({
        category: categorySlug,
        limit: 5,
        sortBy: 'createdAt',
        order: 'desc'
      });
      return products
        .filter((item) => item.id !== excludeProductId)
        .slice(0, 4);
    },
    enabled: Boolean(categorySlug && excludeProductId),
    staleTime: 1000 * 60 * 5
  });
}

export async function invalidateProductCatalog(
  queryClient: QueryClient,
  slugOrId?: string
): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: productKeys.lists() });
  if (slugOrId) {
    await queryClient.invalidateQueries({ queryKey: productKeys.detail(slugOrId) });
  }
}
