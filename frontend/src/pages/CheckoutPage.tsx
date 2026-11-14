import React from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, ArrowLeft, ShoppingBag } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';

export const CheckoutPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
          Checkout
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Review your order details and delivery preferences.
        </p>
      </div>

      <EmptyState
        icon={<CreditCard className="w-8 h-8" />}
        title="Checkout Flow Initializing"
        description="The multi-step checkout with address selection, order review, and payment processing is coming in Phase 6."
        action={
          <div className="flex items-center gap-3">
            <Link to="/cart">
              <Button variant="outline" size="md" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Back to Cart
              </Button>
            </Link>
            <Link to="/products">
              <Button size="md" rightIcon={<ShoppingBag className="w-4 h-4" />}>
                Continue Shopping
              </Button>
            </Link>
          </div>
        }
      />
    </div>
  );
};
