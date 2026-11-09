import React from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, Mail, Lock, User } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';

export const RegisterPage: React.FC = () => {
  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <Card className="shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-primary-600 text-white flex items-center justify-center mx-auto mb-1">
            <UserPlus className="w-5 h-5" />
          </div>
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <CardDescription>
            Join QuickCart for fast, secure checkouts with live inventory reservation.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="First Name"
                placeholder="Jane"
                leftIcon={<User className="w-4 h-4" />}
              />
              <Input
                label="Last Name"
                placeholder="Doe"
              />
            </div>
            <Input
              label="Email Address"
              type="email"
              placeholder="jane@example.com"
              leftIcon={<Mail className="w-4 h-4" />}
            />
            <Input
              label="Password"
              type="password"
              placeholder="Min 8 chars, 1 uppercase, 1 symbol"
              leftIcon={<Lock className="w-4 h-4" />}
            />

            <Button type="submit" className="w-full">
              Sign Up
            </Button>
          </form>

          <div className="text-center text-xs text-gray-500 pt-2">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 hover:underline font-medium">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
