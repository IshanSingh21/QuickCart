import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User as UserIcon,
  Package,
  CreditCard,
  Clock,
  CheckCircle2,
  ShieldCheck,
  MapPin,
  LogOut,
  KeyRound,
  Mail,
  Calendar,
  ArrowRight,
  RefreshCw,
  ChevronRight,
  Trash2
} from 'lucide-react';
import { useAuthStore } from '../store/auth-store';
import { useCurrentUserQuery, useLogoutMutation } from '../features/auth/hooks/useAuth';
import { useMyOrdersQuery } from '../features/checkout/hooks/useCheckout';
import { authService } from '../services/auth.service';
import {
  loadSavedShippingAddress,
  clearSavedShippingAddress,
  saveShippingAddress
} from '../features/checkout/utils/address-storage';
import { ShippingAddress } from '../types';
import { formatErrorMessage } from '../utils/error-handler';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { PriceDisplay } from '../components/ui/PriceDisplay';
import { LoadingSpinner } from '../components/ui/Spinner';
import { ErrorState } from '../components/ui/ErrorState';
import { Input } from '../components/ui/Input';
import { Dialog } from '../components/ui/Modal';

type ActiveDashboardTab = 'overview' | 'profile' | 'security';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const storeUser = useAuthStore((state) => state.user);
  const { data: liveUser, isLoading: isLoadingUser, isError: isUserError, error: userError, refetch: refetchUser, isFetching } = useCurrentUserQuery();
  const logoutMutation = useLogoutMutation();

  const { data: ordersData, isLoading: isLoadingOrders } = useMyOrdersQuery({ page: 1, limit: 10 });
  const orders = useMemo(() => ordersData?.orders ?? [], [ordersData?.orders]);

  const [activeTab, setActiveTab] = useState<ActiveDashboardTab>('overview');
  const [savedAddress, setSavedAddress] = useState<ShippingAddress | null>(() => loadSavedShippingAddress());
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [addressForm, setAddressForm] = useState<ShippingAddress>({
    fullName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'United States',
    phone: ''
  });

  const [rbacStatus, setRbacStatus] = useState<{
    checked: boolean;
    authorized: boolean;
    message: string;
  } | null>(null);
  const [isCheckingRbac, setIsCheckingRbac] = useState(false);

  const user = liveUser ?? storeUser;

  // Calculate Order Statistics
  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const paidOrders = orders.filter((o) => o.status === 'PAID');
    const pendingOrders = orders.filter((o) => o.status === 'PENDING_PAYMENT');
    const totalSpent = paidOrders
      .reduce((acc, o) => acc + parseFloat(o.totalAmount || '0'), 0)
      .toFixed(2);

    return {
      totalOrders,
      paidCount: paidOrders.length,
      pendingCount: pendingOrders.length,
      totalSpent
    };
  }, [orders]);

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    navigate('/login', { replace: true });
  };

  const handleVerifyAdminRole = async () => {
    setIsCheckingRbac(true);
    try {
      const result = await authService.checkAdminAccess();
      setRbacStatus({
        checked: true,
        authorized: result.authorized,
        message: 'Verified: Your session holds active ADMIN privileges.'
      });
    } catch (err) {
      setRbacStatus({
        checked: true,
        authorized: false,
        message: formatErrorMessage(err)
      });
    } finally {
      setIsCheckingRbac(false);
    }
  };

  const handleSaveAddress = () => {
    if (!addressForm.fullName || !addressForm.addressLine1) return;
    saveShippingAddress(addressForm);
    setSavedAddress(addressForm);
    setIsAddressModalOpen(false);
  };

  const handleClearAddress = () => {
    clearSavedShippingAddress();
    setSavedAddress(null);
  };

  if (isLoadingUser && !user) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-gray-500">Loading your account dashboard...</p>
      </div>
    );
  }

  if (isUserError && !user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16">
        <ErrorState
          title="Unable to load profile"
          message={formatErrorMessage(userError)}
          onRetry={() => void refetchUser()}
        />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Dashboard Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary-600 text-white font-extrabold text-xl flex items-center justify-center shadow-md">
            {user.firstName.charAt(0)}
            {user.lastName.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
                {user.firstName} {user.lastName}
              </h1>
              <Badge variant={user.role === 'ADMIN' ? 'primary' : 'success'} size="sm">
                {user.role}
              </Badge>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetchUser()}
            isLoading={isFetching}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Sync Account
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleLogout}
            isLoading={logoutMutation.isPending}
            leftIcon={<LogOut className="w-3.5 h-3.5" />}
          >
            Sign Out
          </Button>
        </div>
      </div>

      {/* Responsive Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-3 text-xs">
        {[
          { id: 'overview' as const, label: 'Account Overview', icon: UserIcon },
          { id: 'profile' as const, label: 'Profile & Address Book', icon: MapPin },
          { id: 'security' as const, label: 'Security & Posture', icon: KeyRound }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold transition-all ${
                isActive
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}

        <Link
          to="/orders"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 hover:text-gray-900 transition-all ml-auto"
        >
          <Package className="w-3.5 h-3.5 text-primary-600" />
          <span>Full Order History</span>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
        </Link>
      </div>

      {/* Tab 1: Account Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-xs space-y-1">
              <span className="text-xs font-semibold text-gray-400 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-primary-600" /> Total Orders
              </span>
              <p className="text-2xl font-extrabold text-gray-950">{stats.totalOrders}</p>
              <p className="text-[11px] text-gray-400">Placed to date</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-xs space-y-1">
              <span className="text-xs font-semibold text-gray-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Completed Orders
              </span>
              <p className="text-2xl font-extrabold text-gray-950">{stats.paidCount}</p>
              <p className="text-[11px] text-emerald-600 font-medium">Verified &amp; Paid</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-xs space-y-1">
              <span className="text-xs font-semibold text-gray-400 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600" /> Pending Payment
              </span>
              <p className="text-2xl font-extrabold text-gray-950">{stats.pendingCount}</p>
              <p className="text-[11px] text-amber-600 font-medium">Awaiting settlement</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-xs space-y-1">
              <span className="text-xs font-semibold text-gray-400 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-primary-600" /> Total Spend
              </span>
              <p className="text-2xl font-extrabold text-gray-950">${stats.totalSpent}</p>
              <p className="text-[11px] text-gray-400">USD settled volume</p>
            </div>
          </div>

          {/* Recent Orders Section */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-950">Recent Orders</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Latest activity associated with your account.
                </p>
              </div>
              <Link to="/orders">
                <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  View All Orders
                </Button>
              </Link>
            </div>

            {isLoadingOrders ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-20 bg-gray-50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div className="py-8 text-center space-y-3">
                <Package className="w-8 h-8 text-gray-300 mx-auto" />
                <p className="text-xs font-semibold text-gray-600">No orders placed yet</p>
                <Link to="/products">
                  <Button size="sm">Explore Catalog</Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {orders.slice(0, 3).map((order) => (
                  <div key={order.id} className="py-4 first:pt-0 last:pb-0 flex flex-wrap items-center justify-between gap-4 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono font-bold text-gray-900 text-sm">
                          {order.orderNumber}
                        </span>
                        <Badge
                          variant={
                            order.status === 'PAID'
                              ? 'success'
                              : order.status === 'PENDING_PAYMENT'
                              ? 'warning'
                              : 'out-of-stock'
                          }
                          size="sm"
                          dot
                        >
                          {order.status}
                        </Badge>
                      </div>
                      <p className="text-gray-500 line-clamp-1">
                        {order.items.map((i) => `${i.productName} (×${i.quantity})`).join(', ')}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {new Date(order.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <PriceDisplay price={order.totalAmount} size="sm" className="font-bold text-gray-950" />
                      <Link to={`/orders/${order.id}`}>
                        <Button variant="outline" size="sm" rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>
                          Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Profile Information & Address Book */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-200">
          {/* Read-Only Profile Identity */}
          <Card>
            <CardHeader className="border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-primary-600" />
                <CardTitle className="text-base">Profile Identity</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Verified database account credentials
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5 space-y-4 text-xs">
              <div className="space-y-1.5 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-gray-400 font-medium block">Full Name</span>
                <span className="font-bold text-gray-900 text-sm">{user.firstName} {user.lastName}</span>
              </div>

              <div className="space-y-1.5 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-gray-400 font-medium block flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" /> Email Address
                </span>
                <span className="font-medium text-gray-900">{user.email}</span>
              </div>

              <div className="space-y-1.5 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-gray-400 font-medium block">User ID (UUID)</span>
                <span className="font-mono text-gray-700 break-all">{user.id}</span>
              </div>

              <div className="space-y-1.5 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-gray-400 font-medium block flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Member Since
                </span>
                <span className="text-gray-700">
                  {new Date(user.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-primary-50/60 border border-primary-100 text-[11px] text-primary-900 leading-relaxed">
                Profile identity is verified by QuickCart auth service. To request an email change, please contact system support.
              </div>
            </CardContent>
          </Card>

          {/* Saved Delivery Address Book */}
          <Card>
            <CardHeader className="border-b border-gray-100 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary-600" />
                  <CardTitle className="text-base">Saved Delivery Address</CardTitle>
                </div>
                {savedAddress && (
                  <button
                    type="button"
                    onClick={handleClearAddress}
                    className="text-gray-400 hover:text-rose-600 p-1 rounded transition-colors"
                    title="Remove Saved Address"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <CardDescription className="text-xs">
                Stored locally for express checkout
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5 space-y-4 text-xs">
              {savedAddress ? (
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900 text-sm">{savedAddress.fullName}</span>
                    <Badge variant="in-stock" size="sm">Default</Badge>
                  </div>
                  <div className="text-gray-600 space-y-0.5 leading-relaxed">
                    <p>{savedAddress.addressLine1}</p>
                    {savedAddress.addressLine2 && <p>{savedAddress.addressLine2}</p>}
                    <p>{savedAddress.city}, {savedAddress.state} {savedAddress.postalCode}</p>
                    <p>{savedAddress.country}</p>
                    {savedAddress.phone && <p className="text-gray-500 pt-1">📞 {savedAddress.phone}</p>}
                  </div>

                  <div className="pt-3 border-t border-gray-200/60 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAddressForm(savedAddress);
                        setIsAddressModalOpen(true);
                      }}
                    >
                      Update Address
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-xl border border-dashed border-gray-200 text-center space-y-3">
                  <MapPin className="w-6 h-6 text-gray-300 mx-auto" />
                  <p className="text-gray-500 text-xs">No default address saved yet.</p>
                  <Button
                    size="sm"
                    onClick={() => {
                      setAddressForm({
                        fullName: `${user.firstName} ${user.lastName}`,
                        addressLine1: '',
                        addressLine2: '',
                        city: '',
                        state: '',
                        postalCode: '',
                        country: 'United States',
                        phone: ''
                      });
                      setIsAddressModalOpen(true);
                    }}
                  >
                    Add Shipping Address
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 3: Security & Session Posture */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-200">
          <Card>
            <CardHeader className="border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-primary-600" />
                <CardTitle className="text-base">Token &amp; Session Posture</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Dual-token rotation &amp; storage posture
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5 space-y-4 text-xs">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-gray-600">Access Token Isolation</span>
                  <Badge variant="success" size="sm">Memory Only (XSS-Safe)</Badge>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-gray-600">Refresh Token Policy</span>
                  <Badge variant="info" size="sm">RTR Single-Use Rotation</Badge>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-gray-600">Concurrency Mutex</span>
                  <Badge variant="primary" size="sm">Single Flight Queue</Badge>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 text-[11px] text-emerald-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Zero JWT tokens stored in localStorage. Session automatically refreshes transparently.</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary-600" />
                <CardTitle className="text-base">Role-Based Access Control</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Verify server-side permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5 space-y-4 text-xs">
              <p className="text-gray-600 leading-relaxed">
                Test the backend RBAC verification barrier at <code className="font-mono bg-gray-100 px-1 py-0.5 rounded">/api/v1/auth/admin-check</code>.
              </p>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleVerifyAdminRole}
                isLoading={isCheckingRbac}
                leftIcon={<ShieldCheck className="w-3.5 h-3.5" />}
              >
                Verify Admin Role Privileges
              </Button>

              {rbacStatus && (
                <div
                  role="status"
                  className={`p-3 rounded-xl border text-xs font-medium ${
                    rbacStatus.authorized
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}
                >
                  {rbacStatus.message}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Address Modal */}
      <Dialog
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        title="Delivery Address"
        description="Enter default shipping details for QuickCart express checkout."
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" size="sm" onClick={() => setIsAddressModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveAddress}>
              Save Address
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-xs">
          <Input
            label="Full Name *"
            value={addressForm.fullName}
            onChange={(e) => setAddressForm({ ...addressForm, fullName: e.target.value })}
            placeholder="Jane Doe"
          />
          <Input
            label="Street Address *"
            value={addressForm.addressLine1}
            onChange={(e) => setAddressForm({ ...addressForm, addressLine1: e.target.value })}
            placeholder="123 Tech Blvd"
          />
          <Input
            label="Apartment, Suite (Optional)"
            value={addressForm.addressLine2 || ''}
            onChange={(e) => setAddressForm({ ...addressForm, addressLine2: e.target.value })}
            placeholder="Suite 400"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="City *"
              value={addressForm.city}
              onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
              placeholder="San Francisco"
            />
            <Input
              label="State / Province *"
              value={addressForm.state}
              onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
              placeholder="CA"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Postal Code *"
              value={addressForm.postalCode}
              onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })}
              placeholder="94107"
            />
            <Input
              label="Country *"
              value={addressForm.country}
              onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value })}
              placeholder="United States"
            />
          </div>
          <Input
            label="Phone (Optional)"
            value={addressForm.phone || ''}
            onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
            placeholder="+1 (555) 019-2834"
          />
        </div>
      </Dialog>
    </div>
  );
};
