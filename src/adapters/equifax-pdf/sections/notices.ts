/**
 * Parses Section 6 (Notice of Correction) of the Equifax PDF report.
 *
 * Handles the "No data present" sentinel and extracts any notices
 * of correction. In most reports, this section contains no data.
 */

import type { RawSection } from '../../types';
import { splitIntoBlocks } from '../line-utils';

/**
 * Parse Section 6 lines into RawSection(s) for notices of correction.
 *
 * @param lines - The lines belonging to Section 6 (after the section header)
 * @returns Array of RawSection objects for the notices_of_correction domain
 */
export function parseNotices(lines: string[]): RawSection[] {
  const blocks = splitIntoBlocks(lines);

  const hasData = blocks.some((block) => {
    const text = block.join(' ').trim();
    return (
      text !== 'No data present' &&
      !text.startsWith('There is no data present') &&
      !text.startsWith('This is a statement') &&
      !text.startsWith('missed repayments') &&
      !text.startsWith('ill health') &&
      !text.startsWith('Equifax may occasionally') ||
      text.startsWith('to advise that an entry') &&
      !text.startsWith('your query or dispute') &&
      !text.startsWith('Current Address') &&
      !text.startsWith('Previous Addresses') &&
      !text.startsWith('Linked Addresses') &&
      text.length > 0
    );
  });

  if (!hasData) {
    return [];
  }

  // If there are notices, extract them. Full notice text parsing can be
  // implemented when sample data with actual notices is available.
  return [
    {
      domain: 'notices_of_correction',
      sourceSystem: 'Equifax',
      fields: [
        {
          name: 'has_notices',
          value: 'true',
          groupKey: 'equifax:notice:0',
          confidence: 'high',
        },
      ],
    },
  ];
}
