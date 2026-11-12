import React from 'react';
import { Link } from 'react-router-dom';
import { Package, ArrowRight } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';

export const OrdersPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
          Order History
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Authenticated view of your QuickCart orders and payment snapshots.
        </p>
      </div>

      <EmptyState
        icon={<Package className="w-8 h-8" />}
        title="Your orders workspace is protected"
        description="Full interactive order listing and simulated payment receipts will connect here in the Orders & Checkout phase."
        action={
          <Link to="/products">
            <Button size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Browse Products
            </Button>
          </Link>
        }
      />
    </div>
  );
};
