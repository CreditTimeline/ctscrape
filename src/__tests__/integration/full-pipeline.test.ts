// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { buildFullReport } from '@/adapters/checkmyfile/__tests__/fixtures/full-report';
import { extract } from '@/adapters/checkmyfile/extractor';
import { normalise } from '@/normalizer/engine';
import { validateSchema } from '@/normalizer/validation/schema-validator';
import { validateReferentialIntegrity } from '@/normalizer/validation/referential-integrity';

describe('full pipeline: extract -> normalise -> validate', () => {
  it('full report extraction + normalisation succeeds', async () => {
    buildFullReport(document);

    const rawData = await extract(document, 'checkmyfile', '0.1.0');
    const result = normalise({
      rawData,
      config: { defaultSubjectId: 'subject:test', currencyCode: 'GBP' },
    });

    expect(result.success).toBe(true);
    expect(result.creditFile).not.toBeNull();
    expect(result.errors).toEqual([]);
  });

  it('entity counts in normalised output match fixture counts', async () => {
    const summary = buildFullReport(document);

    const rawData = await extract(document, 'checkmyfile', '0.1.0');
    const result = normalise({
      rawData,
      config: { defaultSubjectId: 'subject:test', currencyCode: 'GBP' },
    });

    expect(result.creditFile).not.toBeNull();

    // Tradeline count depends on groupKey dedup (accounts with same tableIndex merge)
    // With the fixture layout, expect at least one tradeline per CRA that has data
    expect(result.summary.tradelines).toBeGreaterThanOrEqual(1);

    expect(result.summary.addresses).toBeGreaterThanOrEqual(summary.addressCount);
    expect(result.summary.searches).toBe(summary.hardSearchCount + summary.softSearchCount);
    expect(result.summary.creditScores).toBeGreaterThanOrEqual(1);
  });

  it('tradelines appear in output with correct data', async () => {
    buildFullReport(document);

    const rawData = await extract(document, 'checkmyfile', '0.1.0');
    const result = normalise({
      rawData,
      config: { defaultSubjectId: 'subject:test', currencyCode: 'GBP' },
    });

    expect(result.creditFile).not.toBeNull();
    const tradelines = result.creditFile!.tradelines ?? [];
    expect(tradelines.length).toBeGreaterThan(0);

    // Each tradeline should have required fields
    for (const tl of tradelines) {
      expect(tl.tradeline_id).toBeTruthy();
      expect(tl.source_import_id).toBeTruthy();
      // Must have furnisher info (org id or raw name)
      expect(tl.furnisher_organisation_id || tl.furnisher_name_raw).toBeTruthy();
    }
  });

  it('addresses appear with correct data', async () => {
    buildFullReport(document);

    const rawData = await extract(document, 'checkmyfile', '0.1.0');
    const result = normalise({
      rawData,
      config: { defaultSubjectId: 'subject:test', currencyCode: 'GBP' },
    });

    expect(result.creditFile).not.toBeNull();
    const addresses = result.creditFile!.addresses ?? [];
    expect(addresses.length).toBeGreaterThan(0);

    for (const addr of addresses) {
      expect(addr.address_id).toBeTruthy();
    }
  });

  it('credit score appears', async () => {
    buildFullReport(document);

    const rawData = await extract(document, 'checkmyfile', '0.1.0');
    const result = normalise({
      rawData,
      config: { defaultSubjectId: 'subject:test', currencyCode: 'GBP' },
    });

    expect(result.creditFile).not.toBeNull();
    const scores = result.creditFile!.credit_scores ?? [];
    expect(scores.length).toBeGreaterThanOrEqual(1);

    const score = scores[0]!;
    expect(score.score_id).toBeTruthy();
    expect(score.score_value).toBe(742);
  });

  it('schema validation passes', async () => {
    buildFullReport(document);

    const rawData = await extract(document, 'checkmyfile', '0.1.0');
    const result = normalise({
      rawData,
      config: { defaultSubjectId: 'subject:test', currencyCode: 'GBP' },
    });

    expect(result.creditFile).not.toBeNull();
    const schemaErrors = validateSchema(result.creditFile!);
    expect(schemaErrors).toEqual([]);
  });

  it('referential integrity passes', async () => {
    buildFullReport(document);

    const rawData = await extract(document, 'checkmyfile', '0.1.0');
    const result = normalise({
      rawData,
      config: { defaultSubjectId: 'subject:test', currencyCode: 'GBP' },
    });

    expect(result.creditFile).not.toBeNull();
    const refErrors = validateReferentialIntegrity(result.creditFile!);
    expect(refErrors).toEqual([]);
  });
});
