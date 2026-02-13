// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { extract } from '../extractor';
import { buildFullReport } from './fixtures/full-report';

describe('extract (integration)', () => {
  it('extracts all section types from a complete report', async () => {
    buildFullReport(document);

    const result = await extract(document, 'checkmyfile', '0.1.0');

    // Metadata
    expect(result.metadata.adapterId).toBe('checkmyfile');
    expect(result.metadata.adapterVersion).toBe('0.1.0');
    expect(result.metadata.extractedAt).toBeTruthy();
    expect(result.metadata.htmlHash).toBe(''); // Set by content script
    expect(result.metadata.sourceSystemsFound).toEqual(
      expect.arrayContaining(['Equifax', 'Experian', 'TransUnion']),
    );

    // Sections exist for all domains
    const domains = [...new Set(result.sections.map((s) => s.domain))];
    expect(domains).toContain('credit_scores');
    expect(domains).toContain('tradelines');
    expect(domains).toContain('addresses');
    expect(domains).toContain('financial_associates');
    expect(domains).toContain('personal_info');
    expect(domains).toContain('searches');
    expect(domains).toContain('electoral_roll');
  });

  it('produces correct count of tradeline sections', async () => {
    const summary = buildFullReport(document);

    const result = await extract(document, 'checkmyfile', '0.1.0');

    const tradelines = result.sections.filter((s) => s.domain === 'tradelines');
    // 2 active accounts * 3 CRAs + 1 closed account * 2 CRAs (TransUnion has no data)
    expect(tradelines.length).toBe(
      summary.activeAccountCount * 3 + summary.closedAccountCount * 2,
    );
  });

  it('marks closed accounts with is_closed=true', async () => {
    buildFullReport(document);

    const result = await extract(document, 'checkmyfile', '0.1.0');

    const tradelines = result.sections.filter((s) => s.domain === 'tradelines');
    const closedTradelines = tradelines.filter(
      (s) => s.fields.find((f) => f.name === 'is_closed')?.value === 'true',
    );
    const activeTradelines = tradelines.filter(
      (s) => s.fields.find((f) => f.name === 'is_closed')?.value === 'false',
    );

    expect(closedTradelines.length).toBeGreaterThan(0);
    expect(activeTradelines.length).toBeGreaterThan(0);
  });

  it('produces search sections from hard and soft searches', async () => {
    const summary = buildFullReport(document);

    const result = await extract(document, 'checkmyfile', '0.1.0');

    const searches = result.sections.filter((s) => s.domain === 'searches');
    expect(searches).toHaveLength(
      summary.hardSearchCount + summary.softSearchCount,
    );

    // Hard searches
    const hardSearches = searches.filter((s) =>
      s.fields.some((f) => f.name === 'search_type' && f.value === 'hard'),
    );
    expect(hardSearches).toHaveLength(summary.hardSearchCount);

    // Soft searches
    const softSearches = searches.filter((s) =>
      s.fields.some((f) => f.name === 'search_type' && f.value === 'soft'),
    );
    expect(softSearches).toHaveLength(summary.softSearchCount);
  });

  it('produces exactly one credit_scores section', async () => {
    buildFullReport(document);

    const result = await extract(document, 'checkmyfile', '0.1.0');

    const scores = result.sections.filter((s) => s.domain === 'credit_scores');
    expect(scores).toHaveLength(1);
    expect(scores[0]!.sourceSystem).toBeNull();
    expect(scores[0]!.fields[0]!.value).toBe('742');
  });

  it('produces address and electoral_roll sections', async () => {
    const summary = buildFullReport(document);

    const result = await extract(document, 'checkmyfile', '0.1.0');

    const addressSections = result.sections.filter(
      (s) => s.domain === 'addresses',
    );
    // 2 addresses * 3 CRAs each
    expect(addressSections.length).toBe(summary.addressCount * 3);

    const electoralSections = result.sections.filter(
      (s) => s.domain === 'electoral_roll',
    );
    // 2 addresses * 2 CRAs with electoral data (Experian, Equifax have "Registered")
    expect(electoralSections.length).toBe(summary.addressCount * 2);
  });

  it('includes payment history fields in tradeline sections', async () => {
    buildFullReport(document);

    const result = await extract(document, 'checkmyfile', '0.1.0');

    const activeTradelines = result.sections.filter(
      (s) =>
        s.domain === 'tradelines' &&
        s.fields.find((f) => f.name === 'is_closed')?.value === 'false',
    );

    // At least some should have payment history
    const withPH = activeTradelines.filter((s) =>
      s.fields.some((f) => f.name.startsWith('payment_history_')),
    );
    expect(withPH.length).toBeGreaterThan(0);
  });

  it('all fields have groupKey and confidence set', async () => {
    buildFullReport(document);

    const result = await extract(document, 'checkmyfile', '0.1.0');

    for (const section of result.sections) {
      for (const field of section.fields) {
        expect(field.groupKey).toBeTruthy();
        expect(['high', 'medium', 'low']).toContain(field.confidence);
      }
    }
  });

  it('returns empty sections for empty document', async () => {
    document.body.innerHTML = '';

    const result = await extract(document, 'checkmyfile', '0.1.0');

    expect(result.sections).toHaveLength(0);
    expect(result.metadata.sourceSystemsFound).toHaveLength(0);
  });
});
