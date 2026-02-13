import { SELECTORS, CRA_NAMES } from './constants';
import { parseLongDate } from './parsers';
import type { PageInfo } from '../types';

const FOOTER_RE = /^Produced for (.+) on (\d{1,2} \w+ \d{4})$/;

/**
 * Detect if the current page is a CheckMyFile downloadable report.
 * Checks:
 * 1. URL path is /download
 * 2. DOM has at least one printable-report-page-container section
 * 3. Footer with report generation info exists
 */
export function detect(document: Document, url?: string): boolean {
  const pathname = url ? new URL(url).pathname : document.location?.pathname;
  if (pathname !== '/download') return false;

  const containers = document.querySelectorAll(
    `[data-testid="${SELECTORS.PAGE_CONTAINER}"]`,
  );
  if (containers.length === 0) return false;

  const footer = document.querySelector(
    `[data-testid="${SELECTORS.FOOTER_REPORT_INFO}"]`,
  );
  return footer !== null;
}

/**
 * Extract basic page info from the report page.
 * Parses the footer text "Produced for {name} on {date}" from the first
 * footer-report-generation-info element.
 */
export function getPageInfo(document: Document): PageInfo {
  const info: PageInfo = {
    siteName: 'CheckMyFile',
    providers: [...CRA_NAMES],
  };

  const footer = document.querySelector(
    `[data-testid="${SELECTORS.FOOTER_REPORT_INFO}"]`,
  );
  if (!footer) return info;

  const text = (footer.textContent ?? '').trim();
  const match = text.match(FOOTER_RE);
  if (!match) return info;

  const [, name, dateStr] = match;
  info.subjectName = name;
  if (dateStr) {
    const parsed = parseLongDate(dateStr);
    if (parsed) {
      info.reportDate = parsed;
    }
  }

  return info;
}
