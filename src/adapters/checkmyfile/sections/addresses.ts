import type { ClassifiedSection } from '../section-classifier';
import type { RawSection } from '../../types';
import { CRA_NAMES, SELECTORS, tableDataTestId } from '../constants';
import { extractCellText } from '../parsers';

export function extractAddresses(sections: ClassifiedSection[]): RawSection[] {
  const results: RawSection[] = [];

  for (const section of sections) {
    if (section.type !== 'addresses') continue;

    const tables = section.element.querySelectorAll(
      `[data-testid="${SELECTORS.ADDRESSES_TABLE}"]`,
    );

    for (let tableIndex = 0; tableIndex < tables.length; tableIndex++) {
      const table = tables[tableIndex]!;

      // Get heading text
      const headingEl =
        table
          .closest('div')
          ?.querySelector(
            `[data-testid="${SELECTORS.ADDRESSES_TABLE_HEADING}"]`,
          ) ??
        section.element.querySelectorAll(
          `[data-testid="${SELECTORS.ADDRESSES_TABLE_HEADING}"]`,
        )[tableIndex] ??
        null;
      const headingText = extractCellText(headingEl);

      for (const cra of CRA_NAMES) {
        // Check if the CRA has address data
        const addressCell = table.querySelector(
          `[data-testid="${tableDataTestId(cra, 'address')}"]`,
        );
        const addressText = extractCellText(addressCell);
        if (addressText === null || addressText === '-') continue;

        const addressGroupKey = `address-${tableIndex}-${cra}`;
        const addressFields: RawSection['fields'] = [];

        // Address fields
        addressFields.push({
          name: 'address',
          value: addressText,
          groupKey: addressGroupKey,
          confidence: 'high',
        });

        const nameText = extractCellText(
          table.querySelector(`[data-testid="${tableDataTestId(cra, 'name')}"]`),
        );
        if (nameText) {
          addressFields.push({
            name: 'name',
            value: nameText,
            groupKey: addressGroupKey,
            confidence: 'high',
          });
        }

        const marketingText = extractCellText(
          table.querySelector(
            `[data-testid="${tableDataTestId(cra, 'marketing-status')}"]`,
          ),
        );
        if (marketingText) {
          addressFields.push({
            name: 'marketing-status',
            value: marketingText,
            groupKey: addressGroupKey,
            confidence: 'high',
          });
        }

        const linkedText = extractCellText(
          table.querySelector(
            `[data-testid="${tableDataTestId(cra, 'linked-address')}"]`,
          ),
        );
        if (linkedText) {
          addressFields.push({
            name: 'linked-address',
            value: linkedText,
            groupKey: addressGroupKey,
            confidence: 'high',
          });
        }

        if (headingText) {
          addressFields.push({
            name: 'heading',
            value: headingText,
            groupKey: addressGroupKey,
            confidence: 'high',
          });
        }

        results.push({
          domain: 'addresses',
          sourceSystem: cra,
          fields: addressFields,
        });

        // Electoral roll section — skip placeholder "-" values
        const electoralText = extractCellText(
          table.querySelector(
            `[data-testid="${tableDataTestId(cra, 'electoral-roll')}"]`,
          ),
        );
        if (electoralText && electoralText !== '-') {
          results.push({
            domain: 'electoral_roll',
            sourceSystem: cra,
            fields: [
              {
                name: 'electoral-roll',
                value: electoralText,
                groupKey: `electoral-${tableIndex}-${cra}`,
                confidence: 'high',
              },
            ],
          });
        }
      }
    }
  }

  return results;
}
