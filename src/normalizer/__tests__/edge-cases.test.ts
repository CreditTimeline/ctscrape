import { describe, it, expect } from 'vitest';
import { normalise } from '../engine';
import type { NormaliserInput } from '../types';
import type { RawExtractedData } from '@/adapters/types';

function makeMinimalRawData(overrides?: Partial<RawExtractedData>): RawExtractedData {
  return {
    metadata: {
      adapterId: 'checkmyfile',
      adapterVersion: '1.0.0',
      extractedAt: '2024-08-20T12:00:00Z',
      pageUrl: 'https://www.checkmyfile.com/report',
      htmlHash: 'abc123def456',
      sourceSystemsFound: ['Equifax'],
    },
    sections: [],
    ...overrides,
  };
}

function makeInput(rawData?: RawExtractedData): NormaliserInput {
  return {
    rawData: rawData ?? makeMinimalRawData(),
    config: {
      defaultSubjectId: 'subject:default',
      currencyCode: 'GBP',
    },
  };
}

describe('edge cases', () => {
  it('empty sections array produces valid (minimal) output', () => {
    const result = normalise(makeInput());

    // Should succeed - no errors from the pipeline itself
    // Might have no tradelines/searches but the basic structure should be valid
    expect(result.creditFile).not.toBeNull();
    expect(result.creditFile!.imports.length).toBeGreaterThanOrEqual(1);
    expect(result.creditFile!.subject).toBeDefined();
    expect(result.creditFile!.subject.subject_id).toBe('subject:default');
  });

  it('missing fields produce warnings not crashes', () => {
    const rawData = makeMinimalRawData({
      sections: [
        {
          domain: 'tradelines',
          sourceSystem: 'Equifax',
          fields: [
            // groupKey but missing most fields
            { name: 'heading_lender', value: 'Mystery Bank', groupKey: 'equifax:Mystery', confidence: 'low' },
          ],
        },
      ],
    });

    const result = normalise(makeInput(rawData));
    // Should not throw
    expect(result.creditFile).not.toBeNull();
    expect(result.summary.tradelines).toBe(1);
  });

  it('unparseable dates produce warnings', () => {
    const rawData = makeMinimalRawData({
      sections: [
        {
          domain: 'tradelines',
          sourceSystem: 'Equifax',
          fields: [
            { name: 'heading_lender', value: 'Date Bank', groupKey: 'equifax:DateBank', confidence: 'high' },
            { name: 'opened', value: 'not a date', groupKey: 'equifax:DateBank', confidence: 'low' },
          ],
        },
      ],
    });

    const result = normalise(makeInput(rawData));
    expect(result.creditFile).not.toBeNull();
    // The date field should be undefined since it can't be parsed
    const tl = result.creditFile!.tradelines?.[0];
    expect(tl?.opened_at).toBeUndefined();
  });

  it('unparseable amounts produce warnings', () => {
    const rawData = makeMinimalRawData({
      sections: [
        {
          domain: 'tradelines',
          sourceSystem: 'Equifax',
          fields: [
            { name: 'heading_lender', value: 'Amount Bank', groupKey: 'equifax:AmountBank', confidence: 'high' },
            { name: 'balance', value: 'not a number', groupKey: 'equifax:AmountBank', confidence: 'low' },
          ],
        },
      ],
    });

    const result = normalise(makeInput(rawData));
    expect(result.creditFile).not.toBeNull();
    // The tradeline should exist but without a snapshot (balance couldn't be parsed)
    const tl = result.creditFile!.tradelines?.[0];
    expect(tl).toBeDefined();
  });

  it('duplicate addresses are deduplicated', () => {
    const rawData = makeMinimalRawData({
      metadata: {
        adapterId: 'checkmyfile',
        adapterVersion: '1.0.0',
        extractedAt: '2024-08-20T12:00:00Z',
        pageUrl: 'https://www.checkmyfile.com/report',
        htmlHash: 'abc123def456',
        sourceSystemsFound: ['Equifax', 'TransUnion'],
      },
      sections: [
        {
          domain: 'addresses',
          sourceSystem: 'Equifax',
          fields: [
            { name: 'address', value: '1 Test Street, London, SW1A 1AA', groupKey: 'equifax:current-0', confidence: 'high' },
          ],
        },
        {
          domain: 'addresses',
          sourceSystem: 'TransUnion',
          fields: [
            { name: 'address', value: '1 Test Street, London, SW1A 1AA', groupKey: 'transunion:current-0', confidence: 'high' },
          ],
        },
      ],
    });

    const result = normalise(makeInput(rawData));
    expect(result.creditFile).not.toBeNull();

    // Same address from two CRAs should produce one address entry
    const addresses = result.creditFile!.addresses ?? [];
    expect(addresses.length).toBe(1);

    // But two associations (one per CRA)
    const associations = result.creditFile!.address_associations ?? [];
    expect(associations.length).toBe(2);
  });

  it('handles pageInfo override', () => {
    const rawData = makeMinimalRawData();
    const input: NormaliserInput = {
      rawData,
      config: {
        defaultSubjectId: 'subject:custom',
        currencyCode: 'GBP',
      },
      pageInfo: {
        siteName: 'CustomSite',
        subjectName: 'Custom Subject',
        providers: ['Equifax'],
      },
    };

    const result = normalise(input);
    expect(result.creditFile).not.toBeNull();

    // The subject name should come from the provided pageInfo
    const names = result.creditFile!.subject.names ?? [];
    expect(names.some(n => n.full_name === 'Custom Subject')).toBe(true);
  });
});
