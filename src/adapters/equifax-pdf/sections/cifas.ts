/**
 * Parses Section 10 (CIFAS - UK Fraud Prevention Service) of the Equifax PDF report.
 *
 * CIFAS records indicate fraud markers, protective registrations, or
 * victim of impersonation entries. Most reports show "No data present".
 */

import type { RawSection } from '../../types';
import { splitIntoBlocks } from '../line-utils';

/**
 * Parse Section 10 lines into RawSection(s) for CIFAS fraud markers.
 *
 * @param lines - The lines belonging to Section 10 (after the section header)
 * @returns Array of RawSection objects for the fraud_markers domain
 */
export function parseCifas(lines: string[]): RawSection[] {
  const blocks = splitIntoBlocks(lines);

  const hasData = blocks.some((block) => {
    const text = block.join(' ').trim();
    return (
      text !== 'No data present' &&
      !text.startsWith('There is no data present') &&
      !text.startsWith('Equifax and the other credit') &&
      !text.startsWith('When an organisation believes') &&
      !text.startsWith('marker on the relevant') &&
      !text.startsWith('any further fraud') &&
      !text.startsWith('Individuals can also') ||
      text.startsWith('believe they may be') &&
      !text.startsWith('The Cifas warnings') &&
      !text.startsWith('Protective Registration') &&
      !text.startsWith('Cifas may record') &&
      !text.startsWith('Subject Access Request') &&
      !text.startsWith('For further information') &&
      !text.startsWith('CIFAS Records at') &&
      text.length > 0
    );
  });

  if (!hasData) {
    return [];
  }

  // Placeholder for actual CIFAS record parsing
  return [
    {
      domain: 'fraud_markers',
      sourceSystem: 'Equifax',
      fields: [
        {
          name: 'has_cifas_records',
          value: 'true',
          groupKey: 'equifax:cifas:0',
          confidence: 'high',
        },
      ],
    },
  ];
}
