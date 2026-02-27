import type { Money } from '@car-erp/shared-types';

export function formatMoney(money: Money | undefined): string {
  if (!money) return '€0.00';
  return new Intl.NumberFormat('nl-BE', {
    style: 'currency',
    currency: money.currency || 'EUR',
  }).format(money.amountCents / 100);
}

export function formatDate(isoString: string): string {
  if (!isoString) return '-';
  return new Intl.DateTimeFormat('nl-BE', { dateStyle: 'medium' }).format(
    new Date(isoString),
  );
}

export function formatDateTime(isoString: string): string {
  if (!isoString) return '-';
  return new Intl.DateTimeFormat('nl-BE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(isoString));
}
