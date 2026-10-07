/**
 * formatters.ts
 * Formatting utilities for metrics and labels.
 */

/**
 * Correctly pluralizes months (e.g. 1 month, 0.5 months, 2 months).
 */
export function formatMonths(val: number | string | undefined | null): string {
  if (val === undefined || val === null) return '';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return `${val} months`;
  return `${num} ${num === 1 ? 'month' : 'months'}`;
}

/**
 * Formats a month count with standard label (e.g. "1 month safety buffer", "3 months safety buffer").
 */
export function formatMonthsBuffer(val: number | string | undefined | null): string {
  if (val === undefined || val === null) return 'Runway estimated at ~1.0 mo';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return `${val} months safety buffer`;
  return `${num} ${num === 1 ? 'month' : 'months'} safety buffer`;
}
