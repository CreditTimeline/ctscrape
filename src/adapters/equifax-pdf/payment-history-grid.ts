/**
 * Parses payment history grids from Equifax PDF text.
 *
 * In pdftotext output, a payment history grid looks like:
 *
 *   Payment History/ Account Number: XXXXXXXXXXX300P
 *   J
 *   2026
 *   0
 *   2025
 *   0
 *   F
 *   M
 *   ...
 *   See Appendix A for explanatory information on payment statuses used above.
 *
 * Month letters (J,F,M,A,M,J,J,A,S,O,N,D) and year numbers are interleaved
 * with status codes on separate lines. The grid reads left-to-right, top-to-bottom
 * like a table where rows are years and columns are months.
 */

import {
  APPENDIX_NOTE_RE,
  MONTH_LETTERS,
  VALID_STATUS_CODES,
  YEAR_RE,
} from './constants';
import { isBlankLine } from './line-utils';

/** A single month's payment status */
export interface PaymentHistoryEntry {
  /** Period in YYYY-MM format */
  period: string;
  /** Status code (0-6, A, D, N, S, U, .) */
  code: string;
}

/**
 * Parse a payment history grid from lines starting at the Payment History header.
 *
 * @param lines - Lines starting from the "Payment History/ Account Number:" line
 *                through to (and including) the "See Appendix A" terminator.
 * @returns Array of payment history entries with period and code.
 *
 * The algorithm:
 * 1. Extract all non-blank tokens from the grid lines (after the header, before the terminator).
 * 2. Tokens are either month letters, year numbers, or status codes.
 * 3. The first 12 tokens should be the month letter headers (J,F,M,A,M,J,J,A,S,O,N,D),
 *    but they may be interleaved with year numbers when the grid starts mid-year.
 * 4. After the column headers, we process row data: each year number starts a new row,
 *    and status codes fill in the months for that row.
 *
 * Because pdftotext can insert the column header month letters at any position
 * (they align to column positions in the original PDF), we use a different approach:
 *
 * We scan all tokens, tracking the current year. Status codes are assigned to months
 * based on their position within the current year's data. Month letters in the data
 * stream serve as column markers — we count them to determine which month column
 * we're at, then assign status codes to the months that follow.
 */
export function parsePaymentHistoryGrid(
  gridLines: string[],
): PaymentHistoryEntry[] {
  // Collect all non-blank, non-header tokens
  const tokens: string[] = [];
  for (const line of gridLines) {
    const trimmed = line.trim();
    if (isBlankLine(line)) continue;
    if (APPENDIX_NOTE_RE.test(trimmed)) break;
    tokens.push(trimmed);
  }

  if (tokens.length === 0) return [];

  // First, separate out the column header month letters.
  // The grid always has month column headers (J,F,M,A,M,J,J,A,S,O,N,D).
  // They appear interspersed with the data. We need to identify the column
  // structure by finding where year numbers and status codes appear.

  // Strategy: Walk through tokens. Build year-rows.
  // A year token starts or continues a row.
  // A single-char token that is a valid status code is data.
  // A single-char token that is a month letter could be a column header.
  //
  // The key insight: month letters that are column headers appear BEFORE any
  // status codes for that column. Status codes appear AFTER the year.
  // So the pattern within a row is: [some month headers] YEAR [status codes + month headers] ...

  return parseGridTokens(tokens);
}

/**
 * Parse grid tokens into payment history entries.
 *
 * The pdftotext column-by-column reading means:
 * - Month letters appear as column headers
 * - Year numbers appear as row labels (only once per row, in the column where they visually sit)
 * - Status codes fill the cells
 *
 * We process tokens to build a month->year->status mapping.
 */
function parseGridTokens(tokens: string[]): PaymentHistoryEntry[] {
  // Phase 1: Identify all years present and their order (newest first typically)
  const yearPositions: { year: number; index: number }[] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (YEAR_RE.test(tokens[i]!)) {
      const year = parseInt(tokens[i]!, 10);
      if (year >= 1990 && year <= 2100) {
        yearPositions.push({ year, index: i });
      }
    }
  }

  if (yearPositions.length === 0) return [];

  // The years in order of appearance (typically newest to oldest, top row to bottom)
  const years = yearPositions.map((yp) => yp.year);

  // Phase 2: Process the token stream as columns.
  // Each column starts with a month letter (column header), then has one status code per row.
  // Year labels appear in the appropriate positions.
  //
  // Walk through tokens:
  // - Month letter -> start a new column (monthIndex)
  // - Year number -> marks which row we're in
  // - Status code -> assign to current month + current row's year

  const grid = new Map<string, string>(); // "YYYY-MM" -> code
  let currentMonthIndex = -1; // Which month column we're processing
  let currentRowIndex = 0; // Which row (year) we're currently on
  let isFirstToken = true;

  // Find the first month letter to determine starting month
  let firstMonthLetterIdx = -1;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t.length === 1 && isMonthLetter(t)) {
      firstMonthLetterIdx = findMonthIndex(t, -1);
      break;
    }
  }

  if (firstMonthLetterIdx === -1) return [];

  currentMonthIndex = firstMonthLetterIdx;
  let expectingColumnData = false;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;

    if (isFirstToken && t.length === 1 && isMonthLetter(t)) {
      // First month letter - already handled above
      isFirstToken = false;
      currentRowIndex = 0;
      expectingColumnData = true;
      continue;
    }
    isFirstToken = false;

    // Check if this is a year number
    if (YEAR_RE.test(t)) {
      const year = parseInt(t, 10);
      if (year >= 1990 && year <= 2100) {
        // This is a row label
        const rowIdx = years.indexOf(year);
        if (rowIdx !== -1) {
          currentRowIndex = rowIdx;
        }
        continue;
      }
    }

    // Check if this is a month letter (column header)
    if (t.length === 1 && isMonthLetter(t)) {
      const nextMonth = findMonthIndex(t, currentMonthIndex);
      if (nextMonth > currentMonthIndex) {
        currentMonthIndex = nextMonth;
        currentRowIndex = 0; // Reset to first row for new column
        expectingColumnData = true;
        continue;
      }
    }

    // Check if this is a status code
    if (t.length === 1 && VALID_STATUS_CODES.has(t) && expectingColumnData) {
      if (currentRowIndex < years.length && currentMonthIndex >= 0) {
        const year = years[currentRowIndex]!;
        const month = currentMonthIndex + 1; // 1-based
        const period = `${year}-${String(month).padStart(2, '0')}`;
        grid.set(period, t);
        currentRowIndex++;
      }
      continue;
    }
  }

  // Convert grid to sorted entries (chronological order)
  const entries: PaymentHistoryEntry[] = [];
  for (const [period, code] of grid) {
    entries.push({ period, code });
  }

  entries.sort((a, b) => a.period.localeCompare(b.period));
  return entries;
}

/** Check if a character is one of the month header letters */
function isMonthLetter(ch: string): boolean {
  return MONTH_LETTERS.includes(ch as (typeof MONTH_LETTERS)[number]);
}

/**
 * Find the month index (0-11) for a given letter, starting search after `afterIndex`.
 * Since some letters repeat (J for Jan/Jun/Jul, M for Mar/May, A for Apr/Aug),
 * we find the next occurrence after the current position.
 */
function findMonthIndex(letter: string, afterIndex: number): number {
  for (let i = afterIndex + 1; i < 12; i++) {
    if (MONTH_LETTERS[i] === letter) {
      return i;
    }
  }
  return -1;
}
