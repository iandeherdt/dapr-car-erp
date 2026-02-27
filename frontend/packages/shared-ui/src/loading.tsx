import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses: Record<NonNullable<LoadingSpinnerProps['size']>, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-4',
};

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  return (
    <div
      className={`animate-spin rounded-full border-gray-300 border-t-blue-600 ${sizeClasses[size]} ${className ?? ''}`}
      role="status"
      aria-label="Loading"
    />
  );
}

export function LoadingOverlay({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <LoadingSpinner size="lg" />
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}
