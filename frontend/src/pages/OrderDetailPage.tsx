import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Copy,
  Check,
  Clock,
  Truck,
  CreditCard,
  ShieldCheck,
  AlertTriangle,
  Package,
  Calendar,
  AlertCircle
} from 'lucide-react';
import {
  useOrderQuery,
  useOrderPaymentsQuery,
  useCancelOrderMutation
} from '../features/checkout/hooks/useCheckout';
import { formatErrorMessage } from '../utils/error-handler';
import { OrderStatus } from '../types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { PriceDisplay } from '../components/ui/PriceDisplay';
import { Dialog } from '../components/ui/Modal';
import { ErrorState } from '../components/ui/ErrorState';

export const OrderDetailPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();

  const { data: order, isLoading, isError, error, refetch } = useOrderQuery(orderId);
  const { data: payments = [], isLoading: isLoadingPayments } = useOrderPaymentsQuery(orderId);
  const cancelMutation = useCancelOrderMutation();

  const [copied, setCopied] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  // 15-Minute Expiry Countdown for PENDING_PAYMENT orders
  useEffect(() => {
    if (!order || order.status !== 'PENDING_PAYMENT') return;

    const createdAt = new Date(order.createdAt).getTime();
    const expiresAt = createdAt + 15 * 60 * 1000;

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setRemainingSeconds(diff);
      if (diff === 0) {
        void refetch();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [order, refetch]);

  const handleCopyOrderNumber = () => {
    if (!order) return;
    void navigator.clipboard.writeText(order.orderNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCancelOrder = async () => {
    if (!order) return;
    setCancelError(null);
    try {
      await cancelMutation.mutateAsync(order.id);
      setIsCancelModalOpen(false);
      void refetch();
    } catch (err) {
      setCancelError(formatErrorMessage(err));
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-pulse space-y-6">
        <div className="h-4 w-32 bg-gray-200 rounded" />
        <div className="h-8 w-64 bg-gray-200 rounded" />
        <div className="h-64 bg-gray-100 rounded-2xl" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <ErrorState
          title="Order Not Found"
          message={
            error
              ? formatErrorMessage(error)
              : 'The requested order does not exist or does not belong to your account.'
          }
          onRetry={() => void refetch()}
        />
        <div className="mt-6 text-center">
          <Link to="/orders">
            <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back to Order History
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isPending = order.status === 'PENDING_PAYMENT';
  const isPaid = order.status === 'PAID';
  const isCancelled = order.status === 'CANCELLED';
  const isExpired = order.status === 'EXPIRED';

  const minutesLeft = remainingSeconds !== null ? Math.floor(remainingSeconds / 60) : 15;
  const secondsLeft = remainingSeconds !== null ? remainingSeconds % 60 : 0;
  const isTimeExpired = remainingSeconds !== null && remainingSeconds <= 0;

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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-xs text-gray-500">
          <li>
            <Link to="/" className="hover:text-primary-600">
              Home
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link to="/orders" className="hover:text-primary-600">
              Orders
            </Link>
          </li>
          <li>/</li>
          <li className="font-semibold text-gray-900 font-mono">{order.orderNumber}</li>
        </ol>
      </nav>

      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-gray-100">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 font-mono tracking-tight">
              {order.orderNumber}
            </h1>
            <Badge variant={getStatusBadgeVariant(order.status)} size="md" dot>
              {order.status}
            </Badge>
          </div>
          <p className="text-xs text-gray-500 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            Placed on{' '}
            {new Date(order.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleCopyOrderNumber}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs"
            aria-label="Copy order number"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-gray-400" />
                <span>Copy Number</span>
              </>
            )}
          </button>

          <Link to="/orders">
            <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
              Back to Orders
            </Button>
          </Link>
        </div>
      </div>

      {/* PENDING_PAYMENT Action Banner */}
      {isPending && !isTimeExpired && (
        <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-950">Payment Action Required</p>
              <p className="text-[11px] text-amber-800">
                Reservation expires in{' '}
                <strong className="font-mono font-bold">
                  {String(minutesLeft).padStart(2, '0')}:{String(secondsLeft).padStart(2, '0')}
                </strong>
                . Complete payment to secure your items.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to={`/checkout/status/${order.id}`}>
              <Button size="sm" leftIcon={<CreditCard className="w-3.5 h-3.5" />}>
                Complete Payment
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCancelModalOpen(true)}
              disabled={cancelMutation.isPending}
            >
              Cancel Order
            </Button>
          </div>
        </div>
      )}

      {/* CANCELLED or EXPIRED Banner */}
      {(isCancelled || isExpired) && (
        <div className="p-4 rounded-2xl bg-gray-100 border border-gray-200/80 text-xs text-gray-600 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-gray-400 shrink-0" />
          <div>
            <p className="font-semibold text-gray-900">
              {isCancelled ? 'Order Cancelled' : 'Payment Window Expired'}
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {isCancelled
                ? 'This order was cancelled by the user and inventory was restocked to the catalog.'
                : 'Payment was not received within 15 minutes. Reserved items were returned to inventory.'}
            </p>
          </div>
        </div>
      )}

      {/* Cancellation Error Banner */}
      {cancelError && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-rose-950">Failed to Cancel Order</p>
            <p className="mt-0.5">{cancelError}</p>
          </div>
        </div>
      )}

      {/* Order Status Stepper */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-6">
          Order Progress Tracker
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 relative">
          {[
            {
              title: 'Order Placed',
              desc: 'Reservation locked',
              done: true
            },
            {
              title: 'Payment Confirmed',
              desc: isPaid ? 'Authorized & settled' : isPending ? 'Awaiting payment' : 'Failed / Cancelled',
              done: isPaid || order.status === 'PROCESSING' || order.status === 'SHIPPED' || order.status === 'DELIVERED',
              active: isPending
            },
            {
              title: 'Processing',
              desc: 'Warehouse dispatch',
              done: order.status === 'SHIPPED' || order.status === 'DELIVERED',
              active: order.status === 'PROCESSING'
            },
            {
              title: 'Delivered',
              desc: 'Customer handover',
              done: order.status === 'DELIVERED',
              active: order.status === 'SHIPPED'
            }
          ].map((step, idx) => (
            <div key={step.title} className="flex flex-col items-start gap-2">
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                    step.done
                      ? 'bg-emerald-600 text-white'
                      : step.active
                      ? 'bg-primary-600 text-white ring-4 ring-primary-100 animate-pulse'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {step.done ? <Check className="w-4 h-4" /> : idx + 1}
                </div>
                <span className="text-xs font-bold text-gray-900">{step.title}</span>
              </div>
              <p className="text-[11px] text-gray-500 pl-9">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 2-Column Split: Line Items & Summary Sidebars */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (8): Order Items Table */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-primary-600" />
                <h2 className="text-sm font-bold text-gray-950">Purchased Products</h2>
              </div>
              <span className="text-xs text-gray-400">
                {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
              </span>
            </div>

            <div className="divide-y divide-gray-100">
              {(order.items ?? []).map((item) => (
                <div key={item.id} className="p-4 sm:p-5 flex items-center justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <p className="font-bold text-gray-900 text-sm">{item.productName}</p>
                    <p className="text-gray-400">
                      SKU: <span className="font-mono text-gray-600">{item.productSku}</span>
                    </p>
                    <p className="text-gray-500">
                      Qty: <span className="font-bold text-gray-800">{item.quantity}</span> × ${item.unitPrice}
                    </p>
                  </div>
                  <div className="text-right">
                    <PriceDisplay price={item.lineTotal} size="md" className="font-bold text-gray-950" />
                    <span className="text-[10px] text-gray-400 block mt-0.5">Frozen Snapshot Price</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Attempts Ledger (from GET /api/v1/payments/orders/:orderId) */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-gray-950">Payment Verification Ledger</h3>
              </div>
              <span className="text-xs text-gray-400">
                {payments.length} {payments.length === 1 ? 'attempt' : 'attempts'}
              </span>
            </div>

            {isLoadingPayments ? (
              <div className="h-16 bg-gray-50 rounded-xl animate-pulse" />
            ) : payments.length === 0 ? (
              <p className="text-xs text-gray-500 py-2">
                No payment transactions recorded yet. Complete payment above to authorize charge.
              </p>
            ) : (
              <div className="space-y-3">
                {payments.map((p) => (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-xl bg-gray-50/80 border border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{p.provider}</span>
                        <Badge
                          variant={p.status === 'SUCCEEDED' ? 'success' : 'out-of-stock'}
                          size="sm"
                        >
                          {p.status}
                        </Badge>
                      </div>
                      <p className="font-mono text-[11px] text-gray-500">Intent: {p.paymentIntentId}</p>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-gray-950 tabular-nums">${p.amount} {p.currency}</p>
                      <p className="text-[10px] text-gray-400">
                        {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4): Shipping & Totals Sidebars */}
        <div className="lg:col-span-4 space-y-6">
          {/* Shipping Destination */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs space-y-3 text-xs">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-2.5">
              <Truck className="w-4 h-4 text-primary-600" />
              <h3 className="font-bold text-gray-950">Shipping Destination</h3>
            </div>
            <div className="space-y-1 text-gray-600 leading-relaxed">
              <p className="font-semibold text-gray-900">{order.shippingAddress.fullName}</p>
              <p>{order.shippingAddress.addressLine1}</p>
              {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
              </p>
              <p>{order.shippingAddress.country}</p>
              {order.shippingAddress.phone && <p className="text-gray-500 pt-1">📞 {order.shippingAddress.phone}</p>}
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs space-y-3 text-xs">
            <h3 className="font-bold text-gray-950 border-b border-gray-100 pb-2.5">
              Financial Breakdown
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>${order.subtotal}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span className="text-emerald-600 font-semibold">FREE</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Estimated Sales Tax</span>
                <span>${order.taxAmount}</span>
              </div>
              <div className="pt-2 border-t border-gray-100 flex items-baseline justify-between font-bold text-sm text-gray-950">
                <span>Total Amount</span>
                <PriceDisplay price={order.totalAmount} size="lg" />
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center gap-1.5 text-[11px] text-gray-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Immutable price audit snapshot</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Order Modal (Only available when PENDING_PAYMENT) */}
      {isPending && (
        <Dialog
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          title="Cancel This Order?"
          description="Cancelling will release reserved stock back into available inventory."
          footer={
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCancelModalOpen(false)}
                disabled={cancelMutation.isPending}
              >
                Keep Order
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleCancelOrder}
                isLoading={cancelMutation.isPending}
              >
                Confirm Cancellation
              </Button>
            </div>
          }
        >
          <p className="text-xs text-gray-600">
            Are you sure you want to cancel order <strong>{order.orderNumber}</strong>? This action cannot be
            undone.
          </p>
        </Dialog>
      )}
    </div>
  );
};
