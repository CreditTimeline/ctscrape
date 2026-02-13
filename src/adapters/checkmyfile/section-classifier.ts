import { SELECTORS, SECTION_HEADINGS } from './constants';

export type SectionType =
  | 'intro'
  | 'active_accounts'
  | 'closed_accounts'
  | 'addresses'
  | 'associations'
  | 'aliases'
  | 'hard_searches'
  | 'soft_searches'
  | 'unknown';

export interface ClassifiedSection {
  type: SectionType;
  element: Element;
  index: number;
}

const HEADING_TO_TYPE: Record<string, SectionType> = {
  [SECTION_HEADINGS.ACTIVE_ACCOUNTS]: 'active_accounts',
  [SECTION_HEADINGS.CLOSED_ACCOUNTS]: 'closed_accounts',
  [SECTION_HEADINGS.ADDRESSES]: 'addresses',
  [SECTION_HEADINGS.ASSOCIATIONS]: 'associations',
  [SECTION_HEADINGS.ALIASES]: 'aliases',
  [SECTION_HEADINGS.HARD_SEARCHES]: 'hard_searches',
  [SECTION_HEADINGS.SOFT_SEARCHES]: 'soft_searches',
};

/**
 * Classify all printable-report-page-container sections on the page.
 * Sections inherit the type of the last heading seen.
 */
export function classifySections(doc: Document): ClassifiedSection[] {
  const containers = doc.querySelectorAll(
    `[data-testid="${SELECTORS.PAGE_CONTAINER}"]`,
  );

  const results: ClassifiedSection[] = [];
  let currentType: SectionType = 'unknown';

  for (let i = 0; i < containers.length; i++) {
    const el = containers[i]!;

    // Check for intro heading (first section typically)
    const introHeading = el.querySelector(
      `[data-testid="${SELECTORS.INTRO_HEADING}"]`,
    );
    if (introHeading) {
      results.push({ type: 'intro', element: el, index: i });
      continue;
    }

    // Check for a page heading that determines section type
    const pageHeading = el.querySelector(
      `[data-testid="${SELECTORS.PAGE_HEADING}"]`,
    );
    if (pageHeading) {
      const text = pageHeading.textContent?.trim() ?? '';
      const mapped = HEADING_TO_TYPE[text];
      if (mapped) {
        currentType = mapped;
      } else {
        currentType = 'unknown';
      }
    }
    // If no heading, inherit currentType from the previous heading

    results.push({ type: currentType, element: el, index: i });
  }

  return results;
}
