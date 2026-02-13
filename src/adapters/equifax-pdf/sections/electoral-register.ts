/**
 * Parses Section 3 (Electoral Register) of the Equifax PDF report.
 *
 * Extracts electoral registration entries grouped by address context
 * (Current, Previous, Linked). Each entry includes surname, first name,
 * date range, changes, and date of birth.
 */

import type { RawField, RawSection } from '../../types';
import { splitIntoBlocks } from '../line-utils';

/**
 * Parse Section 3 lines into RawSection(s) for the electoral roll.
 *
 * @param lines - The lines belonging to Section 3 (after the section header)
 * @returns Array of RawSection objects for the electoral_roll domain
 */
export function parseElectoralRegister(lines: string[]): RawSection[] {
  const allText = lines.join('\n');
  if (allText.includes('No data present') && !allText.includes('Surname')) {
    return [];
  }

  const sections: RawSection[] = [];
  let currentContext = 'current'; // current | previous_N | linked_N
  let entryIndex = 0;

  const blocks = splitIntoBlocks(lines);
  let i = 0;

  while (i < blocks.length) {
    const blockText = blocks[i]!.join(' ').trim();

    // Detect address context changes
    if (blockText === 'Electoral Register at Current Address') {
      currentContext = 'current';
      i++;
      continue;
    }
    if (blockText === 'Electoral Register at Previous Addresses') {
      currentContext = 'previous';
      i++;
      continue;
    }
    if (blockText === 'Electoral Register at Linked Addresses') {
      currentContext = 'linked';
      i++;
      continue;
    }

    // Detect numbered sub-addresses
    const prevMatch = /^Previous Address (\d+)$/i.exec(blockText);
    if (prevMatch) {
      currentContext = `previous_${prevMatch[1]}`;
      i++;
      continue;
    }
    const linkedMatch = /^Linked Address (\d+)$/i.exec(blockText);
    if (linkedMatch) {
      currentContext = `linked_${linkedMatch[1]}`;
      i++;
      continue;
    }

    // Skip explanatory/intro text
    if (
      blockText.startsWith("'The electoral register") ||
      blockText.startsWith('The electoral register') ||
      blockText.startsWith("the 'open register'") ||
      blockText.startsWith('For further information') ||
      blockText.startsWith('This data has been provided') ||
      blockText.startsWith('No data present') ||
      blockText.startsWith('There is no data present')
    ) {
      i++;
      continue;
    }

    // Detect field header block: "Surname"
    if (blockText === 'Surname') {
      // Expected sequence: Surname, "First Name & Middle Initial",
      // "Dates on Electoral Register", "Changes", "Date of Birth"
      // Then values in the same order.
      const entry = parseElectoralEntry(blocks, i);
      if (entry) {
        const groupKey = `equifax:electoral:${currentContext}:${entryIndex}`;
        const fields: RawField[] = [];

        if (entry.surname) {
          fields.push({
            name: 'surname',
            value: entry.surname,
            groupKey,
            confidence: 'high',
          });
        }
        if (entry.firstName) {
          fields.push({
            name: 'first_name',
            value: entry.firstName,
            groupKey,
            confidence: 'high',
          });
        }
        if (entry.dateRange) {
          fields.push({
            name: 'date_range',
            value: entry.dateRange,
            groupKey,
            confidence: 'high',
          });
        }
        if (entry.changes) {
          fields.push({
            name: 'changes',
            value: entry.changes,
            groupKey,
            confidence: 'high',
          });
        }
        if (entry.dateOfBirth) {
          fields.push({
            name: 'date_of_birth',
            value: entry.dateOfBirth,
            groupKey,
            confidence: 'high',
          });
        }

        fields.push({
          name: 'address_context',
          value: currentContext,
          groupKey,
          confidence: 'high',
        });

        sections.push({
          domain: 'electoral_roll',
          sourceSystem: 'Equifax',
          fields,
        });

        entryIndex++;
        i = entry.nextIndex;
        continue;
      }
    }

    i++;
  }

  return sections;
}

interface ElectoralEntry {
  surname: string;
  firstName: string;
  dateRange: string;
  changes: string;
  dateOfBirth: string;
  nextIndex: number;
}

/**
 * Parse a single electoral register entry starting at the "Surname" header block.
 *
 * The pattern in the text is:
 *   Surname
 *   First Name & Middle Initial
 *   Dates on Electoral Register
 *   Changes
 *   Date of Birth
 *   [surname value]
 *   [first name value]
 *   [date range value]
 *   [changes value]
 *   [dob value]
 */
function parseElectoralEntry(
  blocks: string[][],
  startIndex: number,
): ElectoralEntry | null {
  // We expect: Surname, then header blocks, then value blocks
  // Headers: Surname, "First Name & Middle Initial", "Dates on Electoral Register", "Changes", "Date of Birth"
  // The headers may be split across multiple blocks due to line wrapping.

  const headerLabels = [
    'Surname',
    'First Name & Middle Initial',
    'Dates on Electoral Register',
    'Changes',
    'Date of Birth',
  ];

  // Consume header blocks
  let pos = startIndex;
  let headerCount = 0;

  while (pos < blocks.length && headerCount < headerLabels.length) {
    const blockText = blocks[pos]!.join(' ').trim();
    const expected = headerLabels[headerCount];

    if (blockText === expected) {
      headerCount++;
      pos++;
    } else if (
      headerCount > 0 &&
      expected &&
      blockText.startsWith(expected.split(' ')[0]!)
    ) {
      // Partial match — sometimes "Dates on Electoral" wraps to multiple blocks
      // But the join should handle this. Skip if partial.
      headerCount++;
      pos++;
    } else {
      break;
    }
  }

  if (headerCount < 3) {
    // Didn't find enough headers — not a valid entry
    return null;
  }

  // Now read the value blocks (same count as headers consumed)
  const values: string[] = [];
  for (let v = 0; v < headerCount && pos < blocks.length; v++) {
    const blockText = blocks[pos]!.join(' ').trim();

    // Stop if we hit another "Surname" header (next entry)
    if (blockText === 'Surname') break;
    // Stop if we hit address context headers
    if (
      blockText.startsWith('Electoral Register at') ||
      /^(Previous|Linked) Address \d+$/i.test(blockText)
    ) {
      break;
    }

    values.push(blockText);
    pos++;
  }

  return {
    surname: values[0] ?? '',
    firstName: values[1] ?? '',
    dateRange: values[2] ?? '',
    changes: values[3] ?? 'N/A',
    dateOfBirth: values[4] ?? 'N/A',
    nextIndex: pos,
  };
}
