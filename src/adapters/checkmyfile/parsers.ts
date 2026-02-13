import { NO_DATA_SENTINEL } from './constants';
import { normalizeWhitespace } from '@/utils/parsers';

export { parseLongDate, parseSlashDate, parseAmount, normalizeWhitespace } from '@/utils/parsers';

/**
 * Get trimmed text content from an element, return null if empty or matches sentinel.
 */
export function extractCellText(
  element: Element | null,
  sentinel: string = NO_DATA_SENTINEL,
): string | null {
  if (!element) return null;
  const text = normalizeWhitespace(element.textContent ?? '');
  if (text === '' || text === sentinel) return null;
  return text;
}
