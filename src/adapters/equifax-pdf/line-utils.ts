/**
 * Shared utilities for parsing text lines extracted from Equifax PDF reports.
 * Handles the pdftotext output format where labels and values are separated
 * by blank lines.
 */

/**
 * Check if a line is effectively blank (only whitespace or empty).
 */
export function isBlankLine(line: string): boolean {
  return line.trim().length === 0;
}

/**
 * Split an array of lines into blocks separated by one or more blank lines.
 * Each block is an array of non-blank consecutive lines.
 */
export function splitIntoBlocks(lines: string[]): string[][] {
  const blocks: string[][] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (isBlankLine(line)) {
      if (current.length > 0) {
        blocks.push(current);
        current = [];
      }
    } else {
      current.push(line);
    }
  }

  if (current.length > 0) {
    blocks.push(current);
  }

  return blocks;
}

/**
 * Given an array of lines and a set of known labels, extract key-value pairs.
 *
 * In the pdftotext output, the pattern is typically:
 *   Label          (one or more lines forming the label)
 *   <blank line>
 *   Value          (one or more lines forming the value)
 *   <blank line>
 *   Next Label...
 *
 * This function splits lines into non-blank blocks, then matches blocks
 * against known labels. When a label is found, the subsequent block(s) up to
 * the next known label become the value.
 */
export function extractFieldsFromLines(
  lines: string[],
  knownLabels: readonly string[],
): Map<string, string> {
  const result = new Map<string, string>();
  const labelSet = new Set(knownLabels);
  const blocks = splitIntoBlocks(lines);

  let i = 0;
  while (i < blocks.length) {
    const blockText = blocks[i]!.join(' ').trim();

    if (labelSet.has(blockText)) {
      // Collect value blocks until we hit the next known label or end
      const valueBlocks: string[] = [];
      let j = i + 1;
      while (j < blocks.length) {
        const nextBlockText = blocks[j]!.join(' ').trim();
        if (labelSet.has(nextBlockText)) {
          break;
        }
        valueBlocks.push(nextBlockText);
        j++;
      }

      if (valueBlocks.length > 0) {
        result.set(blockText, valueBlocks.join(' '));
      }
      i = j;
    } else {
      i++;
    }
  }

  return result;
}

/**
 * Join multi-line text blocks into a single trimmed string.
 * Useful for address blocks and other multi-line values.
 */
export function joinLines(lines: string[]): string {
  return lines
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join(' ');
}

/**
 * Extract the last N characters from a string (for account number suffixes).
 * Returns the full string if shorter than N characters.
 */
export function lastNChars(s: string, n: number): string {
  return s.length <= n ? s : s.slice(-n);
}
