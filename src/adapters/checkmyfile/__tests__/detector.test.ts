// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { detect, getPageInfo } from '../detector';
import { SELECTORS } from '../constants';

/** Build a minimal DOM that looks like a CheckMyFile download report page. */
function buildReportDom(options?: {
  footerText?: string;
  containerCount?: number;
  omitFooter?: boolean;
}): Document {
  const doc = document.implementation.createHTMLDocument('Test');

  const count = options?.containerCount ?? 1;
  for (let i = 0; i < count; i++) {
    const section = doc.createElement('section');
    section.setAttribute('data-testid', SELECTORS.PAGE_CONTAINER);
    doc.body.appendChild(section);
  }

  if (!options?.omitFooter) {
    const footer = doc.createElement('footer');
    footer.setAttribute('data-testid', SELECTORS.FOOTER);

    const small = doc.createElement('small');
    small.setAttribute('data-testid', SELECTORS.FOOTER_REPORT_INFO);
    small.textContent =
      options?.footerText ?? 'Produced for Jane Doe on 13 February 2026';
    footer.appendChild(small);
    doc.body.appendChild(footer);
  }

  return doc;
}

describe('detect', () => {
  it('returns true when all conditions are met', () => {
    const doc = buildReportDom();
    expect(detect(doc, 'https://www.checkmyfile.com/download')).toBe(true);
  });

  it('returns true with multiple containers', () => {
    const doc = buildReportDom({ containerCount: 5 });
    expect(detect(doc, 'https://www.checkmyfile.com/download')).toBe(true);
  });

  it('returns false when URL path is not /download', () => {
    const doc = buildReportDom();
    expect(detect(doc, 'https://www.checkmyfile.com/dashboard')).toBe(false);
  });

  it('returns false when URL path is a subpath of /download', () => {
    const doc = buildReportDom();
    expect(detect(doc, 'https://www.checkmyfile.com/download/pdf')).toBe(
      false,
    );
  });

  it('returns false when no page containers exist', () => {
    const doc = buildReportDom({ containerCount: 0 });
    expect(detect(doc, 'https://www.checkmyfile.com/download')).toBe(false);
  });

  it('returns false when footer is missing', () => {
    const doc = buildReportDom({ omitFooter: true });
    expect(detect(doc, 'https://www.checkmyfile.com/download')).toBe(false);
  });

  it('returns false when both containers and footer are missing', () => {
    const doc = buildReportDom({ containerCount: 0, omitFooter: true });
    expect(detect(doc, 'https://www.checkmyfile.com/download')).toBe(false);
  });
});

describe('getPageInfo', () => {
  it('extracts subject name and report date from footer', () => {
    const doc = buildReportDom({
      footerText: 'Produced for Alexander Hamilton on 4 July 2026',
    });
    const info = getPageInfo(doc);
    expect(info).toEqual({
      siteName: 'CheckMyFile',
      subjectName: 'Alexander Hamilton',
      reportDate: '2026-07-04',
      providers: ['Experian', 'Equifax', 'TransUnion'],
    });
  });

  it('handles single-digit day correctly', () => {
    const doc = buildReportDom({
      footerText: 'Produced for Maria Chen on 1 January 2025',
    });
    const info = getPageInfo(doc);
    expect(info.reportDate).toBe('2025-01-01');
    expect(info.subjectName).toBe('Maria Chen');
  });

  it('handles names with multiple parts', () => {
    const doc = buildReportDom({
      footerText:
        'Produced for Jean-Claude Van Damme on 15 September 2025',
    });
    const info = getPageInfo(doc);
    expect(info.subjectName).toBe('Jean-Claude Van Damme');
    expect(info.reportDate).toBe('2025-09-15');
  });

  it('returns base info when footer is missing', () => {
    const doc = buildReportDom({ omitFooter: true });
    const info = getPageInfo(doc);
    expect(info).toEqual({
      siteName: 'CheckMyFile',
      providers: ['Experian', 'Equifax', 'TransUnion'],
    });
    expect(info.subjectName).toBeUndefined();
    expect(info.reportDate).toBeUndefined();
  });

  it('returns base info when footer text does not match pattern', () => {
    const doc = buildReportDom({ footerText: 'Some unexpected text format' });
    const info = getPageInfo(doc);
    expect(info.subjectName).toBeUndefined();
    expect(info.reportDate).toBeUndefined();
    expect(info.siteName).toBe('CheckMyFile');
    expect(info.providers).toEqual(['Experian', 'Equifax', 'TransUnion']);
  });

  it('always includes all three providers', () => {
    const doc = buildReportDom();
    const info = getPageInfo(doc);
    expect(info.providers).toHaveLength(3);
    expect(info.providers).toContain('Experian');
    expect(info.providers).toContain('Equifax');
    expect(info.providers).toContain('TransUnion');
  });
});
