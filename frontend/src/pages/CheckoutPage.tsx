import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ShieldCheck,
  Lock,
  CreditCard,
  Wallet,
  Building2,
  QrCode,
  ArrowRight,
  AlertCircle,
  Truck,
  CheckCircle2,
  RotateCcw,
  ShoppingBag,
  Info,
  Clock
} from 'lucide-react';
import { useAuthStore } from '../store/auth-store';
import { useCartData } from '../features/cart/hooks/useCartActions';
import {
  useCheckoutMutation,
  useProcessPaymentMutation
} from '../features/checkout/hooks/useCheckout';
import {
  shippingAddressFormSchema,
  ShippingAddressFormData
} from '../features/checkout/validation/checkout.schema';
import {
  loadSavedShippingAddress,
  saveShippingAddress
} from '../features/checkout/utils/address-storage';
import { generateIdempotencyKey } from '../utils/idempotency';
import { formatErrorMessage } from '../utils/error-handler';
import { PaymentMethod, SimulateOutcome, ShippingAddress } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { PriceDisplay } from '../components/ui/PriceDisplay';
import { EmptyState } from '../components/ui/EmptyState';
import { ImageWithFallback } from '../components/ui/ImageWithFallback';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const { items, subtotal, itemCount } = useCartData();
  const checkoutMutation = useCheckoutMutation();
  const paymentMutation = useProcessPaymentMutation();

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('SIMULATED_CARD');
  const [simulateOutcome, setSimulateOutcome] = useState<SimulateOutcome>('SUCCESS');
  const [saveAddressForLater, setSaveAddressForLater] = useState(true);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Form setup
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<ShippingAddressFormData>({
    resolver: zodResolver(shippingAddressFormSchema),
    defaultValues: {
      fullName: user ? `${user.firstName} ${user.lastName}`.trim() : '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'United States',
      phone: ''
    }
  });

  // Pre-load saved address if present
  useEffect(() => {
    const saved = loadSavedShippingAddress();
    if (saved) {
      setValue('fullName', saved.fullName);
      setValue('addressLine1', saved.addressLine1);
      setValue('addressLine2', saved.addressLine2 || '');
      setValue('city', saved.city);
      setValue('state', saved.state);
      setValue('postalCode', saved.postalCode);
      setValue('country', saved.country);
      setValue('phone', saved.phone || '');
    }
  }, [setValue]);

  const isSubmitting = checkoutMutation.isPending || paymentMutation.isPending;

  const onCheckoutSubmit = async (formData: ShippingAddressFormData) => {
    setCheckoutError(null);

    const shippingAddress: ShippingAddress = {
      fullName: formData.fullName.trim(),
      addressLine1: formData.addressLine1.trim(),
      addressLine2: formData.addressLine2?.trim() || null,
      city: formData.city.trim(),
      state: formData.state.trim(),
      postalCode: formData.postalCode.trim(),
      country: formData.country.trim(),
      phone: formData.phone?.trim() || null
    };

    if (saveAddressForLater) {
      saveShippingAddress(shippingAddress);
    }

    try {
      // Step 1: Create Order via POST /api/v1/orders/checkout with Idempotency Key
      const orderIdempotencyKey = generateIdempotencyKey('order');
      const order = await checkoutMutation.mutateAsync({
        shippingAddress,
        idempotencyKey: orderIdempotencyKey
      });

      // Step 2: Attempt Payment via POST /api/v1/payments/orders/:orderId/pay
      const paymentIdempotencyKey = generateIdempotencyKey('pay');
      try {
        const paymentResult = await paymentMutation.mutateAsync({
          orderId: order.id,
          payload: {
            paymentMethod: selectedMethod,
            simulateOutcome,
            idempotencyKey: paymentIdempotencyKey,
            releaseInventoryOnFailure: false
          }
        });

        // Step 3a: Success -> Navigate to Order Confirmation
        navigate(`/checkout/confirmation/${order.id}`, {
          state: {
            order,
            payment: paymentResult.payment
          }
        });
      } catch (payErr) {
        // Step 3b: Payment Failed or Declined -> Navigate to Payment Status / Retry Screen
        // Order remains in PENDING_PAYMENT for retry
        navigate(`/checkout/status/${order.id}`, {
          state: {
            order,
            initialError: formatErrorMessage(payErr)
          }
        });
      }
    } catch (checkoutErr) {
      // Checkout creation itself failed (e.g. stock conflict or empty cart)
      setCheckoutError(formatErrorMessage(checkoutErr));
    }
  };

  // If cart is empty and not submitting
  if (items.length === 0 && !isSubmitting) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <EmptyState
          icon={<ShoppingBag className="w-8 h-8 text-primary-600" />}
          title="Your Shopping Cart is Empty"
          description="Add items to your cart before proceeding to checkout."
          action={
            <Link to="/products">
              <Button size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Explore Products
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const subtotalNum = parseFloat(subtotal) || 0;
  const totalAmount = subtotalNum.toFixed(2);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex items-center gap-2 text-xs text-gray-500">
          <li>
            <Link to="/" className="hover:text-primary-600">
              Home
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link to="/cart" className="hover:text-primary-600">
              Cart
            </Link>
          </li>
          <li>/</li>
          <li className="font-semibold text-gray-900">Checkout</li>
        </ol>
      </nav>

      {/* Page Title */}
      <div className="pb-6 border-b border-gray-100 flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
            Secure Checkout
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Complete your order with live inventory reservation and simulated payment processing.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200/80">
          <ShieldCheck className="w-4 h-4" />
          <span className="font-semibold">256-Bit Encrypted Transaction</span>
        </div>
      </div>

      {/* Global Error Banner */}
      {checkoutError && (
        <div
          role="alert"
          className="mt-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-rose-950">Checkout Could Not Be Completed</p>
            <p className="mt-0.5">{checkoutError}</p>
          </div>
          <button
            type="button"
            onClick={() => setCheckoutError(null)}
            className="text-rose-400 hover:text-rose-700 font-bold"
            aria-label="Dismiss alert"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2-Column Responsive Checkout Grid */}
      <form onSubmit={handleSubmit(onCheckoutSubmit)} className="mt-8 lg:grid lg:grid-cols-12 lg:gap-10 items-start">
        {/* Left Column: Shipping Address & Payment Selection */}
        <div className="lg:col-span-7 space-y-8">
          {/* Section 1: Shipping Address */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <h2 className="text-base sm:text-lg font-bold text-gray-950">Shipping Address</h2>
              </div>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Truck className="w-3.5 h-3.5" />
                Standard Delivery
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input
                  label="Full Name *"
                  placeholder="e.g. Jane Doe"
                  error={errors.fullName?.message}
                  {...register('fullName')}
                />
              </div>

              <div className="sm:col-span-2">
                <Input
                  label="Street Address *"
                  placeholder="123 Tech Boulevard"
                  error={errors.addressLine1?.message}
                  {...register('addressLine1')}
                />
              </div>

              <div className="sm:col-span-2">
                <Input
                  label="Apartment, Suite, Unit (Optional)"
                  placeholder="Apt 4B"
                  error={errors.addressLine2?.message}
                  {...register('addressLine2')}
                />
              </div>

              <div>
                <Input
                  label="City *"
                  placeholder="San Francisco"
                  error={errors.city?.message}
                  {...register('city')}
                />
              </div>

              <div>
                <Input
                  label="State / Province *"
                  placeholder="CA"
                  error={errors.state?.message}
                  {...register('state')}
                />
              </div>

              <div>
                <Input
                  label="Postal / ZIP Code *"
                  placeholder="94107"
                  error={errors.postalCode?.message}
                  {...register('postalCode')}
                />
              </div>

              <div>
                <Input
                  label="Country *"
                  placeholder="United States"
                  error={errors.country?.message}
                  {...register('country')}
                />
              </div>

              <div className="sm:col-span-2">
                <Input
                  label="Phone Number (Optional)"
                  placeholder="+1 (555) 019-2834"
                  error={errors.phone?.message}
                  {...register('phone')}
                />
              </div>
            </div>

            <label className="flex items-center gap-2.5 text-xs text-gray-600 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={saveAddressForLater}
                onChange={(e) => setSaveAddressForLater(e.target.checked)}
                className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-gray-300"
              />
              <span>Save this shipping address for future QuickCart orders</span>
            </label>
          </div>

          {/* Section 2: Payment Method */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center font-bold text-xs">
                  2
                </div>
                <h2 className="text-base sm:text-lg font-bold text-gray-950">Payment Method</h2>
              </div>
              <Badge variant="info" size="sm">
                Simulated Gateway
              </Badge>
            </div>

            {/* Payment Method Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  id: 'SIMULATED_CARD' as const,
                  name: 'Credit / Debit Card',
                  desc: 'Visa, MasterCard, Amex',
                  icon: CreditCard
                },
                {
                  id: 'SIMULATED_WALLET' as const,
                  name: 'Digital Wallet',
                  desc: 'Apple Pay, Google Pay',
                  icon: Wallet
                },
                {
                  id: 'SIMULATED_BANK_TRANSFER' as const,
                  name: 'Bank Transfer',
                  desc: 'ACH / Direct Wire',
                  icon: Building2
                },
                {
                  id: 'SIMULATED_UPI' as const,
                  name: 'Instant UPI',
                  desc: 'Virtual Payment Address',
                  icon: QrCode
                }
              ].map((method) => {
                const IconComponent = method.icon;
                const isSelected = selectedMethod === method.id;

                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setSelectedMethod(method.id)}
                    className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                      isSelected
                        ? 'border-primary-600 bg-primary-50/40 ring-2 ring-primary-500/20'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg ${
                        isSelected ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900">{method.name}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">{method.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Interactive Simulated Card Input (PCI-DSS compliant dummy card) */}
            {selectedMethod === 'SIMULATED_CARD' && (
              <div className="p-4 rounded-xl bg-gray-50/90 border border-gray-200 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between text-xs text-gray-700 font-medium">
                  <span>Card Information</span>
                  <span className="text-[10px] text-gray-400">Sandbox Test Credentials</span>
                </div>
                <div className="space-y-2">
                  <input
                    type="text"
                    disabled
                    value="•••• •••• •••• 4242 (Simulated Sandbox Card)"
                    className="w-full text-xs font-mono bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-600"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      disabled
                      value="12 / 28"
                      className="text-xs font-mono bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-600 text-center"
                    />
                    <input
                      type="text"
                      disabled
                      value="CVC: 123"
                      className="text-xs font-mono bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-600 text-center"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-primary-600 shrink-0" />
                  <span>Real cards are never accepted. Transactions are authorized via QuickCart Simulated Gateway.</span>
                </p>
              </div>
            )}

            {/* Simulation Test Controls (Allows testing failure, declines, and timeouts) */}
            <div className="pt-2 border-t border-gray-100">
              <label className="text-xs font-bold text-gray-700 block mb-1.5">
                Simulated Gateway Test Outcome
              </label>
              <select
                value={simulateOutcome}
                onChange={(e) => setSimulateOutcome(e.target.value as SimulateOutcome)}
                className="w-full text-xs bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-gray-800 font-medium focus:ring-2 focus:ring-primary-500 focus:outline-hidden"
              >
                <option value="SUCCESS">SUCCESS — 200 OK (Payment Authorized &amp; Order Marked PAID)</option>
                <option value="CARD_DECLINED">CARD_DECLINED — 402 Payment Required (Simulated Decline)</option>
                <option value="INSUFFICIENT_FUNDS">INSUFFICIENT_FUNDS — 402 Payment Required (Balance Insufficient)</option>
                <option value="GATEWAY_TIMEOUT">GATEWAY_TIMEOUT — 500 Network Communication Timeout</option>
              </select>
              <p className="text-[11px] text-gray-400 mt-1">
                Select an outcome to test how the system safely handles declines, timeouts, or successful settlements.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary & Pay Button */}
        <div className="mt-8 lg:mt-0 lg:col-span-5 sticky top-24">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h2 className="text-base sm:text-lg font-bold text-gray-950">Order Summary</h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary-50 text-primary-700">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </span>
            </div>

            {/* Itemized preview */}
            <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto pr-1">
              {items.map((item) => (
                <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-100 shrink-0 overflow-hidden">
                    <ImageWithFallback src={item.image ?? undefined} alt={item.name} aspectRatio="square" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate">{item.name}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Qty: {item.quantity} × ${item.currentPrice}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-gray-950 tabular-nums">
                      ${parseFloat(item.lineTotal).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Calculations Breakdown */}
            <div className="border-t border-gray-100 pt-4 space-y-2.5 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <PriceDisplay price={subtotal} size="sm" className="font-semibold text-gray-900" />
              </div>

              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span className="font-semibold text-emerald-600">FREE</span>
              </div>

              <div className="flex justify-between text-gray-600">
                <span>Estimated Sales Tax</span>
                <span className="font-semibold text-gray-900">$0.00</span>
              </div>

              <div className="border-t border-gray-100 pt-3 flex items-baseline justify-between">
                <span className="text-sm font-bold text-gray-950">Total to Pay</span>
                <div className="text-right">
                  <PriceDisplay price={totalAmount} size="xl" />
                  <span className="text-[10px] text-gray-400 block mt-0.5">USD</span>
                </div>
              </div>
            </div>

            {/* Submit / Pay CTA Button */}
            <div className="space-y-3">
              <Button
                type="submit"
                size="lg"
                className="w-full py-4 text-sm font-bold shadow-md"
                isLoading={isSubmitting}
                disabled={items.length === 0}
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                {isSubmitting ? 'Processing Payment...' : `Pay $${totalAmount}`}
              </Button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Zero card storage • Atomic inventory reservation</span>
              </div>
            </div>

            {/* Trust and Guarantees */}
            <div className="border-t border-gray-100 pt-4 space-y-2 text-[11px] text-gray-500">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>15-Minute price and inventory guarantee</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Instant digital confirmation &amp; receipt</span>
              </div>
              <div className="flex items-center gap-2">
                <RotateCcw className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                <span>30-Day hassle-free return policy</span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
