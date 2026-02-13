import { describe, it, expect } from 'vitest';
import { createContext } from '../../context';
import { buildImportBatches } from '../../stages/import-batches';
import { normaliseSearches } from '../../stages/searches';
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

describe('normaliseSearches', () => {
  it('creates search records from search groups', () => {
    const ctx = createContext(mockConfig(), mockMetadata(), mockPageInfo());
    buildImportBatches(ctx);

    const sections: RawSection[] = [
      {
        domain: 'searches',
        sourceSystem: 'Equifax',
        fields: [
          { name: 'date', value: '15/01/2025', groupKey: 'hard-search-1', confidence: 'high' },
          { name: 'companyName', value: 'HSBC Bank', groupKey: 'hard-search-1', confidence: 'high' },
          { name: 'name', value: 'John Smith', groupKey: 'hard-search-1', confidence: 'high' },
        ],
      },
    ];

    normaliseSearches(ctx, sections);

    expect(ctx.searches).toHaveLength(1);
    expect(ctx.searches[0]!.searched_at).toBe('2025-01-15');
    expect(ctx.searches[0]!.organisation_name_raw).toBe('HSBC Bank');
    expect(ctx.searches[0]!.input_name).toBe('John Smith');
  });

  it('maps hard section type correctly', () => {
    const ctx = createContext(mockConfig(), mockMetadata(), mockPageInfo());
    buildImportBatches(ctx);

    const sections: RawSection[] = [
      {
        domain: 'searches',
        sourceSystem: 'Equifax',
        fields: [
          { name: 'companyName', value: 'HSBC', groupKey: 'hard-search-1', confidence: 'high' },
        ],
      },
    ];

    normaliseSearches(ctx, sections);

    expect(ctx.searches[0]!.search_type).toBe('credit_application');
    expect(ctx.searches[0]!.visibility).toBe('hard');
  });

  it('maps soft section type correctly', () => {
    const ctx = createContext(mockConfig(), mockMetadata(), mockPageInfo());
    buildImportBatches(ctx);

    const sections: RawSection[] = [
      {
        domain: 'searches',
        sourceSystem: 'Equifax',
        fields: [
          { name: 'companyName', value: 'ClearScore', groupKey: 'soft-search-1', confidence: 'high' },
        ],
      },
    ];

    normaliseSearches(ctx, sections);

    expect(ctx.searches[0]!.search_type).toBe('other');
    expect(ctx.searches[0]!.visibility).toBe('soft');
  });

  it('registers searcher organisations', () => {
    const ctx = createContext(mockConfig(), mockMetadata(), mockPageInfo());
    buildImportBatches(ctx);

    const sections: RawSection[] = [
      {
        domain: 'searches',
        sourceSystem: 'Equifax',
        fields: [
          { name: 'companyName', value: 'HSBC Bank', groupKey: 'hard-1', confidence: 'high' },
        ],
      },
      {
        domain: 'searches',
        sourceSystem: 'TransUnion',
        fields: [
          { name: 'companyName', value: 'HSBC Bank', groupKey: 'hard-2', confidence: 'high' },
        ],
      },
    ];

    normaliseSearches(ctx, sections);

    // Deduped: only one org
    expect(ctx.organisations).toHaveLength(1);
    expect(ctx.organisations[0]!.name).toBe('HSBC Bank');
    expect(ctx.organisations[0]!.roles).toContain('searcher');
  });

  it('handles input address registration', () => {
    const ctx = createContext(mockConfig(), mockMetadata(), mockPageInfo());
    buildImportBatches(ctx);

    const sections: RawSection[] = [
      {
        domain: 'searches',
        sourceSystem: 'Equifax',
        fields: [
          { name: 'companyName', value: 'HSBC', groupKey: 'hard-1', confidence: 'high' },
          { name: 'address', value: '10 Downing Street, London, SW1A 2AA', groupKey: 'hard-1', confidence: 'high' },
        ],
      },
    ];

    normaliseSearches(ctx, sections);

    expect(ctx.addresses).toHaveLength(1);
    expect(ctx.searches[0]!.input_address_id).toBe(ctx.addresses[0]!.address_id);
    expect(ctx.addressAssociations).toHaveLength(1);
    expect(ctx.addressAssociations[0]!.role).toBe('search_input');
  });
});
