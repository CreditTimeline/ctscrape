import { describe, it, expect } from 'vitest';
import { normalise } from '../engine';
import type { NormaliserInput } from '../types';
import type { RawExtractedData, RawSection } from '@/adapters/types';
import { validateSchema } from '../validation/schema-validator';
import { validateReferentialIntegrity } from '../validation/referential-integrity';

function makeMockRawData(): RawExtractedData {
  const sections: RawSection[] = [
    // personal_info
    {
      domain: 'personal_info',
      sourceSystem: null,
      fields: [
        { name: 'subject-name', value: 'John Smith', confidence: 'high' },
        { name: 'report-date', value: '20 August 2024', confidence: 'high' },
      ],
    },
    // addresses (Equifax)
    {
      domain: 'addresses',
      sourceSystem: 'Equifax',
      fields: [
        { name: 'address', value: '1 Test Street, London, SW1A 1AA', groupKey: 'equifax:current-0', confidence: 'high' },
      ],
    },
    // tradelines (Equifax)
    {
      domain: 'tradelines',
      sourceSystem: 'Equifax',
      fields: [
        { name: 'heading_lender', value: 'Test Bank', groupKey: 'equifax:Test Bank - Credit Card - Ending 1234', confidence: 'high' },
        { name: 'heading_account_type', value: 'Credit Card', groupKey: 'equifax:Test Bank - Credit Card - Ending 1234', confidence: 'high' },
        { name: 'heading_last4', value: '1234', groupKey: 'equifax:Test Bank - Credit Card - Ending 1234', confidence: 'high' },
        { name: 'status', value: 'Up to date with payments', groupKey: 'equifax:Test Bank - Credit Card - Ending 1234', confidence: 'high' },
        { name: 'opened', value: '1 January 2020', groupKey: 'equifax:Test Bank - Credit Card - Ending 1234', confidence: 'high' },
        { name: 'balance', value: '£1,234.56', groupKey: 'equifax:Test Bank - Credit Card - Ending 1234', confidence: 'high' },
        { name: 'limit', value: '£5,000', groupKey: 'equifax:Test Bank - Credit Card - Ending 1234', confidence: 'high' },
        { name: 'payment_history_2024_07', value: 'Clean Payment', groupKey: 'equifax:Test Bank - Credit Card - Ending 1234', confidence: 'high' },
        { name: 'payment_history_2024_06', value: 'Late Payment', groupKey: 'equifax:Test Bank - Credit Card - Ending 1234', confidence: 'high' },
        { name: 'date-of-birth', value: '9 July 1986', groupKey: 'equifax:Test Bank - Credit Card - Ending 1234', confidence: 'high' },
      ],
    },
    // tradelines (TransUnion) - same lender for dedup test
    {
      domain: 'tradelines',
      sourceSystem: 'TransUnion',
      fields: [
        { name: 'heading_lender', value: 'Test Bank', groupKey: 'transunion:Test Bank - Credit Card - Ending 1234', confidence: 'high' },
        { name: 'heading_account_type', value: 'Credit Card', groupKey: 'transunion:Test Bank - Credit Card - Ending 1234', confidence: 'high' },
        { name: 'heading_last4', value: '1234', groupKey: 'transunion:Test Bank - Credit Card - Ending 1234', confidence: 'high' },
        { name: 'status', value: 'Up to date', groupKey: 'transunion:Test Bank - Credit Card - Ending 1234', confidence: 'high' },
        { name: 'opened', value: '1 January 2020', groupKey: 'transunion:Test Bank - Credit Card - Ending 1234', confidence: 'high' },
        { name: 'payment_history_2024_07', value: 'Clean Payment', groupKey: 'transunion:Test Bank - Credit Card - Ending 1234', confidence: 'high' },
      ],
    },
    // searches (Equifax)
    {
      domain: 'searches',
      sourceSystem: 'Equifax',
      fields: [
        { name: 'date', value: '01/06/2024', groupKey: 'hard:search-0', confidence: 'high' },
        { name: 'companyName', value: 'Test Bank', groupKey: 'hard:search-0', confidence: 'high' },
        { name: 'name', value: 'John Smith', groupKey: 'hard:search-0', confidence: 'high' },
      ],
    },
    // credit_scores
    {
      domain: 'credit_scores',
      sourceSystem: null,
      fields: [
        { name: 'score', value: '750', groupKey: 'score-0', confidence: 'high' },
      ],
    },
    // electoral_roll
    {
      domain: 'electoral_roll',
      sourceSystem: 'Equifax',
      fields: [
        { name: 'electoral-roll', value: 'Added at the address', groupKey: 'er-0', confidence: 'high' },
      ],
    },
    // financial_associates
    {
      domain: 'financial_associates',
      sourceSystem: 'Equifax',
      fields: [
        { name: 'associated-to', value: 'Jane Smith', groupKey: 'fa-0', confidence: 'high' },
        { name: 'last-confirmed', value: '1 March 2024', groupKey: 'fa-0', confidence: 'high' },
      ],
    },
  ];

  return {
    metadata: {
      adapterId: 'checkmyfile',
      adapterVersion: '1.0.0',
      extractedAt: '2024-08-20T12:00:00Z',
      pageUrl: 'https://www.checkmyfile.com/report',
      htmlHash: 'abc123def456',
      sourceSystemsFound: ['Equifax', 'TransUnion'],
    },
    sections,
  };
}

function makeInput(overrides?: Partial<NormaliserInput>): NormaliserInput {
  return {
    rawData: makeMockRawData(),
    config: {
      defaultSubjectId: 'subject:default',
      currencyCode: 'GBP',
    },
    ...overrides,
  };
}

describe('normalise (integration)', () => {
  it('produces a valid CreditFile from realistic raw data', () => {
    const result = normalise(makeInput());

    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.creditFile).not.toBeNull();
  });

  it('schema validation passes on produced CreditFile', () => {
    const result = normalise(makeInput());
    expect(result.creditFile).not.toBeNull();

    const schemaErrors = validateSchema(result.creditFile!);
    expect(schemaErrors).toEqual([]);
  });

  it('referential integrity passes on produced CreditFile', () => {
    const result = normalise(makeInput());
    expect(result.creditFile).not.toBeNull();

    const refErrors = validateReferentialIntegrity(result.creditFile!);
    expect(refErrors).toEqual([]);
  });

  it('entity counts match expected values', () => {
    const result = normalise(makeInput());

    expect(result.summary.personNames).toBeGreaterThanOrEqual(1);
    expect(result.summary.addresses).toBeGreaterThanOrEqual(1);
    expect(result.summary.tradelines).toBe(2); // One per CRA
    expect(result.summary.searches).toBe(1);
    expect(result.summary.creditScores).toBe(1);
    expect(result.summary.electoralRollEntries).toBe(1);
    expect(result.summary.financialAssociates).toBe(1);
  });

  it('deterministic IDs are stable across repeated runs', () => {
    const input = makeInput();
    const result1 = normalise(input);
    const result2 = normalise(input);

    expect(result1.creditFile).not.toBeNull();
    expect(result2.creditFile).not.toBeNull();
    expect(result1.creditFile!.file_id).toBe(result2.creditFile!.file_id);

    // Import IDs should be stable
    const imports1 = result1.creditFile!.imports.map(i => i.import_id).sort();
    const imports2 = result2.creditFile!.imports.map(i => i.import_id).sort();
    expect(imports1).toEqual(imports2);

    // Organisation IDs should be stable (deterministic hash)
    const orgs1 = (result1.creditFile!.organisations ?? []).map(o => o.organisation_id).sort();
    const orgs2 = (result2.creditFile!.organisations ?? []).map(o => o.organisation_id).sort();
    expect(orgs1).toEqual(orgs2);
  });

  it('payment history maps correctly to canonical statuses', () => {
    const result = normalise(makeInput());
    expect(result.creditFile).not.toBeNull();

    const tradeline = result.creditFile!.tradelines![0]!;
    expect(tradeline.monthly_metrics).toBeDefined();

    const cleanMetric = tradeline.monthly_metrics!.find(m => m.period === '2024-07');
    expect(cleanMetric?.canonical_status).toBe('up_to_date');
    expect(cleanMetric?.value_text).toBe('Clean Payment');

    const lateMetric = tradeline.monthly_metrics!.find(m => m.period === '2024-06');
    expect(lateMetric?.canonical_status).toBe('in_arrears');
    expect(lateMetric?.value_text).toBe('Late Payment');
  });

  it('import batches are created for each CRA plus composite', () => {
    const result = normalise(makeInput());
    expect(result.creditFile).not.toBeNull();

    const imports = result.creditFile!.imports;
    // Equifax + TransUnion + composite
    expect(imports.length).toBe(3);

    const systems = imports.map(i => i.source_system).sort();
    expect(systems).toContain('equifax');
    expect(systems).toContain('transunion');
    expect(systems).toContain('other'); // composite
  });

  it('organisations are registered and deduplicated', () => {
    const result = normalise(makeInput());
    expect(result.creditFile).not.toBeNull();

    const orgs = result.creditFile!.organisations ?? [];
    // "Test Bank" appears in both Equifax tradeline and TransUnion tradeline + search
    // Should be deduplicated to one org
    const testBankOrgs = orgs.filter(o => o.name === 'Test Bank');
    expect(testBankOrgs.length).toBe(1);

    // Test Bank should have both furnisher and searcher roles
    const testBank = testBankOrgs[0]!;
    expect(testBank.roles).toContain('furnisher');
    expect(testBank.roles).toContain('searcher');
  });

  it('subject name is extracted from page info', () => {
    const result = normalise(makeInput());
    expect(result.creditFile).not.toBeNull();

    const names = result.creditFile!.subject.names ?? [];
    expect(names.some(n => n.full_name === 'John Smith')).toBe(true);
  });

  it('DOB is extracted from tradeline date-of-birth field', () => {
    const result = normalise(makeInput());
    expect(result.creditFile).not.toBeNull();

    const dobs = result.creditFile!.subject.dates_of_birth ?? [];
    expect(dobs.some(d => d.dob === '1986-07-09')).toBe(true);
  });

  it('all source_import_ids reference valid imports', () => {
    const result = normalise(makeInput());
    expect(result.creditFile).not.toBeNull();
    const cf = result.creditFile!;

    const validImportIds = new Set(cf.imports.map(i => i.import_id));

    // Check tradelines
    for (const tl of cf.tradelines ?? []) {
      expect(validImportIds.has(tl.source_import_id)).toBe(true);
    }
    // Check searches
    for (const sr of cf.searches ?? []) {
      expect(validImportIds.has(sr.source_import_id)).toBe(true);
    }
    // Check names
    for (const name of cf.subject.names ?? []) {
      expect(validImportIds.has(name.source_import_id)).toBe(true);
    }
  });
});
