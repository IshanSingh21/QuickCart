import React, { useEffect } from 'react';
import { X, SlidersHorizontal } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

export interface MobileFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  totalResults?: number;
  children: React.ReactNode;
}

export const MobileFilterDrawer: React.FC<MobileFilterDrawerProps> = ({
  isOpen,
  onClose,
  totalResults,
  children
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Product filters">
      <div
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 left-0 w-full max-w-xs bg-white shadow-2xl flex flex-col border-r border-gray-200 animate-in slide-in-from-left duration-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-primary-600" />
            <span className="font-bold text-base text-gray-900">Filters</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            aria-label="Close filters"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">{children}</div>

        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <Button type="button" className="w-full" onClick={onClose}>
            {typeof totalResults === 'number'
              ? `View ${totalResults} Result${totalResults === 1 ? '' : 's'}`
              : 'Apply Filters'}
          </Button>
        </div>
      </div>
    </div>
  );
};
