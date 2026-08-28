import { format, formatDistanceToNow, isValid } from 'date-fns';

export function formatDate(date: string | Date | undefined | null, pattern: string = 'MMM d, yyyy HH:mm') {
  if (!date) return '—';
  const d = new Date(date as string);
  if (!isValid(d)) return String(date);
  return format(d, pattern);
}

export function formatRelative(date: string | Date | undefined | null) {
  if (!date) return '—';
  const d = new Date(date as string);
  if (!isValid(d)) return String(date);
  return formatDistanceToNow(d, { addSuffix: true });
}

export function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

export function formatCurrency(value: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(value);
}
