import type { LogEntry } from './types';

// Patterns to redact
const patterns: Array<{ regex: RegExp; replacement: string }> = [
  // Email addresses
  { regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '[REDACTED_EMAIL]' },
  // UK postcodes (e.g., SW1A 1AA, EC2R 8AH, M1 1AA)
  { regex: /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/gi, replacement: '[REDACTED_POSTCODE]' },
  // UK phone numbers (+44, 07xxx, 01xxx, 02xxx patterns)
  { regex: /(?:\+44\s?|0)(?:\d\s?){9,10}\b/g, replacement: '[REDACTED_PHONE]' },
  // API keys (long alphanumeric strings, 20+ chars)
  { regex: /\b[A-Za-z0-9_-]{20,}\b/g, replacement: '[REDACTED_KEY]' },
];

function redactString(value: string): string {
  let result = value;
  for (const { regex, replacement } of patterns) {
    result = result.replace(regex, replacement);
  }
  return result;
}

function redactValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return redactString(value);
  }
  if (Array.isArray(value)) {
    return value.map(redactValue);
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      result[k] = redactValue(v);
    }
    return result;
  }
  return value;
}

export function sanitizeLogEntry(entry: LogEntry): LogEntry {
  return {
    ...entry,
    message: redactString(entry.message),
    data: entry.data ? (redactValue(entry.data) as Record<string, unknown>) : undefined,
  };
}
