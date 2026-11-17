import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  ArrowRight,
  Clock,
  ChevronRight,
  Truck,
  Search,
  Filter,
  Calendar
} from 'lucide-react';
import { useMyOrdersQuery } from '../features/checkout/hooks/useCheckout';
import { OrderStatus } from '../types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { PriceDisplay } from '../components/ui/PriceDisplay';
import { Pagination } from '../components/ui/Pagination';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';

export const OrdersPage: React.FC = () => {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useMyOrdersQuery({
    page,
    limit: 10,
    status: selectedStatus
  });

  const orders = useMemo(() => data?.orders ?? [], [data?.orders]);
  const meta = data?.meta;

  // Filter orders by search query client-side for immediate responsive typing
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    const query = searchQuery.toLowerCase().trim();
    return orders.filter((order) => {
      const matchesOrderNumber = order.orderNumber.toLowerCase().includes(query);
      const matchesProduct = order.items.some((item) =>
        item.productName.toLowerCase().includes(query)
      );
      const matchesAddress = order.shippingAddress.city.toLowerCase().includes(query);
      return matchesOrderNumber || matchesProduct || matchesAddress;
    });
  }, [orders, searchQuery]);

  const handleStatusFilterChange = (status: OrderStatus | undefined) => {
    setSelectedStatus(status);
    setPage(1);
  };

  const getStatusBadgeVariant = (status: OrderStatus) => {
    switch (status) {
      case 'PAID':
        return 'success';
      case 'PENDING_PAYMENT':
        return 'warning';
      case 'PROCESSING':
      case 'SHIPPED':
      case 'DELIVERED':
        return 'primary';
      case 'CANCELLED':
      case 'EXPIRED':
        return 'out-of-stock';
      default:
        return 'default';
    }
  };

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
        <div className="flex items-center gap-2.5">
          <Link to="/profile">
            <Button variant="outline" size="sm">
              Account Overview
            </Button>
          </Link>
          <Link to="/products">
            <Button size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              Continue Shopping
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-gray-400 mr-1" />
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
                onClick={() => handleStatusFilterChange(tab.value)}
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

        {/* Search Input */}
        <div className="relative min-w-[14rem]">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by order # or item..."
            className="w-full text-xs bg-white border border-gray-200 rounded-xl pl-8 pr-3 py-1.5 text-gray-800 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
          />
        </div>
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
      {!isLoading && !isError && filteredOrders.length === 0 && (
        <EmptyState
          icon={<Package className="w-8 h-8 text-primary-600" />}
          title={searchQuery ? 'No matching orders found' : 'No Orders Found'}
          description={
            searchQuery
              ? `No orders matching "${searchQuery}". Try searching by order number or product name.`
              : selectedStatus
              ? `You do not have any orders currently in "${selectedStatus}" status.`
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
      {!isLoading && !isError && filteredOrders.length > 0 && (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
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
                    <Badge variant={getStatusBadgeVariant(order.status)} size="sm" dot>
                      {order.status}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
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
                      <>
                        <Link to={`/checkout/confirmation/${order.id}`}>
                          <Button variant="ghost" size="sm">
                            View Receipt
                          </Button>
                        </Link>
                        <Link to={`/orders/${order.id}`}>
                          <Button variant="outline" size="sm" rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>
                            View Details
                          </Button>
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Pagination Controls */}
          {meta && meta.totalPages > 1 && (
            <div className="pt-6 border-t border-gray-100 flex justify-center">
              <Pagination
                page={page}
                totalPages={meta.totalPages}
                onPageChange={(newPage) => setPage(newPage)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
