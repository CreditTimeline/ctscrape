/**
 * Splits the full text of an Equifax PDF credit report into numbered sections.
 * Strips page headers, "Consumer Protected" markers, and page number patterns.
 */

import { PAGE_HEADER_RE, SECTION_HEADER_RE } from './constants';
import { isBlankLine } from './line-utils';

/** A numbered section of the report with its raw lines. */
export interface TextSection {
  /** Section number (1-10) */
  sectionNumber: number;
  /** Section title text (e.g., "Personal Information") */
  title: string;
  /** All non-header lines belonging to this section */
  lines: string[];
}

/**
 * Clean the raw text lines by removing page headers, "Consumer Protected"
 * markers, and page number sequences (standalone digits + "of" + digits).
 *
 * Page number sequences in pdftotext appear as three separate lines:
 *   "47"
 *   "of"
 *   "111"
 * We detect these by looking for a pattern of: number line, "of" line, number line
 * with optional blank lines between them.
 */
export function cleanLines(rawLines: string[]): string[] {
  const cleaned: string[] = [];

  // First pass: remove page headers and "Consumer Protected"
  const pass1: string[] = [];
  for (const line of rawLines) {
    if (PAGE_HEADER_RE.test(line.trim())) continue;
    if (line.trim() === 'Consumer Protected') continue;
    pass1.push(line);
  }

  // Second pass: remove page number sequences (number / "of" / number)
  // These appear as non-blank lines: a number, then "of", then a number,
  // with possible blank lines interleaved.
  let i = 0;
  while (i < pass1.length) {
    const trimmed = pass1[i]!.trim();

    // Check if this starts a page number sequence
    if (/^\d+$/.test(trimmed)) {
      // Look ahead for "of" and then another number, skipping blank lines
      const seq = tryMatchPageNumberSequence(pass1, i);
      if (seq !== null) {
        // Skip all lines in the matched sequence
        i = seq.endIndex;
        continue;
      }
    }

    cleaned.push(pass1[i]!);
    i++;
  }

  return cleaned;
}

/**
 * Try to match a page number sequence starting at index `start`.
 * Pattern: number, [blanks], "of", [blanks], number
 * Returns the end index (exclusive) if matched, or null.
 */
function tryMatchPageNumberSequence(
  lines: string[],
  start: number,
): { endIndex: number } | null {
  let pos = start;

  // First element must be a standalone number
  if (!/^\d+$/.test(lines[pos]!.trim())) return null;
  pos++;

  // Skip blank lines
  while (pos < lines.length && isBlankLine(lines[pos]!)) pos++;

  // Must find "of"
  if (pos >= lines.length || lines[pos]!.trim() !== 'of') return null;
  pos++;

  // Skip blank lines
  while (pos < lines.length && isBlankLine(lines[pos]!)) pos++;

  // Must find another standalone number
  if (pos >= lines.length || !/^\d+$/.test(lines[pos]!.trim())) return null;
  pos++;

  return { endIndex: pos };
}

/**
 * Split the full text of an Equifax PDF report into numbered sections.
 *
 * Sections are delineated by numbered headers matching SECTION_HEADER_RE
 * (e.g., "1. Personal Information", "4. Credit Agreements").
 *
 * Content before Section 1 (cover page, table of contents) is skipped.
 * The Q&A, Appendices, and other trailing content after Section 10 are skipped.
 */
export function splitIntoSections(fullText: string): TextSection[] {
  const rawLines = fullText.split('\n');
  const cleaned = cleanLines(rawLines);

  const sections: TextSection[] = [];
  let currentSection: TextSection | null = null;

  for (const line of cleaned) {
    const trimmed = line.trim();
    const match = SECTION_HEADER_RE.exec(trimmed);

    if (match) {
      const sectionNumber = parseInt(match[1]!, 10);
      const title = match[2]!.trim();

      // Only process sections 1-10
      if (sectionNumber >= 1 && sectionNumber <= 10) {
        // Save previous section
        if (currentSection) {
          sections.push(currentSection);
        }

        currentSection = {
          sectionNumber,
          title,
          lines: [],
        };
        continue;
      }
    }

    // Accumulate lines for the current section
    if (currentSection) {
      // Stop if we hit Q&A or Appendices
      if (trimmed === 'Q&A' || /^Appendix\s+[A-Z]$/.test(trimmed)) {
        break;
      }
      currentSection.lines.push(line);
    }
  }

  // Push the final section
  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
}
