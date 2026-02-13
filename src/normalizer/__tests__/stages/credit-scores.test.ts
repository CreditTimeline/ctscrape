import { describe, it, expect } from 'vitest';
import { createContext } from '../../context';
import { buildImportBatches } from '../../stages/import-batches';
import { normaliseCreditScores } from '../../stages/credit-scores';
import type { ExtractionMetadata, PageInfo, RawSection } from '@/adapters/types';
import type { NormaliserConfig } from '../../types';

function mockMetadata(): ExtractionMetadata {
  return {
    adapterId: 'checkmyfile',
    adapterVersion: '1.0.0',
    extractedAt: '2025-01-15T10:00:00Z',
    pageUrl: 'https://www.checkmyfile.com/download',
    htmlHash: 'a'.repeat(64),
    sourceSystemsFound: ['Experian', 'Equifax', 'TransUnion'],
  };
}

function mockConfig(): NormaliserConfig {
  return {
    defaultSubjectId: 'subject:test',
    currencyCode: 'GBP',
  };
}

function mockPageInfo(): PageInfo {
  return {
    siteName: 'CheckMyFile',
    subjectName: 'John Smith',
    reportDate: '15 January 2025',
    providers: ['Experian', 'Equifax', 'TransUnion'],
  };
}

describe('normaliseCreditScores', () => {
  it('parses score value', () => {
    const ctx = createContext(mockConfig(), mockMetadata(), mockPageInfo());
    buildImportBatches(ctx);

    const sections: RawSection[] = [
      {
        domain: 'credit_scores',
        sourceSystem: null,
        fields: [
          { name: 'score', value: '742', groupKey: 'score-1', confidence: 'high' },
        ],
      },
    ];

    normaliseCreditScores(ctx, sections);

    expect(ctx.creditScores).toHaveLength(1);
    expect(ctx.creditScores[0]!.score_value).toBe(742);
  });

  it('sets CheckMyFile range (0-1000)', () => {
    const ctx = createContext(mockConfig(), mockMetadata(), mockPageInfo());
    buildImportBatches(ctx);

    const sections: RawSection[] = [
      {
        domain: 'credit_scores',
        sourceSystem: null,
        fields: [
          { name: 'score', value: '742', groupKey: 'score-1', confidence: 'high' },
        ],
      },
    ];

    normaliseCreditScores(ctx, sections);

    expect(ctx.creditScores[0]!.score_min).toBe(0);
    expect(ctx.creditScores[0]!.score_max).toBe(1000);
    expect(ctx.creditScores[0]!.score_name).toBe('CheckMyFile');
  });

  it('sets calculated_at from report date', () => {
    const ctx = createContext(mockConfig(), mockMetadata(), mockPageInfo());
    buildImportBatches(ctx);

    const sections: RawSection[] = [
      {
        domain: 'credit_scores',
        sourceSystem: null,
        fields: [
          { name: 'score', value: '742', groupKey: 'score-1', confidence: 'high' },
        ],
      },
    ];

    normaliseCreditScores(ctx, sections);

    expect(ctx.creditScores[0]!.calculated_at).toBe('2025-01-15');
  });

  it('warns on unparseable scores', () => {
    const ctx = createContext(mockConfig(), mockMetadata(), mockPageInfo());
    buildImportBatches(ctx);

    const sections: RawSection[] = [
      {
        domain: 'credit_scores',
        sourceSystem: null,
        fields: [
          { name: 'score', value: 'N/A', groupKey: 'score-1', confidence: 'high' },
        ],
      },
    ];

    normaliseCreditScores(ctx, sections);

    expect(ctx.creditScores).toHaveLength(0);
    expect(ctx.warnings).toHaveLength(1);
    expect(ctx.warnings[0]!.domain).toBe('credit_scores');
    expect(ctx.warnings[0]!.severity).toBe('warning');
    expect(ctx.warnings[0]!.message).toContain('N/A');
  });
});
