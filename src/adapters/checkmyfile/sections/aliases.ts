import type { ClassifiedSection } from '../section-classifier';
import type { RawSection } from '../../types';
import { CRA_NAMES, SELECTORS, tableDataTestId } from '../constants';
import { extractCellText } from '../parsers';

export function extractAliases(sections: ClassifiedSection[]): RawSection[] {
  const results: RawSection[] = [];

  for (const section of sections) {
    if (section.type !== 'aliases') continue;

    const tables = section.element.querySelectorAll(
      `[data-testid="${SELECTORS.ALIASES_TABLE}"]`,
    );

    for (let tableIndex = 0; tableIndex < tables.length; tableIndex++) {
      const table = tables[tableIndex]!;

      // Get heading text
      const headingEl = table
        .closest('div')
        ?.querySelector(
          `[data-testid="${SELECTORS.ALIASES_TABLE_HEADING}"]`,
        ) ??
        section.element.querySelectorAll(
          `[data-testid="${SELECTORS.ALIASES_TABLE_HEADING}"]`,
        )[tableIndex] ??
        null;
      const headingText = extractCellText(headingEl);

      for (const cra of CRA_NAMES) {
        const cellEl = table.querySelector(
          `[data-testid="${tableDataTestId(cra, 'alias-name')}"]`,
        );
        const cellText = extractCellText(cellEl);
        if (cellText === null) continue;

        const groupKey = `alias-${tableIndex}-${cra}`;
        const fields: RawSection['fields'] = [
          { name: 'alias_name', value: cellText, groupKey, confidence: 'high' },
        ];

        if (headingText) {
          fields.push({
            name: 'heading',
            value: headingText,
            groupKey,
            confidence: 'high',
          });
        }

        results.push({
          domain: 'personal_info',
          sourceSystem: cra,
          fields,
        });
      }
    }
  }

  return results;
}
