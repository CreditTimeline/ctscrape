/**
 * Parses Section 9 (Gone Away Records) of the Equifax PDF report.
 *
 * The Gone Away Information Network (GAIN) tracks people who have moved
 * without providing a forwarding address. Most reports show "No data present".
 */

import type { RawSection } from '../../types';
import { splitIntoBlocks } from '../line-utils';

/**
 * Parse Section 9 lines into RawSection(s) for gone away records.
 *
 * @param lines - The lines belonging to Section 9 (after the section header)
 * @returns Array of RawSection objects (empty if no data present)
 */
export function parseGoneAway(lines: string[]): RawSection[] {
  const blocks = splitIntoBlocks(lines);

  const hasData = blocks.some((block) => {
    const text = block.join(' ').trim();
    return (
      text !== 'No data present' &&
      !text.startsWith('There is no data present') &&
      !text.startsWith('The Gone Away Information') &&
      !text.startsWith('Equifax holds records') &&
      !text.startsWith('Equifax no longer receives') &&
      !text.startsWith('Gone Away Records at') &&
      text.length > 0
    );
  });

  if (!hasData) {
    return [];
  }

  // Placeholder for actual gone away record parsing
  return [
    {
      domain: 'public_records',
      sourceSystem: 'Equifax',
      fields: [
        {
          name: 'gone_away',
          value: 'true',
          groupKey: 'equifax:gone_away:0',
          confidence: 'high',
        },
      ],
    },
  ];
}
