// @vitest-environment happy-dom
import { describe, bench } from 'vitest';
import { buildFullReport } from '@/adapters/checkmyfile/__tests__/fixtures/full-report';
import { extract } from '@/adapters/checkmyfile/extractor';

describe('Extraction benchmarks', () => {
  bench('standard report extraction', async () => {
    buildFullReport(document);
    await extract(document, 'checkmyfile', '1.0.0');
  });

  bench('large report extraction (5x build)', async () => {
    // Build the report multiple times to populate the DOM with more data
    for (let i = 0; i < 5; i++) {
      buildFullReport(document);
    }
    await extract(document, 'checkmyfile', '1.0.0');
  });
});
