import { describe, it, expect } from 'vitest';
import { createContext } from '../../context';
import { buildImportBatches } from '../../stages/import-batches';
import { normaliseFinancialAssociates } from '../../stages/financial-associates';
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

describe('normaliseFinancialAssociates', () => {
  it('creates associate records', () => {
    const ctx = createContext(mockConfig(), mockMetadata(), mockPageInfo());
    buildImportBatches(ctx);

    const sections: RawSection[] = [
      {
        domain: 'financial_associates',
        sourceSystem: 'Equifax',
        fields: [
          { name: 'associated-to', value: 'Jane Smith', groupKey: 'fa-1', confidence: 'high' },
        ],
      },
    ];

    normaliseFinancialAssociates(ctx, sections);

    expect(ctx.financialAssociates).toHaveLength(1);
    expect(ctx.financialAssociates[0]!.associate_name).toBe('Jane Smith');
    expect(ctx.financialAssociates[0]!.associate_id).toBe('fa:1');
  });

  it('parses confirmed date in long format', () => {
    const ctx = createContext(mockConfig(), mockMetadata(), mockPageInfo());
    buildImportBatches(ctx);

    const sections: RawSection[] = [
      {
        domain: 'financial_associates',
        sourceSystem: 'Equifax',
        fields: [
          { name: 'associated-to', value: 'Jane Smith', groupKey: 'fa-1', confidence: 'high' },
          { name: 'last-confirmed', value: '20 August 2024', groupKey: 'fa-1', confidence: 'high' },
        ],
      },
    ];

    normaliseFinancialAssociates(ctx, sections);

    expect(ctx.financialAssociates[0]!.confirmed_at).toBe('2024-08-20');
  });

  it('parses confirmed date in slash format', () => {
    const ctx = createContext(mockConfig(), mockMetadata(), mockPageInfo());
    buildImportBatches(ctx);

    const sections: RawSection[] = [
      {
        domain: 'financial_associates',
        sourceSystem: 'Equifax',
        fields: [
          { name: 'associated-to', value: 'Jane Smith', groupKey: 'fa-1', confidence: 'high' },
          { name: 'created-on', value: '20/08/2024', groupKey: 'fa-1', confidence: 'high' },
        ],
      },
    ];

    normaliseFinancialAssociates(ctx, sections);

    expect(ctx.financialAssociates[0]!.confirmed_at).toBe('2024-08-20');
  });

  it('sets defaults for relationship_basis and status', () => {
    const ctx = createContext(mockConfig(), mockMetadata(), mockPageInfo());
    buildImportBatches(ctx);

    const sections: RawSection[] = [
      {
        domain: 'financial_associates',
        sourceSystem: 'Equifax',
        fields: [
          { name: 'associated-to', value: 'Jane Smith', groupKey: 'fa-1', confidence: 'high' },
        ],
      },
    ];

    normaliseFinancialAssociates(ctx, sections);

    expect(ctx.financialAssociates[0]!.relationship_basis).toBe('other');
    expect(ctx.financialAssociates[0]!.status).toBe('active');
  });

  it('skips groups without associated-to field', () => {
    const ctx = createContext(mockConfig(), mockMetadata(), mockPageInfo());
    buildImportBatches(ctx);

    const sections: RawSection[] = [
      {
        domain: 'financial_associates',
        sourceSystem: 'Equifax',
        fields: [
          { name: 'last-confirmed', value: '20 August 2024', groupKey: 'fa-1', confidence: 'high' },
        ],
      },
    ];

    normaliseFinancialAssociates(ctx, sections);

    expect(ctx.financialAssociates).toHaveLength(0);
  });
});
