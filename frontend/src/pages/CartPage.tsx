import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const CartPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-xl mx-auto text-center space-y-6 bg-white p-8 sm:p-12 rounded-2xl border border-gray-200 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
          <ShoppingCart className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">Your Shopping Cart is Empty</h2>
          <p className="text-sm text-gray-500">
            Explore our curated technology catalog and add items with server-side stock verification.
          </p>
        </div>
        <Link to="/products">
          <Button size="md" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Continue Shopping
          </Button>
        </Link>
      </div>
    </div>
  );
};
