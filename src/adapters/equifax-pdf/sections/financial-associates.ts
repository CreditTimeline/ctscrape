/**
 * Parses Section 2 (Financial Associates) of the Equifax PDF report.
 *
 * Extracts associate information including name data, and handles
 * the "No data present" sentinel.
 */

import type { RawField, RawSection } from '../../types';
import { splitIntoBlocks } from '../line-utils';

/**
 * Parse Section 2 lines into RawSection(s) for financial associates.
 *
 * @param lines - The lines belonging to Section 2 (after the section header)
 * @returns Array of RawSection objects for the financial_associates domain
 */
export function parseFinancialAssociates(lines: string[]): RawSection[] {
  const allText = lines.join('\n');

  // Check for "No data present" sentinel
  if (allText.includes('No data present')) {
    // Check if there's any actual associate data before the "No data present"
    // (the Alias section has "No data present" but Associate section may have data)
    if (!allText.includes('Surname')) {
      return [];
    }
  }

  const sections: RawSection[] = [];
  const blocks = splitIntoBlocks(lines);

  // Find associate data blocks
  // Pattern: "Surname" block, then value, "Title, First Name & Middle Initial" block, then value
  let associateIndex = 0;
  let inAssociateInfo = false;

  for (let i = 0; i < blocks.length; i++) {
    const blockText = blocks[i]!.join(' ').trim();

    if (blockText === 'Associate Information') {
      inAssociateInfo = true;
      continue;
    }

    if (blockText === 'Alias Information') {
      inAssociateInfo = false;
      continue;
    }

    if (!inAssociateInfo) continue;

    // Skip explanatory text
    if (
      blockText.startsWith('These are the people') ||
      blockText.startsWith('Lenders may view') ||
      blockText.startsWith('Financial associate links') ||
      blockText.startsWith('an account has been')
    ) {
      continue;
    }

    if (blockText === 'Surname') {
      // Next block should be "Title, First Name & Middle Initial"
      // Then surname value, then title+name value
      const titleBlock =
        i + 1 < blocks.length ? blocks[i + 1]!.join(' ').trim() : '';

      if (titleBlock === 'Title, First Name & Middle Initial') {
        // Get values
        const surnameValue =
          i + 2 < blocks.length ? blocks[i + 2]!.join(' ').trim() : '';
        const nameValue =
          i + 3 < blocks.length ? blocks[i + 3]!.join(' ').trim() : '';

        if (surnameValue && nameValue) {
          const groupKey = `equifax:associate:${associateIndex}`;
          const fields: RawField[] = [
            {
              name: 'surname',
              value: surnameValue,
              groupKey,
              confidence: 'high',
            },
            {
              name: 'full_name',
              value: nameValue,
              groupKey,
              confidence: 'high',
            },
          ];

          sections.push({
            domain: 'financial_associates',
            sourceSystem: 'Equifax',
            fields,
          });

          associateIndex++;
          i += 3; // Skip past the consumed blocks
        }
      }
    }
  }

  return sections;
}
