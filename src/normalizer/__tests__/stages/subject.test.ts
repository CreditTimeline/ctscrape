import { describe, it, expect } from 'vitest';
import { createContext } from '../../context';
import { buildImportBatches } from '../../stages/import-batches';
import { normaliseSubject } from '../../stages/subject';
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

describe('normaliseSubject', () => {
  it('creates primary name from PageInfo.subjectName', () => {
    const ctx = createContext(mockConfig(), mockMetadata(), mockPageInfo());
    buildImportBatches(ctx);
    normaliseSubject(ctx, []);

    expect(ctx.names).toHaveLength(1);
    expect(ctx.names[0]!.full_name).toBe('John Smith');
    expect(ctx.names[0]!.name_type).toBe('legal');
    expect(ctx.names[0]!.name_id).toBe('name:1');
  });

  it('creates alias names from personal_info sections', () => {
    const ctx = createContext(mockConfig(), mockMetadata(), mockPageInfo());
    buildImportBatches(ctx);

    const sections: RawSection[] = [
      {
        domain: 'personal_info',
        sourceSystem: 'Equifax',
        fields: [
          { name: 'alias-name', value: 'J. Smith', groupKey: 'alias-1', confidence: 'high' },
        ],
      },
    ];

    normaliseSubject(ctx, sections);

    expect(ctx.names).toHaveLength(2);
    expect(ctx.names[1]!.full_name).toBe('J. Smith');
    expect(ctx.names[1]!.name_type).toBe('alias');
  });

  it('skips aliases matching primary name', () => {
    const ctx = createContext(mockConfig(), mockMetadata(), mockPageInfo());
    buildImportBatches(ctx);

    const sections: RawSection[] = [
      {
        domain: 'personal_info',
        sourceSystem: 'Equifax',
        fields: [
          { name: 'alias-name', value: 'John Smith', groupKey: 'alias-1', confidence: 'high' },
        ],
      },
    ];

    normaliseSubject(ctx, sections);

    // Only the primary name
    expect(ctx.names).toHaveLength(1);
    expect(ctx.names[0]!.name_type).toBe('legal');
  });

  it('collects unique DOBs from tradeline fields', () => {
    const ctx = createContext(mockConfig(), mockMetadata(), mockPageInfo());
    buildImportBatches(ctx);

    const sections: RawSection[] = [
      {
        domain: 'tradelines',
        sourceSystem: 'Equifax',
        fields: [
          { name: 'date-of-birth', value: '9 July 1986', groupKey: 'tl-1', confidence: 'high' },
        ],
      },
      {
        domain: 'tradelines',
        sourceSystem: 'TransUnion',
        fields: [
          { name: 'date-of-birth', value: '9 July 1986', groupKey: 'tl-2', confidence: 'high' },
        ],
      },
      {
        domain: 'tradelines',
        sourceSystem: 'Experian',
        fields: [
          { name: 'date-of-birth', value: '10 August 1986', groupKey: 'tl-3', confidence: 'high' },
        ],
      },
    ];

    normaliseSubject(ctx, sections);

    // Two unique dates
    expect(ctx.datesOfBirth).toHaveLength(2);
    expect(ctx.datesOfBirth[0]!.dob).toBe('1986-07-09');
    expect(ctx.datesOfBirth[1]!.dob).toBe('1986-08-10');
  });

  it('does not create name when subjectName is undefined', () => {
    const pageInfo = mockPageInfo();
    pageInfo.subjectName = undefined;
    const ctx = createContext(mockConfig(), mockMetadata(), pageInfo);
    buildImportBatches(ctx);
    normaliseSubject(ctx, []);

    expect(ctx.names).toHaveLength(0);
  });
});
