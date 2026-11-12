import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input, InputProps } from '../../../components/ui/Input';

export type PasswordInputProps = Omit<InputProps, 'type' | 'rightIcon'>;

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <Input
        ref={ref}
        type={showPassword ? 'text' : 'password'}
        rightIcon={
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        }
        {...props}
      />
    );
  }
);

PasswordInput.displayName = 'PasswordInput';
