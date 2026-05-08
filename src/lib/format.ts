import { format, formatDistanceToNow } from 'date-fns';

export function formatDate(date: string | Date, pattern: string = 'MMM d, yyyy HH:mm') {
  return format(new Date(date), pattern);
}

export function formatRelative(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
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
