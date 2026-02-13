// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { extractPaymentHistory } from '../../sections/payment-history';
import { createPaymentHistoryCalendar } from '../fixtures/helpers';

describe('extractPaymentHistory', () => {
  it('extracts calendar entries with data-status and data-key', () => {
    const cra = 'Experian';
    const accountId = `acct-${Math.floor(Math.random() * 10000)}`;
    const groupKey = `account-0-${cra}`;

    const entries = [
      { month: 1, year: 2024, status: 'Clean Payment', text: 'OK' },
      { month: 2, year: 2024, status: 'Late Payment', text: 'LP' },
      { month: 6, year: 2024, status: 'Default', text: 'D' },
    ];

    const cell = createPaymentHistoryCalendar(cra, accountId, entries);
    document.body.appendChild(cell);

    const result = extractPaymentHistory(cell, cra, groupKey);

    expect(result).toHaveLength(3);
    expect(result.find((f) => f.name === 'payment_history_2024_01')).toEqual({
      name: 'payment_history_2024_01',
      value: 'Clean Payment',
      groupKey,
      confidence: 'high',
    });
    expect(result.find((f) => f.name === 'payment_history_2024_02')!.value).toBe(
      'Late Payment',
    );
    expect(result.find((f) => f.name === 'payment_history_2024_06')!.value).toBe(
      'Default',
    );
  });

  it('skips entries with status "-"', () => {
    const cra = 'Equifax';
    const accountId = `acct-${Math.floor(Math.random() * 10000)}`;
    const groupKey = `account-1-${cra}`;

    // The calendar helper generates all 12 months per year; months without
    // explicit entries get status="-" which should be skipped.
    const entries = [
      { month: 3, year: 2023, status: 'Clean Payment', text: 'OK' },
    ];

    const cell = createPaymentHistoryCalendar(cra, accountId, entries);
    document.body.appendChild(cell);

    const result = extractPaymentHistory(cell, cra, groupKey);

    // Only the one explicit entry should be present
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe('payment_history_2023_03');
    expect(result[0]!.value).toBe('Clean Payment');
  });

  it('formats month with zero-padded two digits', () => {
    const cra = 'TransUnion';
    const accountId = `acct-${Math.floor(Math.random() * 10000)}`;
    const groupKey = `account-2-${cra}`;

    const entries = [
      { month: 9, year: 2025, status: 'Arrangement', text: 'A' },
      { month: 12, year: 2025, status: 'Clean Payment', text: 'OK' },
    ];

    const cell = createPaymentHistoryCalendar(cra, accountId, entries);
    document.body.appendChild(cell);

    const result = extractPaymentHistory(cell, cra, groupKey);

    expect(result).toHaveLength(2);
    expect(result.find((f) => f.name === 'payment_history_2025_09')).toBeDefined();
    expect(result.find((f) => f.name === 'payment_history_2025_12')).toBeDefined();
  });

  it('returns empty array for cell with no data-status elements', () => {
    const cell = document.createElement('div');
    cell.textContent = 'No payment history available';
    const result = extractPaymentHistory(cell, 'Experian', 'account-0-Experian');
    expect(result).toEqual([]);
  });
});
