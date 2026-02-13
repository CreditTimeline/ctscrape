import type { RawField } from '../../types';

const DATA_KEY_RE =
  /^payment-history-calendar-(.+)-(.+)-(\d+)-(\d{4})$/;

export function extractPaymentHistory(
  paymentHistoryCell: Element,
  _cra: string,
  groupKey: string,
): RawField[] {
  const fields: RawField[] = [];

  const statusElements = paymentHistoryCell.querySelectorAll('[data-status]');

  for (const statusEl of statusElements) {
    const status = statusEl.getAttribute('data-status');
    if (!status || status === '-') continue;

    const parentRow = statusEl.parentElement;
    if (!parentRow) continue;

    const dataKey = parentRow.getAttribute('data-key');
    if (!dataKey) continue;

    const match = dataKey.match(DATA_KEY_RE);
    if (!match) continue;

    const month = parseInt(match[3]!, 10);
    const year = match[4]!;
    const paddedMonth = String(month).padStart(2, '0');

    fields.push({
      name: `payment_history_${year}_${paddedMonth}`,
      value: status,
      groupKey,
      confidence: 'high',
    });
  }

  return fields;
}
