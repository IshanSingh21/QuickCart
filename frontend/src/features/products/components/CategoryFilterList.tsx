import React from 'react';
import { Category } from '../../../types';
import { cn } from '../../../utils/cn';
import { FolderTree } from 'lucide-react';

export interface CategoryFilterListProps {
  categories: Category[];
  selectedCategory?: string;
  isLoading?: boolean;
  onSelectCategory: (slugOrId?: string) => void;
}

interface CategoryNodeProps {
  category: Category;
  selectedCategory?: string;
  depth?: number;
  onSelectCategory: (slugOrId?: string) => void;
}

const CategoryNode: React.FC<CategoryNodeProps> = ({
  category,
  selectedCategory,
  depth = 0,
  onSelectCategory
}) => {
  const isSelected =
    selectedCategory === category.slug || selectedCategory === category.id;
  const count = category._count?.products;

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelectCategory(category.slug)}
        style={depth > 0 ? { paddingLeft: `${0.75 + depth * 0.75}rem` } : undefined}
        className={cn(
          'w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors',
          isSelected
            ? 'bg-primary-50 text-primary-700 font-semibold border border-primary-200/70'
            : 'text-gray-700 hover:bg-gray-100/80 font-medium'
        )}
        aria-current={isSelected ? 'true' : undefined}
      >
        <span className="truncate">{category.name}</span>
        {typeof count === 'number' && (
          <span
            className={cn(
              'text-[10px] rounded-full px-1.5 py-0.5 tabular-nums shrink-0',
              isSelected ? 'bg-primary-100 text-primary-800' : 'bg-gray-100 text-gray-500'
            )}
          >
            {count}
          </span>
        )}
      </button>

      {category.children && category.children.length > 0 && (
        <ul className="mt-0.5 space-y-0.5 border-l border-gray-200 ml-3 pl-1">
          {category.children.map((child) => (
            <CategoryNode
              key={child.id}
              category={child}
              selectedCategory={selectedCategory}
              depth={depth + 1}
              onSelectCategory={onSelectCategory}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

export const CategoryFilterList: React.FC<CategoryFilterListProps> = ({
  categories,
  selectedCategory,
  isLoading = false,
  onSelectCategory
}) => {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500">
        <FolderTree className="w-3.5 h-3.5 text-primary-600" />
        <span>Categories</span>
      </div>

      {isLoading ? (
        <div className="space-y-2 animate-pulse" aria-label="Loading categories">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : (
        <ul className="space-y-1">
          <li>
            <button
              type="button"
              onClick={() => onSelectCategory(undefined)}
              className={cn(
                'w-full flex items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-colors',
                !selectedCategory
                  ? 'bg-primary-50 text-primary-700 font-semibold border border-primary-200/70'
                  : 'text-gray-700 hover:bg-gray-100/80 font-medium'
              )}
              aria-current={!selectedCategory ? 'true' : undefined}
            >
              <span>All Categories</span>
            </button>
          </li>
          {categories.map((cat) => (
            <CategoryNode
              key={cat.id}
              category={cat}
              selectedCategory={selectedCategory}
              onSelectCategory={onSelectCategory}
            />
          ))}
        </ul>
      )}
    </div>
  );
};
