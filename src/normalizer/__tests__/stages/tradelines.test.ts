import { describe, it, expect } from 'vitest';
import type { RawSection, RawField } from '@/adapters/types';
import { buildTradelines, parseHeading, inferTermType, detectEvents } from '../../stages/tradelines';
import { createContext } from '../../context';
import type { NormalisationContext } from '../../context';
import { generateId } from '../../id-generator';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCtx(): NormalisationContext {
  const ctx = createContext(
    { defaultSubjectId: 'subj:test', currencyCode: 'GBP' },
    {
      adapterId: 'checkmyfile',
      adapterVersion: '0.1.0',
      extractedAt: '2025-01-15T12:00:00Z',
      pageUrl: 'https://www.checkmyfile.com/report',
      htmlHash: 'abc123',
      sourceSystemsFound: ['Equifax', 'TransUnion'],
    },
    {
      siteName: 'CheckMyFile',
      providers: ['Equifax', 'TransUnion'],
    },
  );
  // Pre-populate import batches so getImportId works
  ctx.importBatches.set('equifax', {
    import_id: 'imp:equifax:1',
    imported_at: '2025-01-15T12:00:00Z',
    source_system: 'equifax',
    source_wrapper: 'CheckMyFile',
    acquisition_method: 'html_scrape',
  });
  ctx.importBatches.set('transunion', {
    import_id: 'imp:transunion:1',
    imported_at: '2025-01-15T12:00:00Z',
    source_system: 'transunion',
    source_wrapper: 'CheckMyFile',
    acquisition_method: 'html_scrape',
  });
  ctx.importBatches.set('composite', {
    import_id: 'imp:composite:1',
    imported_at: '2025-01-15T12:00:00Z',
    source_system: 'other',
    source_wrapper: 'CheckMyFile',
    acquisition_method: 'html_scrape',
  });
  return ctx;
}

function field(name: string, value: string, groupKey: string): RawField {
  return { name, value, groupKey, confidence: 'high' };
}

function makeSection(
  groupKey: string,
  fields: Array<[string, string]>,
  sourceSystem: string = 'equifax',
): RawSection {
  return {
    domain: 'tradelines',
    sourceSystem,
    fields: fields.map(([n, v]) => field(n!, v!, groupKey)),
  };
}

// ---------------------------------------------------------------------------
// parseHeading
// ---------------------------------------------------------------------------

describe('parseHeading', () => {
  it('parses active heading with lender, type, and last4', () => {
    const result = parseHeading('active:BARCLAYS - Credit Card - Ending 1234');
    expect(result.sectionPrefix).toBe('active');
    expect(result.lender).toBe('BARCLAYS');
    expect(result.accountType).toBe('Credit Card');
    expect(result.last4).toBe('1234');
  });

  it('parses closed heading', () => {
    const result = parseHeading('closed:HSBC - Mortgage - Ending 5678');
    expect(result.sectionPrefix).toBe('closed');
    expect(result.lender).toBe('HSBC');
    expect(result.accountType).toBe('Mortgage');
    expect(result.last4).toBe('5678');
  });

  it('handles heading without prefix', () => {
    const result = parseHeading('SANTANDER - Loan');
    expect(result.sectionPrefix).toBeUndefined();
    expect(result.lender).toBe('SANTANDER');
    expect(result.accountType).toBe('Loan');
    expect(result.last4).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// inferTermType
// ---------------------------------------------------------------------------

describe('inferTermType', () => {
  it('returns revolving for credit_card', () => {
    expect(inferTermType('credit_card')).toBe('revolving');
  });

  it('returns revolving for budget_account', () => {
    expect(inferTermType('budget_account')).toBe('revolving');
  });

  it('returns mortgage for mortgage', () => {
    expect(inferTermType('mortgage')).toBe('mortgage');
  });

  it('returns rental for rental', () => {
    expect(inferTermType('rental')).toBe('rental');
  });

  it('returns installment for unsecured_loan', () => {
    expect(inferTermType('unsecured_loan')).toBe('installment');
  });

  it('returns installment for secured_loan', () => {
    expect(inferTermType('secured_loan')).toBe('installment');
  });

  it('returns other for unknown types', () => {
    expect(inferTermType('telecom')).toBe('other');
    expect(inferTermType('utility')).toBe('other');
  });
});

// ---------------------------------------------------------------------------
// buildTradelines — basic active account
// ---------------------------------------------------------------------------

describe('buildTradelines', () => {
  it('maps a basic active account with lender, account type, balance', () => {
    const ctx = makeCtx();
    const sections: RawSection[] = [
      makeSection('active:BARCLAYS - Credit Card - Ending 1234', [
        ['lender', 'Barclays'],
        ['account-type', 'Credit Card'],
        ['opened', '15 March 2020'],
        ['balance', '£1,500.00'],
        ['status', 'Up to date with payments'],
      ]),
    ];

    buildTradelines(sections, ctx);

    expect(ctx.tradelines).toHaveLength(1);
    const tl = ctx.tradelines[0]!;
    expect(tl.furnisher_name_raw).toBe('Barclays');
    expect(tl.account_type).toBe('credit_card');
    expect(tl.opened_at).toBe('2020-03-15');
    expect(tl.status_current).toBe('up_to_date');
    expect(tl.snapshots).toHaveLength(1);
    expect(tl.snapshots![0]!.current_balance).toBe(150000);
  });

  // ---------------------------------------------------------------------------
  // Closed account with settled status -> settled event
  // ---------------------------------------------------------------------------

  it('maps a closed account with settled status and creates settled event', () => {
    const ctx = makeCtx();
    const sections: RawSection[] = [
      makeSection('closed:HSBC - Loan - Ending 5678', [
        ['lender', 'HSBC'],
        ['account-type', 'Loan'],
        ['opened', '1 January 2018'],
        ['closed', '30 June 2023'],
        ['status', 'Settled'],
        ['balance', '£0'],
      ]),
    ];

    buildTradelines(sections, ctx);

    expect(ctx.tradelines).toHaveLength(1);
    const tl = ctx.tradelines[0]!;
    expect(tl.closed_at).toBe('2023-06-30');
    expect(tl.events).toBeDefined();
    expect(tl.events!.length).toBeGreaterThanOrEqual(1);
    const settledEvent = tl.events!.find(e => e.event_type === 'settled');
    expect(settledEvent).toBeDefined();
    expect(settledEvent!.event_date).toBe('2023-06-30');
  });

  // ---------------------------------------------------------------------------
  // Payment history -> monthly metrics
  // ---------------------------------------------------------------------------

  it('handles payment history fields and creates monthly metrics', () => {
    const ctx = makeCtx();
    const sections: RawSection[] = [
      makeSection('active:BARCLAYS - Credit Card - Ending 1234', [
        ['lender', 'Barclays'],
        ['account-type', 'Credit Card'],
        ['payment_history_2025_01', 'Clean Payment'],
        ['payment_history_2025_02', 'Late Payment'],
        ['payment_history_2025_03', 'Default'],
      ]),
    ];

    buildTradelines(sections, ctx);

    const tl = ctx.tradelines[0]!;
    expect(tl.monthly_metrics).toHaveLength(3);

    const jan = tl.monthly_metrics!.find(m => m.period === '2025-01');
    expect(jan).toBeDefined();
    expect(jan!.canonical_status).toBe('up_to_date');
    expect(jan!.value_text).toBe('Clean Payment');

    const feb = tl.monthly_metrics!.find(m => m.period === '2025-02');
    expect(feb).toBeDefined();
    expect(feb!.canonical_status).toBe('in_arrears');

    const mar = tl.monthly_metrics!.find(m => m.period === '2025-03');
    expect(mar).toBeDefined();
    expect(mar!.canonical_status).toBe('default');
  });

  // ---------------------------------------------------------------------------
  // Deterministic canonical_id
  // ---------------------------------------------------------------------------

  it('generates deterministic canonical_id from furnisher + type + last4 + opened_at', () => {
    const ctx1 = makeCtx();
    const ctx2 = makeCtx();
    const sections: RawSection[] = [
      makeSection('active:BARCLAYS - Credit Card - Ending 1234', [
        ['lender', 'Barclays'],
        ['account-type', 'Credit Card'],
        ['opened', '15 March 2020'],
      ]),
    ];

    buildTradelines(sections, ctx1);
    buildTradelines(sections, ctx2);

    expect(ctx1.tradelines[0]!.canonical_id).toBe(ctx2.tradelines[0]!.canonical_id);
    // Verify the canonical_id is based on the expected inputs
    const expected = generateId('canon', 'BARCLAYS', 'credit_card', '1234', '2020-03-15');
    expect(ctx1.tradelines[0]!.canonical_id).toBe(expected);
  });

  // ---------------------------------------------------------------------------
  // Terms with inferred term_type
  // ---------------------------------------------------------------------------

  it('creates terms with inferred term_type (credit card -> revolving, mortgage -> mortgage)', () => {
    const ctx = makeCtx();
    const sections: RawSection[] = [
      makeSection('active:BARCLAYS - Credit Card - Ending 1234', [
        ['lender', 'Barclays'],
        ['account-type', 'Credit Card'],
        ['repayment-period', '36'],
        ['regular-payment', '£150.00'],
      ]),
      makeSection('active:NATIONWIDE - Mortgage - Ending 9999', [
        ['lender', 'Nationwide'],
        ['account-type', 'Mortgage'],
        ['repayment-period', '300'],
        ['regular-payment', '£1,200.00'],
      ]),
    ];

    buildTradelines(sections, ctx);

    expect(ctx.tradelines).toHaveLength(2);

    const card = ctx.tradelines.find(t => t.account_type === 'credit_card')!;
    expect(card.terms).toBeDefined();
    expect(card.terms!.term_type).toBe('revolving');
    expect(card.terms!.term_count).toBe(36);
    expect(card.terms!.term_payment_amount).toBe(15000);
    expect(card.regular_payment_amount).toBe(15000);

    const mortgage = ctx.tradelines.find(t => t.account_type === 'mortgage')!;
    expect(mortgage.terms).toBeDefined();
    expect(mortgage.terms!.term_type).toBe('mortgage');
    expect(mortgage.terms!.term_count).toBe(300);
    expect(mortgage.terms!.term_payment_amount).toBe(120000);
  });

  // ---------------------------------------------------------------------------
  // Snapshot creation
  // ---------------------------------------------------------------------------

  it('creates snapshot with current balance, credit limit, opening balance', () => {
    const ctx = makeCtx();
    const sections: RawSection[] = [
      makeSection('active:BARCLAYS - Credit Card - Ending 1234', [
        ['lender', 'Barclays'],
        ['account-type', 'Credit Card'],
        ['opening-balance', '£5,000'],
        ['balance', '£2,300.50'],
        ['limit', '£10,000'],
        ['reported-until', '1 December 2024'],
        ['status', 'Up to date with payments'],
      ]),
    ];

    buildTradelines(sections, ctx);

    const tl = ctx.tradelines[0]!;
    expect(tl.snapshots).toHaveLength(1);
    const snap = tl.snapshots![0]!;
    expect(snap.opening_balance).toBe(500000);
    expect(snap.current_balance).toBe(230050);
    expect(snap.credit_limit).toBe(1000000);
    expect(snap.as_of_date).toBe('2024-12-01');
    expect(snap.status_current).toBe('up_to_date');
  });

  // ---------------------------------------------------------------------------
  // Organisation registration
  // ---------------------------------------------------------------------------

  it('registers furnisher organisation and links via furnisher_organisation_id', () => {
    const ctx = makeCtx();
    const sections: RawSection[] = [
      makeSection('active:BARCLAYS - Credit Card - Ending 1234', [
        ['lender', 'Barclays'],
        ['account-type', 'Credit Card'],
      ]),
      makeSection('active:BARCLAYS - Loan - Ending 5555', [
        ['lender', 'Barclays'],
        ['account-type', 'Loan'],
      ]),
    ];

    buildTradelines(sections, ctx);

    // Should only create one organisation (deduped)
    expect(ctx.organisations).toHaveLength(1);
    expect(ctx.organisations[0]!.name).toBe('Barclays');
    expect(ctx.organisations[0]!.roles).toContain('furnisher');

    // Both tradelines should reference the same org
    expect(ctx.tradelines[0]!.furnisher_organisation_id).toBe(
      ctx.tradelines[1]!.furnisher_organisation_id,
    );
    expect(ctx.tradelines[0]!.furnisher_organisation_id).toBe(
      ctx.organisations[0]!.organisation_id,
    );
  });

  // ---------------------------------------------------------------------------
  // Masked account number identifier
  // ---------------------------------------------------------------------------

  it('creates masked_account_number identifier from heading last4', () => {
    const ctx = makeCtx();
    const sections: RawSection[] = [
      makeSection('active:BARCLAYS - Credit Card - Ending 1234', [
        ['lender', 'Barclays'],
        ['account-type', 'Credit Card'],
        ['heading_last4', '1234'],
      ]),
    ];

    buildTradelines(sections, ctx);

    const tl = ctx.tradelines[0]!;
    expect(tl.identifiers).toHaveLength(1);
    expect(tl.identifiers![0]!.identifier_type).toBe('masked_account_number');
    expect(tl.identifiers![0]!.value).toBe('1234');
  });

  it('uses last4 from heading when heading_last4 field is not present', () => {
    const ctx = makeCtx();
    const sections: RawSection[] = [
      makeSection('active:BARCLAYS - Credit Card - Ending 9876', [
        ['lender', 'Barclays'],
        ['account-type', 'Credit Card'],
      ]),
    ];

    buildTradelines(sections, ctx);

    const tl = ctx.tradelines[0]!;
    expect(tl.identifiers).toHaveLength(1);
    expect(tl.identifiers![0]!.value).toBe('9876');
  });

  // ---------------------------------------------------------------------------
  // Missing fields gracefully handled
  // ---------------------------------------------------------------------------

  it('handles missing fields gracefully without crashing', () => {
    const ctx = makeCtx();
    // Provide a single dummy field so the group is created by groupFieldsByGroupKey,
    // but omit all standard tradeline fields (lender, account-type, opened, etc.)
    const sections: RawSection[] = [
      makeSection('active:UNKNOWN LENDER - Unknown Type', [
        ['some-unrecognised-field', 'irrelevant'],
      ]),
    ];

    buildTradelines(sections, ctx);

    expect(ctx.tradelines).toHaveLength(1);
    const tl = ctx.tradelines[0]!;
    // Should fall back to heading values
    expect(tl.furnisher_name_raw).toBe('UNKNOWN LENDER');
    expect(tl.opened_at).toBeUndefined();
    expect(tl.closed_at).toBeUndefined();
    expect(tl.status_current).toBeUndefined();
    expect(tl.identifiers).toBeUndefined();
    expect(tl.terms).toBeUndefined();
    expect(tl.snapshots).toBeUndefined();
    expect(tl.monthly_metrics).toBeUndefined();
    expect(tl.events).toBeUndefined();
    // Should have a warning for unknown account type
    expect(ctx.warnings.length).toBeGreaterThanOrEqual(1);
  });

  // ---------------------------------------------------------------------------
  // Default event detection
  // ---------------------------------------------------------------------------

  it('detects default event from status containing "default"', () => {
    const ctx = makeCtx();
    const sections: RawSection[] = [
      makeSection('closed:BADLENDER - Loan - Ending 0000', [
        ['lender', 'BadLender'],
        ['account-type', 'Loan'],
        ['opened', '1 June 2019'],
        ['closed', '15 September 2021'],
        ['status', 'Defaulted'],
      ]),
    ];

    buildTradelines(sections, ctx);

    const tl = ctx.tradelines[0]!;
    expect(tl.events).toBeDefined();
    const defaultEvent = tl.events!.find(e => e.event_type === 'default');
    expect(defaultEvent).toBeDefined();
    expect(defaultEvent!.event_date).toBe('2021-09-15');
  });

  // ---------------------------------------------------------------------------
  // Arrangement event detection
  // ---------------------------------------------------------------------------

  it('detects arrangement_to_pay event from status', () => {
    const ctx = makeCtx();
    const sections: RawSection[] = [
      makeSection('active:LENDER - Loan - Ending 1111', [
        ['lender', 'Lender'],
        ['account-type', 'Loan'],
        ['opened', '1 January 2020'],
        ['status', 'Arrangement to pay'],
      ]),
    ];

    buildTradelines(sections, ctx);

    const tl = ctx.tradelines[0]!;
    expect(tl.events).toBeDefined();
    const arrEvent = tl.events!.find(e => e.event_type === 'arrangement_to_pay');
    expect(arrEvent).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// detectEvents (unit tests)
// ---------------------------------------------------------------------------

describe('detectEvents', () => {
  it('returns empty array when no status', () => {
    const ctx = makeCtx();
    const events = detectEvents(undefined, undefined, undefined, 'imp:1', ctx);
    expect(events).toHaveLength(0);
  });

  it('creates default event using closedAt date', () => {
    const ctx = makeCtx();
    const events = detectEvents('defaulted', '2023-01-15', '2020-06-01', 'imp:1', ctx);
    const evt = events.find(e => e.event_type === 'default');
    expect(evt).toBeDefined();
    expect(evt!.event_date).toBe('2023-01-15');
  });

  it('creates settled event only when closedAt is present', () => {
    const ctx = makeCtx();
    const noClose = detectEvents('settled', undefined, '2020-01-01', 'imp:1', ctx);
    expect(noClose.find(e => e.event_type === 'settled')).toBeUndefined();

    const withClose = detectEvents('settled', '2023-06-30', '2020-01-01', 'imp:1', ctx);
    expect(withClose.find(e => e.event_type === 'settled')).toBeDefined();
    expect(withClose.find(e => e.event_type === 'settled')!.event_date).toBe('2023-06-30');
  });
});
