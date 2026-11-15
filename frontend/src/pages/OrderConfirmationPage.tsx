import React, { useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import {
  CheckCircle2,
  Copy,
  Check,
  Package,
  Truck,
  CreditCard,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { useOrderQuery } from '../features/checkout/hooks/useCheckout';
import { Order, Payment } from '../types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { PriceDisplay } from '../components/ui/PriceDisplay';
import { ErrorState } from '../components/ui/ErrorState';

export const OrderConfirmationPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const location = useLocation();
  const stateData = location.state as { order?: Order; payment?: Payment } | undefined;

  const { data: fetchedOrder, isLoading, isError, refetch } = useOrderQuery(orderId);
  const [copied, setCopied] = useState(false);

  const order = fetchedOrder || stateData?.order;
  const payment = stateData?.payment;

  const handleCopyOrderNumber = () => {
    if (!order) return;
    void navigator.clipboard.writeText(order.orderNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading && !order) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 animate-pulse space-y-6">
        <div className="h-12 w-12 rounded-full bg-gray-200 mx-auto" />
        <div className="h-8 w-64 bg-gray-200 rounded mx-auto" />
        <div className="h-4 w-96 bg-gray-100 rounded mx-auto" />
        <div className="h-64 bg-gray-100 rounded-2xl" />
      </div>
    );
  }

  if (isError && !order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <ErrorState
          title="Could not load order details"
          message="We could not find the order information. Please check your order history."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Order Not Found</h2>
        <p className="text-xs text-gray-500">The requested order confirmation is unavailable.</p>
        <Link to="/orders">
          <Button size="md">View My Orders</Button>
        </Link>
      </div>
    );
  }

  const isPaid = order.status === 'PAID';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-8">
      {/* Success Hero Header */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
          <CheckCircle2 className="w-9 h-9" />
        </div>
        <Badge variant={isPaid ? 'success' : 'warning'} size="lg" dot>
          {isPaid ? 'Order Confirmed & Paid' : 'Order Placed — Payment Pending'}
        </Badge>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-950 tracking-tight">
          {isPaid ? 'Thank you for your order!' : 'Your order has been recorded'}
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 max-w-lg mx-auto">
          {isPaid
            ? 'We have verified your payment with the backend and reserved your items. A confirmation receipt has been sent to your registered email.'
            : 'Your order was created with status PENDING_PAYMENT. Please complete payment within the 15-minute window.'}
        </p>
      </div>

      {/* Order Details & Tracking Card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100 text-xs">
          <div>
            <span className="text-gray-400 block mb-0.5">Order Number</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-sm text-gray-950">{order.orderNumber}</span>
              <button
                type="button"
                onClick={handleCopyOrderNumber}
                className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                aria-label="Copy order number"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <span className="text-gray-400 block mb-0.5">Order Placed Date</span>
            <span className="font-medium text-gray-900">
              {new Date(order.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>

          <div>
            <span className="text-gray-400 block mb-0.5">Payment Status</span>
            <Badge variant={isPaid ? 'success' : 'warning'} size="sm" dot>
              {order.status}
            </Badge>
          </div>
        </div>

        {/* 2-Column Split: Shipping Destination & Payment Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Shipping Address */}
          <div className="space-y-2 p-4 rounded-xl bg-gray-50/80 border border-gray-100">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-950">
              <Truck className="w-4 h-4 text-primary-600" />
              <span>Shipping Destination</span>
            </div>
            <div className="text-xs text-gray-600 space-y-0.5 pt-1">
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

          {/* Payment Details */}
          <div className="space-y-2 p-4 rounded-xl bg-gray-50/80 border border-gray-100">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-950">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>Payment Verification</span>
            </div>
            <div className="text-xs text-gray-600 space-y-1.5 pt-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Gateway Provider:</span>
                <span className="font-medium text-gray-900">{payment?.provider || 'SIMULATED_GATEWAY'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Settlement Status:</span>
                <span className="font-semibold text-emerald-700">{payment?.status || (isPaid ? 'SUCCEEDED' : 'PENDING')}</span>
              </div>
              {payment?.paymentIntentId && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Transaction Ref:</span>
                  <span className="font-mono text-[11px] text-gray-700">{payment.paymentIntentId}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t border-gray-200/60">
                <span className="font-semibold text-gray-900">Total Settled:</span>
                <PriceDisplay price={order.totalAmount} size="sm" className="font-bold text-gray-950" />
              </div>
            </div>
          </div>
        </div>

        {/* Itemized Order Line Items */}
        <div className="space-y-3 pt-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Purchased Products ({order.itemCount} items)
          </h3>
          <div className="border border-gray-100 rounded-xl divide-y divide-gray-100 overflow-hidden">
            {order.items.map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between gap-4 text-xs">
                <div className="space-y-0.5">
                  <p className="font-bold text-gray-900">{item.productName}</p>
                  <p className="text-[11px] text-gray-400">SKU: {item.productSku} • Qty: {item.quantity}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-950 tabular-nums">${item.lineTotal}</p>
                  <p className="text-[11px] text-gray-400">(${item.unitPrice} each)</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Financial Summary */}
        <div className="bg-gray-50/90 rounded-xl p-4 space-y-2 text-xs">
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
          <div className="pt-2 border-t border-gray-200/80 flex justify-between font-bold text-sm text-gray-950">
            <span>Total Amount</span>
            <span>${order.totalAmount} USD</span>
          </div>
        </div>

        {/* Security / Verification guarantee note */}
        <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200/60 text-[11px] text-emerald-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Server-side price verification confirmed. Inventory audit trail recorded in backend PostgreSQL ledger.</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
        <Link to="/orders">
          <Button variant="outline" size="md" leftIcon={<Package className="w-4 h-4" />}>
            View All Orders
          </Button>
        </Link>
        <Link to="/products">
          <Button size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
            Continue Shopping
          </Button>
        </Link>
      </div>
    </div>
  );
};
