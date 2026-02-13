import { describe, it, expect } from 'vitest';
import { createContext } from '../../context';
import { buildImportBatches } from '../../stages/import-batches';
import { normaliseElectoralRoll } from '../../stages/electoral-roll';
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

describe('normaliseElectoralRoll', () => {
  it('creates entries from electoral_roll sections', () => {
    const ctx = createContext(mockConfig(), mockMetadata(), mockPageInfo());
    buildImportBatches(ctx);

    const sections: RawSection[] = [
      {
        domain: 'electoral_roll',
        sourceSystem: 'Equifax',
        fields: [
          { name: 'electoral-roll', value: 'Added at the address', groupKey: 'er-1', confidence: 'high' },
        ],
      },
    ];

    normaliseElectoralRoll(ctx, sections);

    expect(ctx.electoralRollEntries).toHaveLength(1);
    expect(ctx.electoralRollEntries[0]!.name_on_register).toBe('John Smith');
    expect(ctx.electoralRollEntries[0]!.electoral_entry_id).toBe('er:1');
  });

  it('maps change types correctly', () => {
    const ctx = createContext(mockConfig(), mockMetadata(), mockPageInfo());
    buildImportBatches(ctx);

    const sections: RawSection[] = [
      {
        domain: 'electoral_roll',
        sourceSystem: 'Equifax',
        fields: [
          { name: 'electoral-roll', value: 'Added at the address', groupKey: 'er-1', confidence: 'high' },
        ],
      },
      {
        domain: 'electoral_roll',
        sourceSystem: 'Equifax',
        fields: [
          { name: 'electoral-roll', value: 'Deleted at the address', groupKey: 'er-2', confidence: 'high' },
        ],
      },
      {
        domain: 'electoral_roll',
        sourceSystem: 'Equifax',
        fields: [
          { name: 'electoral-roll', value: 'Registered', groupKey: 'er-3', confidence: 'high' },
        ],
      },
    ];

    normaliseElectoralRoll(ctx, sections);

    expect(ctx.electoralRollEntries[0]!.change_type).toBe('added');
    expect(ctx.electoralRollEntries[1]!.change_type).toBe('deleted');
    expect(ctx.electoralRollEntries[2]!.change_type).toBe('added'); // "Registered" defaults to added
  });

  it('handles marketing opt-out', () => {
    const ctx = createContext(mockConfig(), mockMetadata(), mockPageInfo());
    buildImportBatches(ctx);

    const sections: RawSection[] = [
      {
        domain: 'electoral_roll',
        sourceSystem: 'Equifax',
        fields: [
          { name: 'electoral-roll', value: 'Added at the address', groupKey: 'er-1', confidence: 'high' },
          { name: 'marketing-status', value: 'Opted out of marketing', groupKey: 'er-1', confidence: 'high' },
        ],
      },
      {
        domain: 'electoral_roll',
        sourceSystem: 'TransUnion',
        fields: [
          { name: 'electoral-roll', value: 'Added at the address', groupKey: 'er-2', confidence: 'high' },
          { name: 'marketing-status', value: 'Yes', groupKey: 'er-2', confidence: 'high' },
        ],
      },
    ];

    normaliseElectoralRoll(ctx, sections);

    expect(ctx.electoralRollEntries[0]!.marketing_opt_out).toBe(true);
    expect(ctx.electoralRollEntries[1]!.marketing_opt_out).toBe(false);
  });

  it('looks up address from address registry', () => {
    const ctx = createContext(mockConfig(), mockMetadata(), mockPageInfo());
    buildImportBatches(ctx);

    // Pre-register an address
    ctx.addressRegistry.set('10 DOWNING STREET, LONDON, SW1A 2AA', 'addr:test-123');

    const sections: RawSection[] = [
      {
        domain: 'electoral_roll',
        sourceSystem: 'Equifax',
        fields: [
          { name: 'electoral-roll', value: 'Added at the address', groupKey: 'er-1', confidence: 'high' },
          { name: 'address', value: '10 Downing Street, London, SW1A 2AA', groupKey: 'er-1', confidence: 'high' },
        ],
      },
    ];

    normaliseElectoralRoll(ctx, sections);

    expect(ctx.electoralRollEntries[0]!.address_id).toBe('addr:test-123');
  });
});
