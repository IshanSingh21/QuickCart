import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  KeyRound,
  LogOut,
  Mail,
  RefreshCw,
  ShieldCheck,
  User as UserIcon
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { ErrorState } from '../components/ui/ErrorState';
import { LoadingSpinner } from '../components/ui/Spinner';
import { useCurrentUserQuery, useLogoutMutation } from '../features/auth/hooks/useAuth';
import { authService } from '../services/auth.service';
import { useAuthStore } from '../store/auth-store';
import { formatErrorMessage } from '../utils/error-handler';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const storeUser = useAuthStore((state) => state.user);
  const { data: liveUser, isLoading, isError, error, refetch, isFetching } = useCurrentUserQuery();
  const logoutMutation = useLogoutMutation();

  const [rbacStatus, setRbacStatus] = useState<{
    checked: boolean;
    authorized: boolean;
    message: string;
  } | null>(null);
  const [isCheckingRbac, setIsCheckingRbac] = useState(false);

  const user = liveUser ?? storeUser;

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
        message: 'Verified: Your session holds ADMIN privileges.'
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

  if (isLoading && !user) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-gray-500">Loading your profile...</p>
      </div>
    );
  }

  if (isError && !user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16">
        <ErrorState
          title="Unable to load profile"
          message={formatErrorMessage(error)}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
            Account &amp; Session Security
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your authenticated QuickCart profile and inspect active token posture.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            isLoading={isFetching}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Sync Profile
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader className="border-b border-gray-100 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary-100 text-primary-700 font-bold text-lg flex items-center justify-center border border-primary-200">
                  {user.firstName.charAt(0)}
                  {user.lastName.charAt(0)}
                </div>
                <div>
                  <CardTitle className="text-lg">
                    {user.firstName} {user.lastName}
                  </CardTitle>
                  <CardDescription>{user.email}</CardDescription>
                </div>
              </div>
              <Badge variant={user.role === 'ADMIN' ? 'primary' : 'success'} size="sm">
                {user.role}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-5 space-y-4 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>User ID</span>
                </div>
                <p className="font-mono text-xs text-gray-900 break-all">{user.id}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                  <Mail className="w-3.5 h-3.5" />
                  <span>Account Status</span>
                </div>
                <p className="text-xs font-semibold text-emerald-700">
                  {user.isActive ? 'Active & Verified' : 'Inactive'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 space-y-1 sm:col-span-2">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Member Since</span>
                </div>
                <p className="text-xs font-medium text-gray-900">
                  {new Date(user.createdAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-primary-600" />
              <CardTitle className="text-base">Session Security</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Dual-token lifecycle status
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5 space-y-4 text-xs">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Access Token</span>
                <Badge variant="success" size="sm">In-Memory</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Token Rotation</span>
                <Badge variant="info" size="sm">RTR Enabled</Badge>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 space-y-2.5">
              <p className="text-gray-600 leading-relaxed">
                Verify server-side Role-Based Access Control via <code className="font-mono bg-gray-100 px-1 rounded">/auth/admin-check</code>.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleVerifyAdminRole}
                isLoading={isCheckingRbac}
                leftIcon={<ShieldCheck className="w-3.5 h-3.5" />}
              >
                Check Admin Access
              </Button>

              {rbacStatus && (
                <div
                  role="status"
                  className={`p-2.5 rounded-lg border text-[11px] font-medium ${
                    rbacStatus.authorized
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}
                >
                  {rbacStatus.message}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
