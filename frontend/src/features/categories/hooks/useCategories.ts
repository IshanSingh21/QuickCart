import { useQuery } from '@tanstack/react-query';
import { categoriesService } from '../../../services/categories.service';
import { Category } from '../../../types';

export const categoryKeys = {
  all: ['categories'] as const,
  lists: () => [...categoryKeys.all, 'list'] as const,
  list: (tree: boolean) => [...categoryKeys.lists(), { tree }] as const,
  details: () => [...categoryKeys.all, 'detail'] as const,
  detail: (id: string) => [...categoryKeys.details(), id] as const
};

export function useCategoriesQuery(tree = true) {
  return useQuery<Category[]>({
    queryKey: categoryKeys.list(tree),
    queryFn: () => categoriesService.listCategories(tree),
    staleTime: 1000 * 60 * 10
  });
}

export function useCategoryQuery(id: string | undefined) {
  return useQuery<Category>({
    queryKey: categoryKeys.detail(id ?? ''),
    queryFn: () => categoriesService.getCategoryById(id!),
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 10
  });
}
