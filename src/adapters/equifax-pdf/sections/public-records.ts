/**
 * Parses Section 5 (Court and Other Public Records) of the Equifax PDF report.
 *
 * Handles the "No data present" sentinel and extracts any public records
 * that may exist. In most reports, this section contains no data.
 */

import type { RawSection } from '../../types';
import { splitIntoBlocks } from '../line-utils';

/**
 * Parse Section 5 lines into RawSection(s) for the public_records domain.
 *
 * @param lines - The lines belonging to Section 5 (after the section header)
 * @returns Array of RawSection objects for the public_records domain
 */
export function parsePublicRecords(lines: string[]): RawSection[] {
  // Check if entire section has no data
  const blocks = splitIntoBlocks(lines);
  const hasData = blocks.some((block) => {
    const text = block.join(' ').trim();
    return (
      text !== 'No data present' &&
      !text.startsWith('There is no data present') &&
      !text.startsWith('The government makes') &&
      !text.startsWith('For further information on court') &&
      !text.startsWith('Public Records at') &&
      text.length > 0
    );
  });

  if (!hasData) {
    return [];
  }

  // If there is data, return a placeholder section indicating records exist
  // Full parsing of public records (CCJs, IVAs, bankruptcies) can be
  // implemented when sample data is available.
  return [
    {
      domain: 'public_records',
      sourceSystem: 'Equifax',
      fields: [
        {
          name: 'has_records',
          value: 'true',
          groupKey: 'equifax:public_records:0',
          confidence: 'high',
        },
      ],
    },
  ];
}
