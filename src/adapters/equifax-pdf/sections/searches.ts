/**
 * Parses Section 7 (Searches) of the Equifax PDF report.
 *
 * Extracts hard and soft searches with company names, dates, personal
 * details, search types, and joint application status.
 *
 * The pdftotext output format for searches is complex because:
 * - Page headers can split entries mid-field
 * - Some entries have date + "Surname" on adjacent lines (no blank separator)
 * - Company names can span multiple lines
 * - Column headers and values alternate with blank lines
 */

import type { RawField, RawSection } from '../../types';
import { DATE_RE } from '../constants';
import { splitIntoBlocks } from '../line-utils';

/** Type of search */
type SearchType = 'hard' | 'soft';

/** Parsed search entry */
interface SearchEntry {
  searchType: SearchType;
  date: string;
  company: string;
  surname: string;
  forename: string;
  dob: string;
  searchPurpose: string;
  jointApplication: string;
}

/**
 * Parse Section 7 lines into RawSection(s) for the searches domain.
 *
 * @param lines - The lines belonging to Section 7 (after the section header)
 * @returns Array of RawSection objects for the searches domain
 */
export function parseSearches(lines: string[]): RawSection[] {
  const allText = lines.join('\n');
  if (allText.includes('No data present') && !allText.includes('Surname')) {
    return [];
  }

  const entries = extractSearchEntries(lines);
  const sections: RawSection[] = [];

  const hardIndex = { value: 0 };
  const softIndex = { value: 0 };

  for (const entry of entries) {
    const idx =
      entry.searchType === 'hard' ? hardIndex : softIndex;
    const groupKey = `equifax:search:${entry.searchType}:${idx.value}`;

    const fields: RawField[] = [
      {
        name: 'search_type',
        value: entry.searchType,
        groupKey,
        confidence: 'high',
      },
      {
        name: 'date',
        value: entry.date,
        groupKey,
        confidence: 'high',
      },
      {
        name: 'company',
        value: entry.company,
        groupKey,
        confidence: 'high',
      },
    ];

    if (entry.surname || entry.forename) {
      fields.push({
        name: 'name',
        value: `${entry.surname} ${entry.forename}`.trim(),
        groupKey,
        confidence: 'high',
      });
    }

    if (entry.dob) {
      fields.push({
        name: 'dob',
        value: entry.dob,
        groupKey,
        confidence: 'high',
      });
    }

    if (entry.searchPurpose) {
      fields.push({
        name: 'search_purpose',
        value: entry.searchPurpose,
        groupKey,
        confidence: 'high',
      });
    }

    fields.push({
      name: 'joint_application',
      value: entry.jointApplication,
      groupKey,
      confidence: 'high',
    });

    sections.push({
      domain: 'searches',
      sourceSystem: 'Equifax',
      fields,
    });

    idx.value++;
  }

  return sections;
}

/**
 * Extract search entries from section 7 lines.
 *
 * Search entries come in two main formats:
 *
 * Format A (normal - with blank line between date and company):
 *   DD/MM/YYYY
 *   <blank>
 *   COMPANY NAME
 *   [continuation lines]
 *   <blank>
 *   Surname
 *   ...
 *
 * Format B (compact - date directly followed by "Surname"):
 *   DD/MM/YYYY
 *   Surname
 *   <blank>
 *   COMPANY NAME
 *   ...
 *
 * In both formats, the field headers (Surname, Forename & Middle Initial,
 * Date of birth, Search Type, Joint Application) are followed by their values.
 */
function extractSearchEntries(lines: string[]): SearchEntry[] {
  const entries: SearchEntry[] = [];
  let currentSearchType: SearchType = 'hard';
  // Build blocks, but also track which blocks had certain special patterns
  const blocks = splitIntoBlocks(lines);

  let i = 0;
  while (i < blocks.length) {
    const blockText = blocks[i]!.join(' ').trim();

    // Detect search type boundaries
    if (blockText === 'Hard Searches') {
      currentSearchType = 'hard';
      i++;
      continue;
    }
    if (blockText === 'Soft Searches') {
      currentSearchType = 'soft';
      i++;
      continue;
    }

    // Detect address contexts
    if (
      blockText === 'Current Address' ||
      blockText === 'Previous Addresses' ||
      blockText === 'Linked Addresses' ||
      /^(Previous|Linked) Address \d+$/i.test(blockText)
    ) {
      i++;
      continue;
    }

    // Skip "No data present" blocks
    if (
      blockText === 'No data present' ||
      blockText.startsWith('There is no data present')
    ) {
      i++;
      continue;
    }

    // Skip explanatory text
    if (
      blockText.startsWith('When you apply for credit') ||
      blockText.startsWith('Common reasons are') ||
      blockText.startsWith('We refer to credit application') ||
      blockText.startsWith('Debt collection searches') ||
      blockText.startsWith('For further information on searches')
    ) {
      i++;
      continue;
    }

    // Try to parse a search entry starting at this block
    const result = tryParseSearchEntry(blocks, i, currentSearchType);
    if (result) {
      entries.push(result.entry);
      i = result.nextIndex;
      continue;
    }

    i++;
  }

  return entries;
}

/**
 * Try to parse a search entry starting at the given block index.
 * Returns the parsed entry and the next block index, or null if not a search entry.
 */
function tryParseSearchEntry(
  blocks: string[][],
  startIndex: number,
  searchType: SearchType,
): { entry: SearchEntry; nextIndex: number } | null {
  let pos = startIndex;
  const blockText = blocks[pos]!.join(' ').trim();

  // A search entry typically starts with a date
  if (!DATE_RE.test(blockText)) return null;

  const date = blockText;
  pos++;

  if (pos >= blocks.length) return null;

  // Next block could be company name or could be column headers
  // In the compact format, date is followed directly by "Surname" on the same block
  // But in our block splitting, that would be separate blocks.

  let company = '';
  let surname = '';
  let forename = '';
  let dob = '';
  let searchPurpose = '';
  let jointApplication = 'No';

  // Look for the company name and field headers
  // Company name appears either before or after the column headers
  let foundSurname = false;
  let headerPhase = false;
  let valuePhase = false;
  const headerOrder: string[] = [];
  const values: string[] = [];

  while (pos < blocks.length) {
    const bt = blocks[pos]!.join(' ').trim();

    // Stop if we hit another date (next entry)
    if (DATE_RE.test(bt) && values.length > 0) break;

    // Stop if we hit a section boundary
    if (
      bt === 'Hard Searches' ||
      bt === 'Soft Searches' ||
      bt === 'Current Address' ||
      bt === 'Previous Addresses' ||
      bt === 'Linked Addresses' ||
      /^(Previous|Linked) Address \d+$/i.test(bt)
    ) {
      break;
    }

    // Skip "No data present" blocks
    if (
      bt === 'No data present' ||
      bt.startsWith('There is no data present')
    ) {
      pos++;
      continue;
    }

    // Detect column header "Surname"
    if (bt === 'Surname') {
      if (!foundSurname) {
        foundSurname = true;
        headerPhase = true;
        headerOrder.push('Surname');
        pos++;
        continue;
      }
    }

    if (headerPhase) {
      // Collect remaining headers
      if (
        bt === 'Forename & Middle Initial' ||
        bt === 'Forename &' ||
        bt.startsWith('Forename')
      ) {
        headerOrder.push('Forename');
        pos++;
        continue;
      }
      if (bt === 'Middle Initial') {
        // continuation of "Forename & Middle Initial"
        pos++;
        continue;
      }
      if (bt === 'Date of birth') {
        headerOrder.push('DOB');
        pos++;
        continue;
      }
      if (bt === 'Search Type') {
        headerOrder.push('SearchType');
        pos++;
        continue;
      }
      if (bt === 'Joint Application') {
        headerOrder.push('JointApp');
        headerPhase = false;
        valuePhase = true;
        pos++;
        continue;
      }
      if (bt === 'Application') {
        // "Joint" + "Application" split across blocks
        headerOrder.push('JointApp');
        headerPhase = false;
        valuePhase = true;
        pos++;
        continue;
      }
      if (bt === 'Joint') {
        // Next block should be "Application"
        pos++;
        continue;
      }

      // If we're still in header phase but don't recognize the block,
      // it might be the company name that appeared between date and headers
      if (!company && headerOrder.length <= 1) {
        company = bt;
        pos++;
        continue;
      }

      // Unrecognized header block — might be end of headers
      headerPhase = false;
      valuePhase = true;
    }

    if (valuePhase) {
      // Collect values in order matching headers
      if (values.length < headerOrder.length) {
        // Check if this looks like a date (next entry) — stop
        if (DATE_RE.test(bt) && values.length >= 3) break;

        values.push(bt);
        pos++;
        continue;
      }

      // All values collected — we might have a date for the next entry
      break;
    }

    // Before finding "Surname", this block is likely the company name
    if (!foundSurname) {
      if (!company) {
        company = bt;
      } else {
        // Multi-line company name
        company += ' ' + bt;
      }
    }

    pos++;
  }

  // Map values to fields based on header order
  for (let v = 0; v < headerOrder.length && v < values.length; v++) {
    const header = headerOrder[v];
    const value = values[v]!;

    switch (header) {
      case 'Surname':
        surname = value;
        break;
      case 'Forename':
        forename = value;
        break;
      case 'DOB':
        dob = value;
        break;
      case 'SearchType':
        searchPurpose = value;
        break;
      case 'JointApp':
        jointApplication = value;
        break;
    }
  }

  // If we didn't get a company from before Surname, check if there's a
  // date following the values that might indicate the company was part of
  // a different pattern.
  if (!company && !surname) return null;

  // Validate we got at least a date
  if (!date) return null;

  return {
    entry: {
      searchType,
      date,
      company: company || 'Unknown',
      surname,
      forename,
      dob,
      searchPurpose,
      jointApplication,
    },
    nextIndex: pos,
  };
}
