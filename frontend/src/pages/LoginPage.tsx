import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, Mail, ShieldCheck } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';

export const LoginPage: React.FC = () => {
  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <Card className="shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-primary-600 text-white flex items-center justify-center mx-auto mb-1">
            <Lock className="w-5 h-5" />
          </div>
          <CardTitle className="text-2xl font-bold">Sign In to QuickCart</CardTitle>
          <CardDescription>
            Enter your credentials to access your cart, order history, and checkout.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <Input
              label="Email Address"
              type="email"
              placeholder="customer@quickcart.com"
              leftIcon={<Mail className="w-4 h-4" />}
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••••••"
              leftIcon={<Lock className="w-4 h-4" />}
            />

            <Button type="submit" className="w-full">
              Sign In
            </Button>
          </form>

          {/* Seed credentials quick reference */}
          <div className="pt-4 border-t border-gray-100 text-xs text-gray-500 space-y-1">
            <div className="flex items-center gap-1 font-medium text-gray-700">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Available Demo Credentials:</span>
            </div>
            <p>
              Customer: <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">customer@quickcart.com</code> / <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">CustomerPass123!</code>
            </p>
          </div>

          <div className="text-center text-xs text-gray-500 pt-2">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-primary-600 hover:underline font-medium">
              Create an account
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
