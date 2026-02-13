import type { ClassifiedSection } from '../section-classifier';
import type { RawSection } from '../../types';
import { CRA_NAMES, SELECTORS, tableDataTestId, ASSOCIATION_FIELD_SLUGS } from '../constants';
import { extractCellText } from '../parsers';

export function extractAssociations(sections: ClassifiedSection[]): RawSection[] {
  const results: RawSection[] = [];

  for (const section of sections) {
    if (section.type !== 'associations') continue;

    const tables = section.element.querySelectorAll(
      `[data-testid="${SELECTORS.ASSOCIATIONS_TABLE}"]`,
    );

    for (let tableIndex = 0; tableIndex < tables.length; tableIndex++) {
      const table = tables[tableIndex]!;

      // Get heading text
      const headingEl = table
        .closest('div')
        ?.querySelector(
          `[data-testid="${SELECTORS.ASSOCIATIONS_TABLE_HEADING}"]`,
        ) ??
        section.element.querySelectorAll(
          `[data-testid="${SELECTORS.ASSOCIATIONS_TABLE_HEADING}"]`,
        )[tableIndex] ??
        null;
      const headingText = extractCellText(headingEl);

      for (const cra of CRA_NAMES) {
        // Check if the CRA has data by looking at the primary field
        const primaryCell = table.querySelector(
          `[data-testid="${tableDataTestId(cra, 'associated-to')}"]`,
        );
        const primaryText = extractCellText(primaryCell);
        if (primaryText === null) continue;

        const groupKey = `assoc-${tableIndex}-${cra}`;
        const fields: RawSection['fields'] = [];

        // Extract all association fields
        for (const slug of ASSOCIATION_FIELD_SLUGS) {
          const cellEl = table.querySelector(
            `[data-testid="${tableDataTestId(cra, slug)}"]`,
          );
          const cellText = extractCellText(cellEl);
          if (cellText !== null) {
            fields.push({
              name: slug,
              value: cellText,
              groupKey,
              confidence: 'high',
            });
          }
        }

        if (headingText) {
          fields.push({
            name: 'heading',
            value: headingText,
            groupKey,
            confidence: 'high',
          });
        }

        results.push({
          domain: 'financial_associates',
          sourceSystem: cra,
          fields,
        });
      }
    }
  }

  return results;
}
