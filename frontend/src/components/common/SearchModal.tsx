import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../../store/ui-store';
import { Search, X, ArrowRight, Package, Loader2, AlertCircle } from 'lucide-react';
import { ImageWithFallback } from '../ui/ImageWithFallback';
import { PriceDisplay } from '../ui/PriceDisplay';
import { useProductsQuery } from '../../features/products/hooks/useProducts';
import { formatErrorMessage } from '../../utils/error-handler';

export const SearchModal: React.FC = () => {
  const { isSearchModalOpen, closeSearchModal } = useUIStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        useUIStore.getState().toggleSearchModal();
      }
      if (e.key === 'Escape' && isSearchModalOpen) {
        closeSearchModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchModalOpen, closeSearchModal]);

  useEffect(() => {
    const trimmed = searchTerm.trim();
    if (!trimmed) {
      setDebouncedTerm('');
      return;
    }

    const timer = window.setTimeout(() => {
      setDebouncedTerm(trimmed);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  const { data, isLoading, isError, error } = useProductsQuery(
    { search: debouncedTerm, limit: 5, page: 1 },
    { enabled: isSearchModalOpen && debouncedTerm.length > 0 }
  );

  if (!isSearchModalOpen) return null;

  const filteredProducts = data?.products ?? [];

  const handleSelectProduct = (slug: string) => {
    closeSearchModal();
    setSearchTerm('');
    setDebouncedTerm('');
    navigate(`/products/${slug}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      const target = searchTerm.trim();
      closeSearchModal();
      setSearchTerm('');
      setDebouncedTerm('');
      navigate(`/products?search=${encodeURIComponent(target)}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 md:p-20" role="dialog" aria-modal="true" aria-label="Search products">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={closeSearchModal}
      />

      <div className="relative mx-auto max-w-xl transform rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Search Input Bar */}
        <form onSubmit={handleSearchSubmit} className="relative border-b border-gray-100 flex items-center px-4">
          <Search className="w-5 h-5 text-gray-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search products by name or description..."
            className="w-full bg-transparent px-3 py-4 text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setDebouncedTerm('');
              }}
              aria-label="Clear search query"
              className="p-1 rounded-md text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block rounded bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500 border border-gray-200 ml-2">
            ESC
          </kbd>
        </form>

        {/* Results Container */}
        <div className="max-h-96 overflow-y-auto p-2">
          {searchTerm.trim() ? (
            isLoading || debouncedTerm !== searchTerm.trim() ? (
              <div className="p-8 flex items-center justify-center gap-2 text-xs text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                <span>Searching catalogue...</span>
              </div>
            ) : isError ? (
              <div className="p-6 text-center text-xs text-rose-700 space-y-1">
                <AlertCircle className="w-6 h-6 text-rose-500 mx-auto" />
                <p>{formatErrorMessage(error)}</p>
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="space-y-1">
                <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Products ({data?.meta.total ?? filteredProducts.length})
                </div>
                {filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectProduct(p.slug)}
                    className="w-full flex items-center gap-3.5 p-2.5 rounded-xl hover:bg-gray-50 text-left transition-colors group"
                  >
                    <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden shrink-0 border border-gray-100">
                      <ImageWithFallback
                        src={p.images[0]?.url}
                        alt={p.images[0]?.altText || p.name}
                        aspectRatio="square"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {p.category && (
                          <span className="text-[10px] font-semibold uppercase text-primary-600">
                            {p.category.name}
                          </span>
                        )}
                        <span className="text-gray-300">•</span>
                        <span className="text-[10px] text-gray-400 font-mono">{p.sku}</span>
                      </div>
                      <h4 className="text-sm font-medium text-gray-900 truncate group-hover:text-primary-600">
                        {p.name}
                      </h4>
                    </div>
                    <PriceDisplay price={p.price} size="sm" className="shrink-0" />
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary-600 group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
                <div className="p-2 border-t border-gray-100 mt-2">
                  <button
                    type="button"
                    onClick={handleSearchSubmit}
                    className="w-full text-center py-2 text-xs font-semibold text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
                  >
                    See all results for &quot;{searchTerm}&quot; →
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">No products match &quot;{searchTerm}&quot;</p>
                <p className="text-xs text-gray-400 mt-1">
                  Try another product name or browse the full catalog.
                </p>
              </div>
            )
          ) : (
            <div className="p-4 space-y-3">
              <p className="text-xs text-gray-500">
                Start typing to search across product titles and descriptions in real time.
              </p>
              <div className="pt-2 border-t border-gray-100 text-[11px] text-gray-400 flex items-center justify-between">
                <span>
                  Tip: Press <kbd className="font-mono bg-gray-100 px-1 rounded">Cmd + K</kbd> anywhere to search
                </span>
                <span>Press Enter for full results</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
