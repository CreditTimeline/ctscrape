/**
 * Display formatters for the extension UI.
 */

import type { ExtractionState } from '../extraction/types';

/** Convert pence (integer minor units) to £ display string. */
export function formatPence(pence: number): string {
  const pounds = pence / 100;
  return `\u00A3${pounds.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Format an ISO date (YYYY-MM-DD) for display. */
export function formatDate(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00');
  if (isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Format an ISO datetime for display. */
export function formatDateTime(isoDateTime: string): string {
  const d = new Date(isoDateTime);
  if (isNaN(d.getTime())) return isoDateTime;
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Format a count with label (e.g. "3 tradelines", "1 address"). */
export function formatCount(count: number, singular: string, plural?: string): string {
  const p = plural ?? singular + 's';
  return `${count} ${count === 1 ? singular : p}`;
}

/** Human-readable label for an ExtractionState. */
export function getStateLabel(state: ExtractionState): string {
  const labels: Record<ExtractionState, string> = {
    idle: 'Idle',
    detected: 'Detected',
    extracting: 'Extracting',
    normalising: 'Normalising',
    ready: 'Ready',
    sending: 'Sending',
    complete: 'Complete',
    error: 'Error',
  };
  return labels[state];
}
