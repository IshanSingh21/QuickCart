import React, { useState, useEffect } from 'react';
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Clock,
  CreditCard,
  Lock,
  ArrowRight,
  XCircle,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  Wallet,
  Building2,
  QrCode
} from 'lucide-react';
import {
  useOrderQuery,
  useProcessPaymentMutation,
  useCancelOrderMutation
} from '../features/checkout/hooks/useCheckout';
import { PaymentMethod, SimulateOutcome, Order } from '../types';
import { generateIdempotencyKey } from '../utils/idempotency';
import { formatErrorMessage } from '../utils/error-handler';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { PriceDisplay } from '../components/ui/PriceDisplay';
import { Dialog } from '../components/ui/Modal';
import { ErrorState } from '../components/ui/ErrorState';

export const PaymentStatusPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const stateData = location.state as { order?: Order; initialError?: string } | undefined;

  const { data: fetchedOrder, isLoading, isError, refetch } = useOrderQuery(orderId);
  const payMutation = useProcessPaymentMutation();
  const cancelMutation = useCancelOrderMutation();

  const order = fetchedOrder || stateData?.order;

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('SIMULATED_CARD');
  const [simulateOutcome, setSimulateOutcome] = useState<SimulateOutcome>('SUCCESS');
  const [errorMessage, setErrorMessage] = useState<string | null>(stateData?.initialError || null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  // 15-Minute Expiry Countdown Timer
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

  const handleRetryPayment = async () => {
    if (!order) return;
    setErrorMessage(null);

    const idempotencyKey = generateIdempotencyKey('retry_pay');
    try {
      const result = await payMutation.mutateAsync({
        orderId: order.id,
        payload: {
          paymentMethod,
          simulateOutcome,
          idempotencyKey,
          releaseInventoryOnFailure: false
        }
      });

      // Succeeded: navigate to Order Confirmation
      navigate(`/checkout/confirmation/${order.id}`, {
        state: {
          order: { ...order, status: 'PAID' },
          payment: result.payment
        }
      });
    } catch (err) {
      setErrorMessage(formatErrorMessage(err));
      void refetch();
    }
  };

  const handleCancelOrder = async () => {
    if (!order) return;
    try {
      await cancelMutation.mutateAsync(order.id);
      setIsCancelModalOpen(false);
      void refetch();
    } catch (err) {
      setErrorMessage(formatErrorMessage(err));
    }
  };

  if (isLoading && !order) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 animate-pulse space-y-6">
        <div className="h-8 w-64 bg-gray-200 rounded mx-auto" />
        <div className="h-48 bg-gray-100 rounded-2xl" />
      </div>
    );
  }

  if (isError && !order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <ErrorState
          title="Could not find order status"
          message="We were unable to load the payment status for this order."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Order Not Found</h2>
        <Link to="/orders">
          <Button size="md">View My Orders</Button>
        </Link>
      </div>
    );
  }

  // Format countdown minutes and seconds
  const minutesLeft = remainingSeconds !== null ? Math.floor(remainingSeconds / 60) : 15;
  const secondsLeft = remainingSeconds !== null ? remainingSeconds % 60 : 0;
  const isTimeExpired = remainingSeconds !== null && remainingSeconds <= 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-8">
      {/* Header Banner */}
      <div className="text-center space-y-3">
        {order.status === 'PAID' ? (
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
        ) : order.status === 'CANCELLED' || order.status === 'EXPIRED' ? (
          <div className="w-16 h-16 rounded-2xl bg-gray-100 text-gray-500 flex items-center justify-center mx-auto">
            <XCircle className="w-8 h-8" />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
            <AlertTriangle className="w-8 h-8" />
          </div>
        )}

        <Badge
          variant={
            order.status === 'PAID'
              ? 'success'
              : order.status === 'CANCELLED' || order.status === 'EXPIRED'
              ? 'out-of-stock'
              : 'warning'
          }
          size="lg"
          dot
        >
          {order.status}
        </Badge>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
          {order.status === 'PAID'
            ? 'Order Paid Successfully'
            : order.status === 'CANCELLED'
            ? 'Order Cancelled'
            : order.status === 'EXPIRED'
            ? 'Payment Window Expired'
            : 'Payment Action Required'}
        </h1>

        <p className="text-xs sm:text-sm text-gray-500 max-w-lg mx-auto">
          {order.status === 'PAID'
            ? 'Your payment was settled and confirmed by the backend.'
            : order.status === 'CANCELLED'
            ? 'This order was cancelled and inventory has been restocked to the catalog.'
            : order.status === 'EXPIRED'
            ? 'The 15-minute reservation window elapsed. Inventory was automatically released.'
            : 'Your order has been created and inventory is reserved. Please resolve payment before the reservation expires.'}
        </p>
      </div>

      {/* Decline Error Alert Banner */}
      {errorMessage && order.status === 'PENDING_PAYMENT' && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-rose-950">Payment Authorization Declined</p>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-rose-700 font-bold"
            aria-label="Dismiss alert"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Order Card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100 text-xs">
          <div>
            <span className="text-gray-400 block mb-0.5">Order Number</span>
            <span className="font-mono font-bold text-sm text-gray-950">{order.orderNumber}</span>
          </div>

          <div>
            <span className="text-gray-400 block mb-0.5">Order Total</span>
            <PriceDisplay price={order.totalAmount} size="sm" className="font-bold text-gray-950" />
          </div>

          {/* Countdown Clock for PENDING_PAYMENT */}
          {order.status === 'PENDING_PAYMENT' && (
            <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 font-medium">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                {isTimeExpired ? (
                  <span className="text-rose-600 font-bold">Window Expired</span>
                ) : (
                  <span>
                    Expires in:{' '}
                    <strong className="font-mono font-bold">
                      {String(minutesLeft).padStart(2, '0')}:{String(secondsLeft).padStart(2, '0')}
                    </strong>
                  </span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Retry Payment Controls (Only when PENDING_PAYMENT and not expired) */}
        {order.status === 'PENDING_PAYMENT' && !isTimeExpired && (
          <div className="space-y-6 pt-2">
            <div>
              <h2 className="text-sm font-bold text-gray-950 mb-3">Select Payment Method to Complete Order</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { id: 'SIMULATED_CARD' as const, name: 'Credit / Debit Card', icon: CreditCard },
                  { id: 'SIMULATED_WALLET' as const, name: 'Digital Wallet', icon: Wallet },
                  { id: 'SIMULATED_BANK_TRANSFER' as const, name: 'Bank Transfer', icon: Building2 },
                  { id: 'SIMULATED_UPI' as const, name: 'Instant UPI', icon: QrCode }
                ].map((m) => {
                  const Icon = m.icon;
                  const isSelected = paymentMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-colors ${
                        isSelected
                          ? 'border-primary-600 bg-primary-50/50 text-primary-950 ring-1 ring-primary-500'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <Icon className="w-4 h-4 text-primary-600" />
                      <span className="text-xs font-semibold">{m.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Test Outcome Switcher */}
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">
                Simulated Test Outcome (Choose SUCCESS to settle order)
              </label>
              <select
                value={simulateOutcome}
                onChange={(e) => setSimulateOutcome(e.target.value as SimulateOutcome)}
                className="w-full text-xs bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-800 font-medium"
              >
                <option value="SUCCESS">SUCCESS (Authorize &amp; Mark Order PAID)</option>
                <option value="CARD_DECLINED">CARD_DECLINED (Simulate Card Decline 402)</option>
                <option value="INSUFFICIENT_FUNDS">INSUFFICIENT_FUNDS (Simulate Insufficient Balance 402)</option>
                <option value="GATEWAY_TIMEOUT">GATEWAY_TIMEOUT (Simulate Network Timeout 500)</option>
              </select>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Button
                type="button"
                size="lg"
                className="flex-1"
                isLoading={payMutation.isPending}
                onClick={handleRetryPayment}
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                {payMutation.isPending ? 'Processing...' : `Pay $${order.totalAmount} Now`}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setIsCancelModalOpen(true)}
                disabled={payMutation.isPending || cancelMutation.isPending}
              >
                Cancel Order
              </Button>
            </div>
          </div>
        )}

        {/* If Order is Paid */}
        {order.status === 'PAID' && (
          <div className="pt-2 flex justify-center">
            <Link to={`/checkout/confirmation/${order.id}`} state={{ order }}>
              <Button size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                View Order Confirmation Receipt
              </Button>
            </Link>
          </div>
        )}

        {/* If Cancelled or Expired */}
        {(order.status === 'CANCELLED' || order.status === 'EXPIRED') && (
          <div className="pt-2 text-center space-y-4">
            <p className="text-xs text-gray-500">
              Reserved stock has been returned to inventory. You may re-order the items anytime.
            </p>
            <Link to="/products">
              <Button size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Browse Products Catalog
              </Button>
            </Link>
          </div>
        )}

        {/* Security & Transaction Notice */}
        <div className="border-t border-gray-100 pt-4 flex items-center justify-between text-[11px] text-gray-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Server-side verification active</span>
          </span>
          <span>Order ID: {order.id.substring(0, 8)}...</span>
        </div>
      </div>

      {/* Cancel Order Confirmation Modal */}
      <Dialog
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Cancel This Order?"
        description="Cancelling this order will release the reserved inventory back to the catalog."
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
          Order <strong>{order.orderNumber}</strong> with total of <strong>${order.totalAmount}</strong> will be
          cancelled immediately.
        </p>
      </Dialog>
    </div>
  );
};
