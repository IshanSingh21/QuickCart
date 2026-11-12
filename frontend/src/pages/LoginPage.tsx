import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowRight, Clock, Lock, Mail, ShieldCheck } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { PasswordInput } from '../features/auth/components/PasswordInput';
import { RedirectLocationState, resolvePostAuthRedirect } from '../features/auth/utils/redirect';
import { useLoginMutation } from '../features/auth/hooks/useAuth';
import { LoginFormValues, loginSchema } from '../features/auth/schemas/auth.schemas';
import { useAuthStore } from '../store/auth-store';
import { formatErrorMessage, getFieldValidationErrors } from '../utils/error-handler';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as RedirectLocationState | null;

  const storeSessionExpired = useAuthStore((state) => state.sessionExpired);
  const dismissSessionExpired = useAuthStore((state) => state.dismissSessionExpired);
  const showSessionExpiredNotice = Boolean(locationState?.sessionExpired || storeSessionExpired);

  const loginMutation = useLoginMutation();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors }
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  useEffect(() => {
    return () => {
      dismissSessionExpired();
    };
  }, [dismissSessionExpired]);

  const onSubmit = async (values: LoginFormValues) => {
    dismissSessionExpired();
    try {
      await loginMutation.mutateAsync(values);
      const destination = resolvePostAuthRedirect(location.state);
      navigate(destination, { replace: true });
    } catch (error) {
      const fieldErrors = getFieldValidationErrors(error);
      Object.entries(fieldErrors).forEach(([field, message]) => {
        if (field === 'email' || field === 'password') {
          setError(field, { type: 'server', message });
        }
      });
    }
  };

  const serverErrorMessage = loginMutation.isError
    ? formatErrorMessage(loginMutation.error)
    : null;

  return (
    <div className="max-w-md mx-auto px-4 py-12 sm:py-16">
      <Card className="shadow-lg border-gray-200/80">
        <CardHeader className="text-center space-y-2 pb-4">
          <div className="w-11 h-11 rounded-2xl bg-primary-600 text-white flex items-center justify-center mx-auto mb-1 shadow-sm">
            <Lock className="w-5 h-5" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-gray-900">
            Sign in to QuickCart
          </CardTitle>
          <CardDescription className="text-sm text-gray-500">
            Enter your email and password to access your account and orders.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {showSessionExpiredNotice && !serverErrorMessage && (
            <div
              role="status"
              className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs text-amber-900"
            >
              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold">Your session has expired</p>
                <p className="text-amber-800">
                  For your security, please sign in again to continue.
                </p>
              </div>
            </div>
          )}

          {serverErrorMessage && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs text-rose-800"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{serverErrorMessage}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <Input
              label="Email Address"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              leftIcon={<Mail className="w-4 h-4" />}
              disabled={loginMutation.isPending}
              error={errors.email?.message}
              {...register('email')}
            />

            <PasswordInput
              label="Password"
              autoComplete="current-password"
              placeholder="Enter your password"
              leftIcon={<Lock className="w-4 h-4" />}
              disabled={loginMutation.isPending}
              error={errors.password?.message}
              {...register('password')}
            />

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={loginMutation.isPending}
              rightIcon={!loginMutation.isPending ? <ArrowRight className="w-4 h-4" /> : undefined}
            >
              {loginMutation.isPending ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="flex items-center justify-center gap-1.5 pt-2 text-[11px] text-gray-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Protected by Refresh Token Rotation &amp; Replay Detection</span>
          </div>

          <div className="border-t border-gray-100 pt-4 text-center text-xs text-gray-600">
            Don&apos;t have an account?{' '}
            <Link
              to="/register"
              state={location.state}
              className="font-semibold text-primary-600 hover:text-primary-700 hover:underline"
            >
              Create an account
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
