import { describe, it, expect } from 'vitest';
import { createContext } from '../../context';
import { buildImportBatches } from '../../stages/import-batches';
import { normaliseAddresses } from '../../stages/addresses';
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

describe('normaliseAddresses', () => {
  it('parses and registers addresses', () => {
    const ctx = createContext(mockConfig(), mockMetadata(), mockPageInfo());
    buildImportBatches(ctx);

    const sections: RawSection[] = [
      {
        domain: 'addresses',
        sourceSystem: 'Equifax',
        fields: [
          {
            name: 'address',
            value: '10 Downing Street, London, SW1A 2AA',
            groupKey: 'current address',
            confidence: 'high',
          },
        ],
      },
    ];

    normaliseAddresses(ctx, sections);

    expect(ctx.addresses).toHaveLength(1);
    expect(ctx.addresses[0]!.line_1).toBe('10 Downing Street');
    expect(ctx.addresses[0]!.town_city).toBe('London');
    expect(ctx.addresses[0]!.postcode).toBe('SW1A 2AA');
    expect(ctx.addresses[0]!.country_code).toBe('GB');
  });

  it('deduplicates addresses with same normalized_single_line', () => {
    const ctx = createContext(mockConfig(), mockMetadata(), mockPageInfo());
    buildImportBatches(ctx);

    const sections: RawSection[] = [
      {
        domain: 'addresses',
        sourceSystem: 'Equifax',
        fields: [
          {
            name: 'address',
            value: '10 Downing Street, London, SW1A 2AA',
            groupKey: 'eq-current',
            confidence: 'high',
          },
        ],
      },
      {
        domain: 'addresses',
        sourceSystem: 'TransUnion',
        fields: [
          {
            name: 'address',
            value: '10 Downing Street, London, SW1A 2AA',
            groupKey: 'tu-current',
            confidence: 'high',
          },
        ],
      },
    ];

    normaliseAddresses(ctx, sections);

    // Only one unique address registered
    expect(ctx.addresses).toHaveLength(1);
    // But two associations
    expect(ctx.addressAssociations).toHaveLength(2);
  });

  it('creates associations with correct roles', () => {
    const ctx = createContext(mockConfig(), mockMetadata(), mockPageInfo());
    buildImportBatches(ctx);

    const sections: RawSection[] = [
      {
        domain: 'addresses',
        sourceSystem: 'Equifax',
        fields: [
          {
            name: 'address',
            value: '10 Downing Street, London, SW1A 2AA',
            groupKey: 'current address',
            confidence: 'high',
          },
        ],
      },
      {
        domain: 'addresses',
        sourceSystem: 'Equifax',
        fields: [
          {
            name: 'address',
            value: '22 Baker Street, London, NW1 6XE',
            groupKey: 'previous address',
            confidence: 'high',
          },
        ],
      },
    ];

    normaliseAddresses(ctx, sections);

    expect(ctx.addressAssociations[0]!.role).toBe('current');
    expect(ctx.addressAssociations[1]!.role).toBe('previous');
  });

  it('creates address links from linked-address fields', () => {
    const ctx = createContext(mockConfig(), mockMetadata(), mockPageInfo());
    buildImportBatches(ctx);

    const sections: RawSection[] = [
      {
        domain: 'addresses',
        sourceSystem: 'TransUnion',
        fields: [
          {
            name: 'address',
            value: '10 Downing Street, London, SW1A 2AA',
            groupKey: 'address links',
            confidence: 'high',
          },
          {
            name: 'linked-address',
            value: '22 Baker Street, London, NW1 6XE',
            groupKey: 'address links',
            confidence: 'high',
          },
        ],
      },
    ];

    normaliseAddresses(ctx, sections);

    expect(ctx.addresses).toHaveLength(2);
    expect(ctx.addressLinks).toHaveLength(1);
    expect(ctx.addressLinks[0]!.from_address_id).toBe(ctx.addresses[0]!.address_id);
    expect(ctx.addressLinks[0]!.to_address_id).toBe(ctx.addresses[1]!.address_id);
  });
});
