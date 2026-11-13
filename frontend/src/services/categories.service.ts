import { apiClient } from '../lib/api-client';
import { ApiResponse, Category } from '../types';

export const categoriesService = {
  /**
   * Fetch all categories from GET /api/v1/categories
   * @param tree - When true, returns hierarchical root categories with nested children
   */
  async listCategories(tree = true): Promise<Category[]> {
    const response = await apiClient.get<ApiResponse<Category[]>>('/categories', {
      params: { tree: String(tree) }
    });
    return response.data.data;
  },

  /**
   * Fetch single category details by UUID from GET /api/v1/categories/:id
   */
  async getCategoryById(id: string): Promise<Category> {
    const response = await apiClient.get<ApiResponse<Category>>(`/categories/${encodeURIComponent(id)}`);
    return response.data.data;
  }
};
