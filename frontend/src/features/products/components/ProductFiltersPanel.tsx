import React, { useEffect, useState } from 'react';
import { Category } from '../../../types';
import { CategoryFilterList } from './CategoryFilterList';
import { Button } from '../../../components/ui/Button';
import { DollarSign, RotateCcw } from 'lucide-react';

export interface ProductFiltersPanelProps {
  categories: Category[];
  isCategoriesLoading?: boolean;
  selectedCategory?: string;
  minPrice?: number;
  maxPrice?: number;
  activeFilterCount: number;
  onSelectCategory: (slug?: string) => void;
  onApplyPriceRange: (min?: number, max?: number) => void;
  onResetFilters: () => void;
}

export const ProductFiltersPanel: React.FC<ProductFiltersPanelProps> = ({
  categories,
  isCategoriesLoading = false,
  selectedCategory,
  minPrice,
  maxPrice,
  activeFilterCount,
  onSelectCategory,
  onApplyPriceRange,
  onResetFilters
}) => {
  const [minInput, setMinInput] = useState(minPrice !== undefined ? String(minPrice) : '');
  const [maxInput, setMaxInput] = useState(maxPrice !== undefined ? String(maxPrice) : '');
  const [priceError, setPriceError] = useState('');

  useEffect(() => {
    setMinInput(minPrice !== undefined ? String(minPrice) : '');
    setMaxInput(maxPrice !== undefined ? String(maxPrice) : '');
    setPriceError('');
  }, [minPrice, maxPrice]);

  const handlePriceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedMin = minInput.trim() !== '' ? Number(minInput) : undefined;
    const parsedMax = maxInput.trim() !== '' ? Number(maxInput) : undefined;

    if (parsedMin !== undefined && (Number.isNaN(parsedMin) || parsedMin < 0)) {
      setPriceError('Minimum price must be 0 or greater.');
      return;
    }
    if (parsedMax !== undefined && (Number.isNaN(parsedMax) || parsedMax < 0)) {
      setPriceError('Maximum price must be 0 or greater.');
      return;
    }
    if (parsedMin !== undefined && parsedMax !== undefined && parsedMax < parsedMin) {
      setPriceError('Maximum price must be greater than or equal to minimum price.');
      return;
    }

    setPriceError('');
    onApplyPriceRange(parsedMin, parsedMax);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <h2 className="text-sm font-bold text-gray-900">Filter Products</h2>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset ({activeFilterCount})</span>
          </button>
        )}
      </div>

      {/* Categories */}
      <CategoryFilterList
        categories={categories}
        selectedCategory={selectedCategory}
        isLoading={isCategoriesLoading}
        onSelectCategory={onSelectCategory}
      />

      {/* Price Range */}
      <div className="border-t border-gray-100 pt-5 space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500">
          <DollarSign className="w-3.5 h-3.5 text-primary-600" />
          <span>Price Range (USD)</span>
        </div>

        <form onSubmit={handlePriceSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="filter-min-price" className="block text-[11px] text-gray-500 mb-1">
                Min ($)
              </label>
              <input
                id="filter-min-price"
                type="number"
                min={0}
                step="0.01"
                placeholder="0"
                value={minInput}
                onChange={(e) => {
                  setMinInput(e.target.value);
                  if (priceError) setPriceError('');
                }}
                className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <div>
              <label htmlFor="filter-max-price" className="block text-[11px] text-gray-500 mb-1">
                Max ($)
              </label>
              <input
                id="filter-max-price"
                type="number"
                min={0}
                step="0.01"
                placeholder="Any"
                value={maxInput}
                onChange={(e) => {
                  setMaxInput(e.target.value);
                  if (priceError) setPriceError('');
                }}
                className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>

          {priceError && (
            <p className="text-[11px] text-rose-600" role="alert">
              {priceError}
            </p>
          )}

          <Button type="submit" variant="outline" size="sm" className="w-full">
            Apply Price Filter
          </Button>
        </form>
      </div>
    </div>
  );
};
