// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { extractAccounts } from '../../sections/accounts';
import type { ClassifiedSection } from '../../section-classifier';
import {
  createSection,
  createCraTableRow,
  createAccountTable,
  createPaymentHistoryCalendar,
  randomName,
  randomAddress,
  randomDate,
  randomAmount,
  randomLender,
  randomAccountType,
  randomLast4,
} from '../fixtures/helpers';
import { NO_DATA_SENTINEL } from '../../constants';

/** For CRAs not in craData, set lender to sentinel so they get skipped. */
function fillSentinels(
  craData: Record<string, Record<string, string | HTMLElement>>,
): Record<string, Record<string, string | HTMLElement>> {
  const filled = { ...craData };
  for (const cra of ['Experian', 'Equifax', 'TransUnion']) {
    if (!filled[cra]) {
      filled[cra] = { lender: NO_DATA_SENTINEL };
    }
  }
  return filled;
}

function buildActiveAccountSection(
  lender: string,
  accountType: string,
  last4: string,
  craData: Record<string, Record<string, string | HTMLElement>>,
): ClassifiedSection {
  const heading = `${lender} - ${accountType} - Ending ${last4}`;
  const filled = fillSentinels(craData);
  const rows: HTMLTableRowElement[] = [];

  // Standard fields for active accounts
  const activeFieldSlugs = [
    'lender',
    'account-type',
    'opened',
    'opening-balance',
    'repayment-period',
    'regular-payment',
    'name',
    'address',
    'date-of-birth',
    'balance',
    'limit',
    'status',
  ];

  for (const slug of activeFieldSlugs) {
    const values: Record<string, string> = {};
    for (const cra of ['Experian', 'Equifax', 'TransUnion']) {
      const data = filled[cra];
      if (data && slug in data) {
        const val = data[slug];
        if (typeof val === 'string') {
          values[cra as 'Experian' | 'Equifax' | 'TransUnion'] = val;
        }
      }
    }
    rows.push(createCraTableRow(slug, slug, values));
  }

  // Payment history row - special handling
  const phRow = document.createElement('tr');
  const phLabel = document.createElement('td');
  phLabel.textContent = 'Payment History';
  phRow.appendChild(phLabel);

  for (const cra of ['Experian', 'Equifax', 'TransUnion']) {
    const td = document.createElement('td');
    const span = document.createElement('span');
    span.setAttribute('data-testid', `table-data-${cra}-payment-history`);
    const data = filled[cra];
    if (data && 'payment-history' in data) {
      const phEl = data['payment-history'];
      if (phEl instanceof Element) {
        span.appendChild(phEl);
      }
    }
    td.appendChild(span);
    phRow.appendChild(td);
  }
  rows.push(phRow);

  const accountTableEl = createAccountTable(heading, rows);

  const section = createSection({
    heading: 'Payment History - Active Accounts',
    content: accountTableEl.outerHTML,
  });
  document.body.appendChild(section);

  return { type: 'active_accounts', element: section, index: 0 };
}

function buildClosedAccountSection(
  lender: string,
  accountType: string,
  last4: string,
  craData: Record<string, Record<string, string | HTMLElement>>,
): ClassifiedSection {
  const heading = `${lender} - ${accountType} - Ending ${last4}`;
  const filled = fillSentinels(craData);
  const rows: HTMLTableRowElement[] = [];

  const closedFieldSlugs = [
    'lender',
    'account-type',
    'opened',
    'closed',
    'reported-until',
    'regular-payment',
    'name',
    'address',
    'date-of-birth',
    'balance',
    'limit',
    'status',
  ];

  for (const slug of closedFieldSlugs) {
    const values: Record<string, string> = {};
    for (const cra of ['Experian', 'Equifax', 'TransUnion']) {
      const data = filled[cra];
      if (data && slug in data) {
        const val = data[slug];
        if (typeof val === 'string') {
          values[cra as 'Experian' | 'Equifax' | 'TransUnion'] = val;
        }
      }
    }
    rows.push(createCraTableRow(slug, slug, values));
  }

  // Payment history row
  const phRow = document.createElement('tr');
  const phLabel = document.createElement('td');
  phLabel.textContent = 'Payment History';
  phRow.appendChild(phLabel);
  for (const cra of ['Experian', 'Equifax', 'TransUnion']) {
    const td = document.createElement('td');
    const span = document.createElement('span');
    span.setAttribute('data-testid', `table-data-${cra}-payment-history`);
    td.appendChild(span);
    phRow.appendChild(td);
  }
  rows.push(phRow);

  const accountTableEl = createAccountTable(heading, rows);

  const section = createSection({
    heading: 'Payment History - Closed Accounts',
    content: accountTableEl.outerHTML,
  });
  document.body.appendChild(section);

  return { type: 'closed_accounts', element: section, index: 0 };
}

describe('extractAccounts', () => {
  it('extracts active account data with all fields', () => {
    const lender = randomLender();
    const accountType = randomAccountType();
    const last4 = randomLast4();
    const name = randomName();
    const addr = randomAddress();
    const opened = randomDate();
    const balance = randomAmount();
    const status = 'Active';

    const section = buildActiveAccountSection(lender, accountType, last4, {
      Experian: {
        lender,
        'account-type': accountType,
        opened,
        'opening-balance': '£5,000',
        'repayment-period': '60 months',
        'regular-payment': '£100',
        name,
        address: addr,
        'date-of-birth': '01 January 1990',
        balance,
        status,
      },
    });

    const result = extractAccounts([section]);

    expect(result).toHaveLength(1);
    expect(result[0]!.domain).toBe('tradelines');
    expect(result[0]!.sourceSystem).toBe('Experian');

    const fields = result[0]!.fields;
    expect(fields.find((f) => f.name === 'lender')!.value).toBe(lender);
    expect(fields.find((f) => f.name === 'account-type')!.value).toBe(accountType);
    expect(fields.find((f) => f.name === 'opened')!.value).toBe(opened);
    expect(fields.find((f) => f.name === 'balance')!.value).toBe(balance);
    expect(fields.find((f) => f.name === 'is_closed')!.value).toBe('false');
    expect(fields.find((f) => f.name === 'heading_lender')!.value).toBe(lender);
    expect(fields.find((f) => f.name === 'heading_account_type')!.value).toBe(accountType);
    expect(fields.find((f) => f.name === 'heading_last4')!.value).toBe(last4);

    // All fields share same groupKey
    const groupKeys = new Set(fields.map((f) => f.groupKey));
    expect(groupKeys.size).toBe(1);
    expect(groupKeys.has('account-0-Experian')).toBe(true);
  });

  it('extracts closed account with is_closed=true', () => {
    const lender = randomLender();
    const accountType = randomAccountType();
    const last4 = randomLast4();
    const closedDate = randomDate();
    const reportedUntil = randomDate();

    const section = buildClosedAccountSection(lender, accountType, last4, {
      Equifax: {
        lender,
        'account-type': accountType,
        opened: randomDate(),
        closed: closedDate,
        'reported-until': reportedUntil,
        name: randomName(),
        address: randomAddress(),
        balance: '£0',
        status: 'Settled',
      },
    });

    const result = extractAccounts([section]);

    expect(result).toHaveLength(1);
    expect(result[0]!.sourceSystem).toBe('Equifax');

    const fields = result[0]!.fields;
    expect(fields.find((f) => f.name === 'is_closed')!.value).toBe('true');
    expect(fields.find((f) => f.name === 'closed')!.value).toBe(closedDate);
    expect(fields.find((f) => f.name === 'reported-until')!.value).toBe(reportedUntil);
  });

  it('skips CRAs with sentinel text in lender field', () => {
    const lender = randomLender();
    const accountType = randomAccountType();
    const last4 = randomLast4();

    const section = buildActiveAccountSection(lender, accountType, last4, {
      Experian: {
        lender,
        'account-type': accountType,
        balance: randomAmount(),
        status: 'Active',
      },
      Equifax: {
        lender: NO_DATA_SENTINEL,
      },
      TransUnion: {
        lender,
        'account-type': accountType,
        balance: randomAmount(),
        status: 'Active',
      },
    });

    const result = extractAccounts([section]);

    expect(result).toHaveLength(2);
    const systems = result.map((r) => r.sourceSystem);
    expect(systems).toContain('Experian');
    expect(systems).toContain('TransUnion');
    expect(systems).not.toContain('Equifax');
  });

  it('parses heading into lender, account type, and last4', () => {
    const lender = randomLender();
    const accountType = randomAccountType();
    const last4 = randomLast4();

    const section = buildActiveAccountSection(lender, accountType, last4, {
      TransUnion: {
        lender,
        'account-type': accountType,
        balance: randomAmount(),
        status: 'Active',
      },
    });

    const result = extractAccounts([section]);
    expect(result).toHaveLength(1);

    const fields = result[0]!.fields;
    expect(fields.find((f) => f.name === 'heading_lender')!.value).toBe(lender);
    expect(fields.find((f) => f.name === 'heading_account_type')!.value).toBe(accountType);
    expect(fields.find((f) => f.name === 'heading_last4')!.value).toBe(last4);
  });

  it('integrates payment history extraction', () => {
    const lender = randomLender();
    const accountType = randomAccountType();
    const last4 = randomLast4();
    const accountId = `acct-${Math.floor(Math.random() * 10000)}`;

    const phCalendar = createPaymentHistoryCalendar('Experian', accountId, [
      { month: 1, year: 2024, status: 'Clean Payment', text: 'OK' },
      { month: 2, year: 2024, status: 'Late Payment', text: 'LP' },
    ]);

    const section = buildActiveAccountSection(lender, accountType, last4, {
      Experian: {
        lender,
        'account-type': accountType,
        balance: randomAmount(),
        status: 'Active',
        'payment-history': phCalendar,
      },
    });

    const result = extractAccounts([section]);
    expect(result).toHaveLength(1);

    const fields = result[0]!.fields;
    const phFields = fields.filter((f) => f.name.startsWith('payment_history_'));
    expect(phFields).toHaveLength(2);
    expect(phFields.find((f) => f.name === 'payment_history_2024_01')!.value).toBe(
      'Clean Payment',
    );
    expect(phFields.find((f) => f.name === 'payment_history_2024_02')!.value).toBe(
      'Late Payment',
    );
  });

  it('returns empty array for non-account sections', () => {
    const el = createSection({ heading: 'Addresses & Electoral Roll' });
    document.body.appendChild(el);
    const sections: ClassifiedSection[] = [
      { type: 'addresses', element: el, index: 0 },
    ];
    expect(extractAccounts(sections)).toEqual([]);
  });

  it('returns empty array for empty sections list', () => {
    expect(extractAccounts([])).toEqual([]);
  });
});
