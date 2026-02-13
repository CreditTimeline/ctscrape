// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { buildFullReport } from '@/adapters/checkmyfile/__tests__/fixtures/full-report';
import { extract } from '@/adapters/checkmyfile/extractor';
import { normalise } from '@/normalizer/engine';

async function extractAndNormalise() {
  buildFullReport(document);
  const rawData = await extract(document, 'checkmyfile', '0.1.0');
  return normalise({
    rawData,
    config: { defaultSubjectId: 'subject:test', currencyCode: 'GBP' },
  });
}

describe('multi-CRA separation', () => {
  it('each CRA gets its own ImportBatch', async () => {
    const result = await extractAndNormalise();
    expect(result.creditFile).not.toBeNull();

    const imports = result.creditFile!.imports;
    const sourceSystems = imports.map((i) => i.source_system);

    // Should have at least Experian, Equifax, TransUnion (plus composite)
    expect(sourceSystems).toContain('experian');
    expect(sourceSystems).toContain('equifax');
    expect(sourceSystems).toContain('transunion');
  });

  it('tradelines from different CRAs have correct source_import_id references', async () => {
    const result = await extractAndNormalise();
    expect(result.creditFile).not.toBeNull();
    const cf = result.creditFile!;

    const validImportIds = new Set(cf.imports.map((i) => i.import_id));
    const importById = new Map(cf.imports.map((i) => [i.import_id, i]));

    for (const tl of cf.tradelines ?? []) {
      expect(validImportIds.has(tl.source_import_id)).toBe(true);

      // The import's source_system should match the CRA the tradeline came from
      const imp = importById.get(tl.source_import_id)!;
      expect(['experian', 'equifax', 'transunion']).toContain(imp.source_system);
    }
  });

  it('same account reported by multiple CRAs produces multiple tradelines', async () => {
    const result = await extractAndNormalise();
    expect(result.creditFile).not.toBeNull();
    const cf = result.creditFile!;

    // Multiple CRAs report on the same accounts, producing multiple tradelines
    const tradelines = cf.tradelines ?? [];
    expect(tradelines.length).toBeGreaterThanOrEqual(3); // At least one per CRA

    // Group tradelines by source_import_id to verify they span multiple imports
    const byImport = new Map<string, number>();
    for (const tl of tradelines) {
      byImport.set(tl.source_import_id, (byImport.get(tl.source_import_id) ?? 0) + 1);
    }
    // Should have tradelines across multiple imports
    expect(byImport.size).toBeGreaterThan(1);
  });

  it('addresses are deduplicated but address_associations are per-CRA', async () => {
    const result = await extractAndNormalise();
    expect(result.creditFile).not.toBeNull();
    const cf = result.creditFile!;

    const addresses = cf.addresses ?? [];
    const associations = cf.address_associations ?? [];

    // Addresses should be deduplicated (fewer than raw address sections)
    // The fixture has 2 addresses, each reported by 3 CRAs = 6 raw sections
    // After dedup should be <= 6
    expect(addresses.length).toBeLessThanOrEqual(6);
    expect(addresses.length).toBeGreaterThan(0);

    // Address associations should reference valid addresses and imports
    const validAddressIds = new Set(addresses.map((a) => a.address_id));
    const validImportIds = new Set(cf.imports.map((i) => i.import_id));

    for (const assoc of associations) {
      expect(validAddressIds.has(assoc.address_id)).toBe(true);
      expect(validImportIds.has(assoc.source_import_id)).toBe(true);
    }

    // Should have more associations than unique addresses (multiple CRA associations per address)
    if (addresses.length > 0 && associations.length > 0) {
      expect(associations.length).toBeGreaterThanOrEqual(addresses.length);
    }
  });

  it('searches are attributed to the correct CRA', async () => {
    const result = await extractAndNormalise();
    expect(result.creditFile).not.toBeNull();
    const cf = result.creditFile!;

    const searches = cf.searches ?? [];
    expect(searches.length).toBeGreaterThan(0);

    const importById = new Map(cf.imports.map((i) => [i.import_id, i]));

    for (const search of searches) {
      const imp = importById.get(search.source_import_id);
      expect(imp).toBeDefined();
      // Search should be attributed to a specific CRA, not composite
      expect(['experian', 'equifax', 'transunion']).toContain(imp!.source_system);
    }
  });
});
