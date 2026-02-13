import { describe, it, expect } from 'vitest';
import { formatPence, formatDate, formatDateTime, formatCount, getStateLabel } from '../../lib/format';
import type { ExtractionState } from '../../extraction/types';

describe('formatPence', () => {
  it('formats zero pence', () => {
    expect(formatPence(0)).toBe('\u00A30.00');
  });

  it('formats whole pounds', () => {
    expect(formatPence(100)).toBe('\u00A31.00');
  });

  it('formats pence with decimals', () => {
    expect(formatPence(1234)).toBe('\u00A312.34');
  });

  it('formats large amounts with thousands separators', () => {
    expect(formatPence(123456)).toBe('\u00A31,234.56');
  });

  it('formats negative amounts', () => {
    // toLocaleString places the minus sign after the currency symbol
    expect(formatPence(-500)).toBe('\u00A3-5.00');
  });
});

describe('formatDate', () => {
  it('formats a valid ISO date', () => {
    const result = formatDate('2024-01-15');
    expect(result).toBe('15 Jan 2024');
  });

  it('returns raw string for invalid date', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date');
  });

  it('formats another date', () => {
    const result = formatDate('2023-12-25');
    expect(result).toBe('25 Dec 2023');
  });
});

describe('formatDateTime', () => {
  it('formats a valid ISO datetime', () => {
    const result = formatDateTime('2024-01-15T14:30:00Z');
    // Exact output depends on locale/timezone, just check it's not the raw string
    expect(result).not.toBe('2024-01-15T14:30:00Z');
    expect(result).toContain('Jan');
    expect(result).toContain('2024');
  });

  it('returns raw string for invalid datetime', () => {
    expect(formatDateTime('invalid')).toBe('invalid');
  });
});

describe('formatCount', () => {
  it('uses singular for count of 1', () => {
    expect(formatCount(1, 'address', 'addresses')).toBe('1 address');
  });

  it('uses plural for count > 1', () => {
    expect(formatCount(5, 'address', 'addresses')).toBe('5 addresses');
  });

  it('uses plural for count of 0', () => {
    expect(formatCount(0, 'address', 'addresses')).toBe('0 addresses');
  });

  it('auto-pluralises with s when plural not provided', () => {
    expect(formatCount(3, 'item')).toBe('3 items');
  });

  it('auto-pluralises singular form', () => {
    expect(formatCount(1, 'item')).toBe('1 item');
  });
});

describe('getStateLabel', () => {
  const cases: [ExtractionState, string][] = [
    ['idle', 'Idle'],
    ['detected', 'Detected'],
    ['extracting', 'Extracting'],
    ['normalising', 'Normalising'],
    ['ready', 'Ready'],
    ['sending', 'Sending'],
    ['complete', 'Complete'],
    ['error', 'Error'],
  ];

  it.each(cases)('returns "%s" for state "%s"', (state, expected) => {
    expect(getStateLabel(state)).toBe(expected);
  });
});
