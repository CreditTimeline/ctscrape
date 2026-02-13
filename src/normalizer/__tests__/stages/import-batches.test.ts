import { describe, it, expect } from 'vitest';
import { createContext } from '../../context';
import { buildImportBatches } from '../../stages/import-batches';
import type { ExtractionMetadata, PageInfo } from '@/adapters/types';
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

describe('buildImportBatches', () => {
  it('creates one batch per CRA in sourceSystemsFound', () => {
    const ctx = createContext(mockConfig(), mockMetadata(), mockPageInfo());
    buildImportBatches(ctx);

    expect(ctx.importBatches.has('experian')).toBe(true);
    expect(ctx.importBatches.has('equifax')).toBe(true);
    expect(ctx.importBatches.has('transunion')).toBe(true);

    const experian = ctx.importBatches.get('experian')!;
    expect(experian.source_system).toBe('experian');

    const equifax = ctx.importBatches.get('equifax')!;
    expect(equifax.source_system).toBe('equifax');

    const transunion = ctx.importBatches.get('transunion')!;
    expect(transunion.source_system).toBe('transunion');
  });

  it('creates composite batch', () => {
    const ctx = createContext(mockConfig(), mockMetadata(), mockPageInfo());
    buildImportBatches(ctx);

    expect(ctx.importBatches.has('composite')).toBe(true);
    const composite = ctx.importBatches.get('composite')!;
    expect(composite.source_system).toBe('other');
    expect(composite.source_wrapper).toBe('CheckMyFile');
  });

  it('sets correct acquisition_method and source_wrapper', () => {
    const ctx = createContext(mockConfig(), mockMetadata(), mockPageInfo());
    buildImportBatches(ctx);

    for (const [, batch] of ctx.importBatches) {
      expect(batch.acquisition_method).toBe('html_scrape');
      expect(batch.source_wrapper).toBe('CheckMyFile');
    }
  });

  it('includes raw artifact with HTML hash for CRA batches', () => {
    const ctx = createContext(mockConfig(), mockMetadata(), mockPageInfo());
    buildImportBatches(ctx);

    const experian = ctx.importBatches.get('experian')!;
    expect(experian.raw_artifacts).toHaveLength(1);
    expect(experian.raw_artifacts![0]!.artifact_type).toBe('html');
    expect(experian.raw_artifacts![0]!.sha256).toBe('a'.repeat(64));
    expect(experian.raw_artifacts![0]!.uri).toBe('https://www.checkmyfile.com/download');
  });

  it('sets mapping_version with adapter version', () => {
    const ctx = createContext(mockConfig(), mockMetadata(), mockPageInfo());
    buildImportBatches(ctx);

    const equifax = ctx.importBatches.get('equifax')!;
    expect(equifax.mapping_version).toBe('checkmyfile-1.0.0');
  });

  it('composite batch does not have raw_artifacts', () => {
    const ctx = createContext(mockConfig(), mockMetadata(), mockPageInfo());
    buildImportBatches(ctx);

    const composite = ctx.importBatches.get('composite')!;
    expect(composite.raw_artifacts).toBeUndefined();
  });
});
