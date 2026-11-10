import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../../store/ui-store';
import { Search, X, ArrowRight, Package } from 'lucide-react';
import { MOCK_PRODUCTS } from '../../mocks/mock-products';
import { ImageWithFallback } from '../ui/ImageWithFallback';
import { PriceDisplay } from '../ui/PriceDisplay';

export const SearchModal: React.FC = () => {
  const { isSearchModalOpen, closeSearchModal } = useUIStore();
  const [searchTerm, setSearchTerm] = useState('');
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

  if (!isSearchModalOpen) return null;

  const filteredProducts = searchTerm.trim()
    ? MOCK_PRODUCTS.filter(
        (p) =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.categoryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.description.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 5)
    : [];

  const handleSelectProduct = (slug: string) => {
    closeSearchModal();
    setSearchTerm('');
    navigate(`/products/${slug}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      closeSearchModal();
      navigate(`/products?search=${encodeURIComponent(searchTerm.trim())}`);
      setSearchTerm('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 md:p-20" role="dialog" aria-modal="true">
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
            placeholder="Search audio, laptops, peripherals, SKUs..."
            className="w-full bg-transparent px-3 py-4 text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block rounded bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500 border border-gray-200 ml-2">
            ESC
          </kbd>
        </form>

        {/* Results / Suggestions Container */}
        <div className="max-h-96 overflow-y-auto p-2">
          {searchTerm.trim() ? (
            filteredProducts.length > 0 ? (
              <div className="space-y-1">
                <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Products ({filteredProducts.length})
                </div>
                {filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectProduct(p.slug)}
                    className="w-full flex items-center gap-3.5 p-2.5 rounded-xl hover:bg-gray-50 text-left transition-colors group"
                  >
                    <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden shrink-0 border border-gray-100">
                      <ImageWithFallback src={p.imageUrl} alt={p.name} aspectRatio="square" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase text-primary-600">
                          {p.categoryName}
                        </span>
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
                <p className="text-xs text-gray-400 mt-1">Try checking for spelling or search general keywords like &quot;Audio&quot;</p>
              </div>
            )
          ) : (
            <div className="p-4 space-y-4">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block mb-2">
                  Popular Searches
                </span>
                <div className="flex flex-wrap gap-2">
                  {['Sony WH-1000XM5', 'MacBook Pro M3', 'Logitech MX Master', 'Noise Cancelling', 'Anker 140W'].map(
                    (tag) => (
                      <button
                        key={tag}
                        onClick={() => setSearchTerm(tag)}
                        className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-200 transition-colors"
                      >
                        {tag}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 text-[11px] text-gray-400 flex items-center justify-between">
                <span>Tip: Press <kbd className="font-mono bg-gray-100 px-1 rounded">Cmd + K</kbd> anywhere to search</span>
                <span>PostgreSQL Full-Text Search</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
