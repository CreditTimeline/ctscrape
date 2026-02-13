/**
 * Parses Section 1 (Personal Information) of the Equifax PDF report.
 *
 * Extracts address blocks: Current Address, Previous Addresses (numbered),
 * and Linked Addresses (numbered).
 */

import type { RawField, RawSection } from '../../types';
import { isBlankLine } from '../line-utils';

/** Address type context identifiers */
type AddressType = 'current' | 'previous' | 'linked';

interface ParsedAddress {
  type: AddressType;
  index: number;
  lines: string[];
}

/**
 * Parse Section 1 lines into RawSection(s) for personal info and addresses.
 *
 * @param lines - The lines belonging to Section 1 (after the section header)
 * @returns Array of RawSection objects for personal_info and addresses domains
 */
export function parsePersonalInfo(lines: string[]): RawSection[] {
  const addresses = extractAddresses(lines);
  const sections: RawSection[] = [];

  for (const addr of addresses) {
    const groupKey = `equifax:address:${addr.type}:${addr.index}`;
    const addressText = addr.lines
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .join(', ');

    const fields: RawField[] = [
      {
        name: 'address',
        value: addressText,
        groupKey,
        confidence: 'high',
      },
      {
        name: 'address_type',
        value: addr.type,
        groupKey,
        confidence: 'high',
      },
    ];

    sections.push({
      domain: 'addresses',
      sourceSystem: 'Equifax',
      fields,
    });
  }

  return sections;
}

/**
 * Extract address blocks from the personal info section lines.
 *
 * Address contexts are introduced by:
 * - "Current Address"
 * - "PREVIOUS ADDRESS N" or "Previous Addresses" (followed by "PREVIOUS ADDRESS N")
 * - "LINKED ADDRESS N" or "Linked Addresses" (followed by "LINKED ADDRESS N")
 *
 * Each address is a multi-line block of address lines (uppercase text, postcode).
 */
function extractAddresses(lines: string[]): ParsedAddress[] {
  const addresses: ParsedAddress[] = [];
  let currentType: AddressType | null = null;
  let currentIndex = 0;
  let collectingAddress = false;
  let currentAddressLines: string[] = [];

  const flushAddress = (): void => {
    if (
      currentType !== null &&
      currentAddressLines.length > 0
    ) {
      addresses.push({
        type: currentType,
        index: currentIndex,
        lines: [...currentAddressLines],
      });
    }
    currentAddressLines = [];
    collectingAddress = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i]!.trim();

    // Detect address context headers
    if (trimmed === 'Current Address') {
      flushAddress();
      currentType = 'current';
      currentIndex = 0;
      collectingAddress = true;
      continue;
    }

    if (trimmed === 'Previous Addresses') {
      flushAddress();
      currentType = 'previous';
      continue;
    }

    if (trimmed === 'Linked Addresses') {
      flushAddress();
      currentType = 'linked';
      // Skip the explanatory text until we find "LINKED ADDRESS N"
      continue;
    }

    // Detect numbered address sub-headers
    const prevMatch = /^PREVIOUS ADDRESS (\d+)$/i.exec(trimmed);
    if (prevMatch) {
      flushAddress();
      currentType = 'previous';
      currentIndex = parseInt(prevMatch[1]!, 10) - 1;
      collectingAddress = true;
      continue;
    }

    const linkedMatch = /^LINKED ADDRESS (\d+)$/i.exec(trimmed);
    if (linkedMatch) {
      flushAddress();
      currentType = 'linked';
      currentIndex = parseInt(linkedMatch[1]!, 10) - 1;
      collectingAddress = true;
      continue;
    }

    // Stop collecting if we hit a section that's not address data
    if (/^\d+\.\s+/.test(trimmed)) {
      flushAddress();
      break;
    }

    // Skip explanatory text blocks (sentences about linked addresses, etc.)
    if (
      trimmed.startsWith('These are the addresses') ||
      trimmed.startsWith('Linked addresses are all') ||
      trimmed.startsWith('Addresses become linked') ||
      trimmed.startsWith('You have provided') ||
      trimmed.startsWith('You tell a lender') ||
      trimmed.startsWith('We keep address links')
    ) {
      continue;
    }

    // Collect address lines if we're in an address context
    if (collectingAddress && !isBlankLine(lines[i]!)) {
      // Address lines are typically uppercase, postcodes, etc.
      if (isAddressLine(trimmed)) {
        currentAddressLines.push(trimmed);
      }
    }
  }

  flushAddress();
  return addresses;
}

/**
 * Heuristic: check if a line looks like part of an address.
 * Address lines are typically uppercase words, postcodes, or county names.
 */
function isAddressLine(line: string): boolean {
  // Must not be empty
  if (line.length === 0) return false;

  // Skip lines that are clearly explanatory text (lowercase-dominated, long sentences)
  if (line.length > 80 && line.includes(' ')) return false;

  // Address lines are typically uppercase
  if (line === line.toUpperCase()) return true;

  // Postcode pattern
  if (/^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i.test(line)) return true;

  return false;
}
