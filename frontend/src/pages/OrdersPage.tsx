import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, ArrowRight, Clock, ChevronRight, Truck } from 'lucide-react';
import { useMyOrdersQuery } from '../features/checkout/hooks/useCheckout';
import { OrderStatus } from '../types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { PriceDisplay } from '../components/ui/PriceDisplay';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';

export const OrdersPage: React.FC = () => {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | undefined>(undefined);
  const { data, isLoading, isError, refetch } = useMyOrdersQuery(
    selectedStatus ? { status: selectedStatus } : undefined
  );

  const orders = data?.orders ?? [];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Page Header */}
      <div className="flex flex-wrap items-baseline justify-between gap-4 pb-6 border-b border-gray-100">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
            Order History
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Verified backend orders, frozen price snapshots, and payment status receipts.
          </p>
        </div>
        <Link to="/products">
          <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
            Continue Shopping
          </Button>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-3 text-xs">
        {[
          { label: 'All Orders', value: undefined },
          { label: 'Paid & Settled', value: 'PAID' as OrderStatus },
          { label: 'Pending Payment', value: 'PENDING_PAYMENT' as OrderStatus },
          { label: 'Cancelled', value: 'CANCELLED' as OrderStatus }
        ].map((tab) => {
          const isActive = selectedStatus === tab.value;
          return (
            <button
              key={tab.label}
              type="button"
              onClick={() => setSelectedStatus(tab.value)}
              className={`px-3 py-1.5 rounded-full font-semibold transition-colors ${
                isActive
                  ? 'bg-primary-600 text-white shadow-2xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 bg-gray-100 rounded-2xl border border-gray-200/60" />
          ))}
        </div>
      )}

      {/* Error State */}
      {isError && (
        <ErrorState
          title="Could not load your orders"
          message="We were unable to connect to the orders service. Please retry."
          onRetry={() => void refetch()}
        />
      )}

      {/* Empty State */}
      {!isLoading && !isError && orders.length === 0 && (
        <EmptyState
          icon={<Package className="w-8 h-8 text-primary-600" />}
          title="No Orders Found"
          description={
            selectedStatus
              ? `You do not have any orders matching the status filter "${selectedStatus}".`
              : "You haven't placed any orders yet. Discover our latest technology products."
          }
          action={
            <Link to="/products">
              <Button size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Explore Products
              </Button>
            </Link>
          }
        />
      )}

      {/* Orders List */}
      {!isLoading && !isError && orders.length > 0 && (
        <div className="space-y-4">
          {orders.map((order) => {
            const isPaid = order.status === 'PAID';
            const isPending = order.status === 'PENDING_PAYMENT';

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-xs hover:border-gray-200 transition-colors space-y-4"
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-gray-950 text-sm">{order.orderNumber}</span>
                    <Badge
                      variant={isPaid ? 'success' : isPending ? 'warning' : 'out-of-stock'}
                      size="sm"
                      dot
                    >
                      {order.status}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-gray-500">
                    <span>
                      {new Date(order.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                    <PriceDisplay price={order.totalAmount} size="sm" className="font-bold text-gray-950" />
                  </div>
                </div>

                {/* Items & Shipping row */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <p className="font-semibold text-gray-900">
                      {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
                    </p>
                    <p className="text-gray-500 line-clamp-1 max-w-lg">
                      {order.items.map((i) => `${i.productName} (×${i.quantity})`).join(', ')}
                    </p>
                    <p className="text-[11px] text-gray-400 flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5" />
                      Ships to {order.shippingAddress.fullName}, {order.shippingAddress.city},{' '}
                      {order.shippingAddress.country}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0">
                    {isPending ? (
                      <Link to={`/checkout/status/${order.id}`}>
                        <Button size="sm" leftIcon={<Clock className="w-3.5 h-3.5" />}>
                          Complete Payment
                        </Button>
                      </Link>
                    ) : (
                      <Link to={`/checkout/confirmation/${order.id}`}>
                        <Button variant="outline" size="sm" rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>
                          View Receipt
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
