import React from 'react';
import { cn } from '../../utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'default'
    | 'primary'
    | 'success'
    | 'warning'
    | 'error'
    | 'info'
    | 'outline'
    | 'sale'
    | 'new'
    | 'in-stock'
    | 'out-of-stock';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  size = 'md',
  dot = false,
  children,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center font-medium rounded-full select-none transition-colors';

  const variants = {
    default: 'bg-gray-100 text-gray-800 border border-gray-200/60',
    primary: 'bg-primary-50 text-primary-700 border border-primary-200/60',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200/60',
    error: 'bg-rose-50 text-rose-700 border border-rose-200/60',
    info: 'bg-sky-50 text-sky-700 border border-sky-200/60',
    outline: 'border border-gray-300 text-gray-700 bg-white shadow-2xs',
    sale: 'bg-rose-600 text-white font-semibold shadow-2xs',
    new: 'bg-primary-600 text-white font-semibold shadow-2xs',
    'in-stock': 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
    'out-of-stock': 'bg-gray-100 text-gray-500 border border-gray-200'
  };

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-0.5 gap-1.5',
    lg: 'text-xs px-3 py-1 gap-1.5 font-semibold'
  };

  const dotColors = {
    default: 'bg-gray-400',
    primary: 'bg-primary-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    error: 'bg-rose-500',
    info: 'bg-sky-500',
    outline: 'bg-gray-400',
    sale: 'bg-white',
    new: 'bg-white',
    'in-stock': 'bg-emerald-500 animate-pulse',
    'out-of-stock': 'bg-gray-400'
  };

  return (
    <span className={cn(baseStyles, variants[variant], sizes[size], className)} {...props}>
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant])} />}
      {children}
    </span>
  );
};
