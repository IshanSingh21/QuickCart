import React from 'react';
import { cn } from '../../utils/cn';

export interface ProductGridProps extends React.HTMLAttributes<HTMLDivElement> {
  columns?: 2 | 3 | 4;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  columns = 4,
  className,
  children,
  ...props
}) => {
  const colClasses = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
  };

  return (
    <div className={cn('grid gap-4 sm:gap-6', colClasses[columns], className)} {...props}>
      {children}
    </div>
  );
};
