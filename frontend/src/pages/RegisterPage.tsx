import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowRight, Check, Lock, Mail, User, UserPlus } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { PasswordInput } from '../features/auth/components/PasswordInput';
import { resolvePostAuthRedirect } from '../features/auth/utils/redirect';
import { useRegisterMutation } from '../features/auth/hooks/useAuth';
import {
  getPasswordRequirements,
  RegisterFormValues,
  registerSchema
} from '../features/auth/schemas/auth.schemas';
import { formatErrorMessage, getFieldValidationErrors } from '../utils/error-handler';
import { cn } from '../utils/cn';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const registerMutation = useRegisterMutation();

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors }
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: ''
    }
  });

  const passwordValue = watch('password', '');
  const passwordChecks = getPasswordRequirements(passwordValue);

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      await registerMutation.mutateAsync({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password
      });
      const destination = resolvePostAuthRedirect(location.state);
      navigate(destination, { replace: true });
    } catch (error) {
      const fieldErrors = getFieldValidationErrors(error);
      Object.entries(fieldErrors).forEach(([field, message]) => {
        if (
          field === 'firstName' ||
          field === 'lastName' ||
          field === 'email' ||
          field === 'password'
        ) {
          setError(field, { type: 'server', message });
        }
      });
    }
  };

  const serverErrorMessage = registerMutation.isError
    ? formatErrorMessage(registerMutation.error)
    : null;

  return (
    <div className="max-w-md mx-auto px-4 py-12 sm:py-16">
      <Card className="shadow-lg border-gray-200/80">
        <CardHeader className="text-center space-y-2 pb-4">
          <div className="w-11 h-11 rounded-2xl bg-primary-600 text-white flex items-center justify-center mx-auto mb-1 shadow-sm">
            <UserPlus className="w-5 h-5" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-gray-900">
            Create your account
          </CardTitle>
          <CardDescription className="text-sm text-gray-500">
            Join QuickCart for instant checkout and real-time order tracking.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="First Name"
                type="text"
                autoComplete="given-name"
                placeholder="Jane"
                leftIcon={<User className="w-4 h-4" />}
                disabled={registerMutation.isPending}
                error={errors.firstName?.message}
                {...register('firstName')}
              />

              <Input
                label="Last Name"
                type="text"
                autoComplete="family-name"
                placeholder="Doe"
                disabled={registerMutation.isPending}
                error={errors.lastName?.message}
                {...register('lastName')}
              />
            </div>

            <Input
              label="Email Address"
              type="email"
              autoComplete="email"
              placeholder="jane@example.com"
              leftIcon={<Mail className="w-4 h-4" />}
              disabled={registerMutation.isPending}
              error={errors.email?.message}
              {...register('email')}
            />

            <div className="space-y-2">
              <PasswordInput
                label="Password"
                autoComplete="new-password"
                placeholder="Create a strong password"
                leftIcon={<Lock className="w-4 h-4" />}
                disabled={registerMutation.isPending}
                error={errors.password?.message}
                {...register('password')}
              />

              {/* Live password requirement checklist */}
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1" aria-label="Password requirements">
                {passwordChecks.map((check) => (
                  <li
                    key={check.id}
                    className={cn(
                      'flex items-center gap-1.5 text-[11px] transition-colors',
                      check.met ? 'text-emerald-700 font-medium' : 'text-gray-400'
                    )}
                  >
                    <Check
                      className={cn(
                        'w-3 h-3 shrink-0',
                        check.met ? 'text-emerald-600' : 'text-gray-300'
                      )}
                    />
                    <span>{check.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            <PasswordInput
              label="Confirm Password"
              autoComplete="new-password"
              placeholder="Re-enter your password"
              leftIcon={<Lock className="w-4 h-4" />}
              disabled={registerMutation.isPending}
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={registerMutation.isPending}
              rightIcon={!registerMutation.isPending ? <ArrowRight className="w-4 h-4" /> : undefined}
            >
              {registerMutation.isPending ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          <div className="border-t border-gray-100 pt-4 text-center text-xs text-gray-600">
            Already have an account?{' '}
            <Link
              to="/login"
              state={location.state}
              className="font-semibold text-primary-600 hover:text-primary-700 hover:underline"
            >
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
