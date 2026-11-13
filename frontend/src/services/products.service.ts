import { apiClient } from '../lib/api-client';
import { ApiResponse, PaginationMeta, Product, ProductQueryParams } from '../types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ProductListResult {
  products: Product[];
  meta: PaginationMeta;
}

export function cleanProductQueryParams(params: ProductQueryParams = {}): Record<string, string | number> {
  const cleaned: Record<string, string | number> = {};

  if (params.page && params.page >= 1) cleaned.page = params.page;
  if (params.limit && params.limit >= 1) cleaned.limit = Math.min(params.limit, 50);
  if (params.search && params.search.trim()) cleaned.search = params.search.trim();
  if (params.category && params.category.trim()) cleaned.category = params.category.trim();
  if (params.minPrice !== undefined && !Number.isNaN(params.minPrice) && params.minPrice >= 0) {
    cleaned.minPrice = params.minPrice;
  }
  if (params.maxPrice !== undefined && !Number.isNaN(params.maxPrice) && params.maxPrice >= 0) {
    cleaned.maxPrice = params.maxPrice;
  }
  if (params.sortBy) cleaned.sortBy = params.sortBy;
  if (params.order) cleaned.order = params.order;
  if (params.isActive) cleaned.isActive = params.isActive;

  return cleaned;
}

export const productsService = {
  /**
   * Fetch paginated, filtered, sorted products from GET /api/v1/products
   */
  async listProducts(params: ProductQueryParams = {}): Promise<ProductListResult> {
    const response = await apiClient.get<ApiResponse<Product[]>>('/products', {
      params: cleanProductQueryParams(params)
    });

    return {
      products: response.data.data,
      meta: response.data.meta ?? {
        page: params.page ?? 1,
        limit: params.limit ?? 10,
        total: response.data.data.length,
        totalPages: response.data.data.length > 0 ? 1 : 0
      }
    };
  },

  /**
   * Fetch single product by slug from GET /api/v1/products/slug/:slug
   */
  async getProductBySlug(slug: string): Promise<Product> {
    const response = await apiClient.get<ApiResponse<Product>>(
      `/products/slug/${encodeURIComponent(slug.trim())}`
    );
    return response.data.data;
  },

  /**
   * Fetch single product by UUID from GET /api/v1/products/:id
   */
  async getProductById(id: string): Promise<Product> {
    const response = await apiClient.get<ApiResponse<Product>>(
      `/products/${encodeURIComponent(id.trim())}`
    );
    return response.data.data;
  },

  /**
   * Automatically resolves either UUID or URL slug to the matching backend product detail endpoint
   */
  async getProductBySlugOrId(slugOrId: string): Promise<Product> {
    const trimmed = slugOrId.trim();
    if (UUID_REGEX.test(trimmed)) {
      return this.getProductById(trimmed);
    }
    return this.getProductBySlug(trimmed);
  }
};
