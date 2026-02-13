// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { extract } from '@/adapters/checkmyfile/extractor';
import { normalise } from '@/normalizer/engine';
import type { RawExtractedData, RawSection } from '@/adapters/types';

function makeMinimalRawData(sections: RawSection[] = []): RawExtractedData {
  return {
    metadata: {
      adapterId: 'checkmyfile',
      adapterVersion: '0.1.0',
      extractedAt: '2025-01-01T00:00:00Z',
      pageUrl: 'https://example.com',
      htmlHash: 'abc123',
      sourceSystemsFound: sections
        .map((s) => s.sourceSystem)
        .filter((s): s is string => s !== null)
        .filter((v, i, a) => a.indexOf(v) === i),
    },
    sections,
  };
}

describe('error propagation', () => {
  it('missing required sections produce normalisation errors, not crashes', () => {
    // No sections at all - should not throw
    const rawData = makeMinimalRawData([]);

    const result = normalise({
      rawData,
      config: { defaultSubjectId: 'subject:test', currencyCode: 'GBP' },
    });

    // Should complete without throwing
    expect(result).toBeDefined();
    expect(result.creditFile).toBeDefined();
    // May have errors/warnings but no crash
    expect(typeof result.success).toBe('boolean');
  });

  it('malformed field values produce warnings, not crashes', () => {
    const rawData = makeMinimalRawData([
      {
        domain: 'tradelines',
        sourceSystem: 'Equifax',
        fields: [
          { name: 'heading_lender', value: 'Bad Bank', groupKey: 'equifax:bad', confidence: 'high' },
          { name: 'heading_account_type', value: 'INVALID_TYPE', groupKey: 'equifax:bad', confidence: 'high' },
          { name: 'opened', value: 'not-a-date', groupKey: 'equifax:bad', confidence: 'high' },
          { name: 'balance', value: 'not-a-number', groupKey: 'equifax:bad', confidence: 'high' },
        ],
      },
    ]);

    const result = normalise({
      rawData,
      config: { defaultSubjectId: 'subject:test', currencyCode: 'GBP' },
    });

    // Should not crash
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
  });

  it('empty page produces extraction with zero sections', async () => {
    document.body.innerHTML = '';

    const rawData = await extract(document, 'checkmyfile', '0.1.0');

    expect(rawData.sections).toHaveLength(0);
    expect(rawData.metadata.sourceSystemsFound).toHaveLength(0);
  });

  it('partial CRA data (only 1 of 3) produces valid CreditFile', () => {
    // Only Equifax data, no Experian or TransUnion
    const rawData = makeMinimalRawData([
      {
        domain: 'personal_info',
        sourceSystem: null,
        fields: [
          { name: 'subject-name', value: 'Test User', confidence: 'high' },
          { name: 'report-date', value: '15 January 2025', confidence: 'high' },
        ],
      },
      {
        domain: 'tradelines',
        sourceSystem: 'Equifax',
        fields: [
          { name: 'heading_lender', value: 'Test Bank', groupKey: 'equifax:Test Bank - Credit Card - Ending 1234', confidence: 'high' },
          { name: 'heading_account_type', value: 'Credit Card', groupKey: 'equifax:Test Bank - Credit Card - Ending 1234', confidence: 'high' },
          { name: 'heading_last4', value: '1234', groupKey: 'equifax:Test Bank - Credit Card - Ending 1234', confidence: 'high' },
          { name: 'status', value: 'Active', groupKey: 'equifax:Test Bank - Credit Card - Ending 1234', confidence: 'high' },
          { name: 'opened', value: '1 January 2020', groupKey: 'equifax:Test Bank - Credit Card - Ending 1234', confidence: 'high' },
          { name: 'balance', value: '£500', groupKey: 'equifax:Test Bank - Credit Card - Ending 1234', confidence: 'high' },
        ],
      },
    ]);

    const result = normalise({
      rawData,
      config: { defaultSubjectId: 'subject:test', currencyCode: 'GBP' },
    });

    expect(result.creditFile).not.toBeNull();
    // Should have an Equifax import batch
    const equifaxImport = result.creditFile!.imports.find(
      (i) => i.source_system === 'equifax',
    );
    expect(equifaxImport).toBeDefined();

    // Tradeline count should be 1 (single CRA)
    expect(result.summary.tradelines).toBe(1);
  });
});
