'use client';

import React from 'react';

interface StockIndicatorProps {
  available: number;
  reorderLevel: number;
  showLabel?: boolean;
}

function getStockStatus(available: number, reorderLevel: number): 'green' | 'yellow' | 'red' {
  if (available === 0) return 'red';
  if (available <= reorderLevel) return 'yellow';
  return 'green';
}

export function StockIndicator({ available, reorderLevel, showLabel = true }: StockIndicatorProps) {
  const status = getStockStatus(available, reorderLevel);

  const colorClasses = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-400',
    red: 'bg-red-500',
  };

  const labelClasses = {
    green: 'text-green-700',
    yellow: 'text-yellow-700',
    red: 'text-red-700',
  };

  const labels = {
    green: 'In Stock',
    yellow: 'Low Stock',
    red: 'Out of Stock',
  };

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`inline-block h-2 w-2 rounded-full ${colorClasses[status]}`}
        aria-hidden="true"
      />
      {showLabel && (
        <span className={`text-xs font-medium ${labelClasses[status]}`}>
          {labels[status]}
        </span>
      )}
    </span>
  );
}
