// @vitest-environment happy-dom
import { describe, bench } from 'vitest';
import { buildFullReport } from '@/adapters/checkmyfile/__tests__/fixtures/full-report';
import { extract } from '@/adapters/checkmyfile/extractor';
import { normalise } from '@/normalizer/engine';

describe('Normalisation benchmarks', () => {
  bench('standard report normalisation', async () => {
    buildFullReport(document);
    const data = await extract(document, 'checkmyfile', '1.0.0');
    normalise({
      rawData: data,
      config: { defaultSubjectId: 'subject:default', currencyCode: 'GBP' },
    });
  });

  bench('extraction only (baseline)', async () => {
    buildFullReport(document);
    await extract(document, 'checkmyfile', '1.0.0');
  });
});
