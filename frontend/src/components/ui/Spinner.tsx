import React from 'react';
import { cn } from '../../utils/cn';
import { Loader2 } from 'lucide-react';

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
}

export const Spinner: React.FC<SpinnerProps> = ({ className, size = 'md', ...props }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div role="status" className={cn('flex items-center justify-center text-primary-600', className)} {...props}>
      <Loader2 className={cn('animate-spin', sizes[size])} />
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export const LoadingSpinner = Spinner;

