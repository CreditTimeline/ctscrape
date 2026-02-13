const MONTH_MAP: Record<string, string> = {
  january: '01',
  february: '02',
  march: '03',
  april: '04',
  may: '05',
  june: '06',
  july: '07',
  august: '08',
  september: '09',
  october: '10',
  november: '11',
  december: '12',
};

const LONG_DATE_RE = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/;
const SLASH_DATE_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const AMOUNT_RE = /^([\d,]+(?:\.\d{1,2})?)$/;

/**
 * Parse a long-form date like "20 August 2024" or "9 July 1986" -> "2024-08-20"
 * Returns null if the string doesn't match.
 */
export function parseLongDate(text: string): string | null {
  const trimmed = text.trim();
  const match = trimmed.match(LONG_DATE_RE);
  if (!match) return null;

  const dayStr = match[1]!;
  const monthStr = match[2]!;
  const year = match[3]!;
  const month = MONTH_MAP[monthStr.toLowerCase()];
  if (!month) return null;

  const day = dayStr.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a slash date like "09/09/2025" (DD/MM/YYYY) -> "2025-09-09"
 * Returns null if the string doesn't match.
 */
export function parseSlashDate(text: string): string | null {
  const trimmed = text.trim();
  const match = trimmed.match(SLASH_DATE_RE);
  if (!match) return null;

  const day = match[1]!;
  const month = match[2]!;
  const year = match[3]!;
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;

  return `${year}-${month}-${day}`;
}

/**
 * Parse a monetary amount like "£1,234" or "£1,234.56" -> 123456 (integer pence).
 * Per CLAUDE.md: All monetary values are integer minor units (pence).
 * Returns null if the string can't be parsed.
 */
export function parseAmount(text: string): number | null {
  const trimmed = text.trim();
  const negative = trimmed.startsWith('-');
  const cleaned = trimmed.replace(/^-/, '').replace(/^£/, '');

  const match = cleaned.match(AMOUNT_RE);
  if (!match) return null;

  const numStr = match[1]!.replace(/,/g, '');
  const parts = numStr.split('.');
  const pounds = parseInt(parts[0]!, 10);
  if (isNaN(pounds)) return null;

  let pence = 0;
  if (parts.length === 2) {
    const pennyStr = parts[1]!.padEnd(2, '0');
    pence = parseInt(pennyStr, 10);
    if (isNaN(pence)) return null;
  }

  const total = pounds * 100 + pence;
  return negative ? -total : total;
}

/**
 * Collapse whitespace and trim.
 */
export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}
