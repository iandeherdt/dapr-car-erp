import React from 'react';
import type { Money } from '@car-erp/shared-types';
import { formatMoney } from './format';

interface MoneyDisplayProps {
  money: Money | undefined;
  className?: string;
}

export function MoneyDisplay({ money, className }: MoneyDisplayProps) {
  return (
    <span className={className ?? 'tabular-nums'}>
      {formatMoney(money)}
    </span>
  );
}
