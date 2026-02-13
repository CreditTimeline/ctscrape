import { describe, it, expect } from 'vitest';
import { sanitizeLogEntry } from '../../../lib/logger/sanitizer';
import type { LogEntry } from '../../../lib/logger/types';

function makeEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    id: 'test-1',
    timestamp: '2024-01-01T00:00:00.000Z',
    level: 'info',
    category: 'lifecycle',
    context: 'background',
    message: 'test message',
    ...overrides,
  };
}

describe('sanitizeLogEntry', () => {
  it('preserves non-PII messages', () => {
    const entry = makeEntry({ message: 'extraction complete on tab 42' });
    const sanitised = sanitizeLogEntry(entry);
    expect(sanitised.message).toBe('extraction complete on tab 42');
  });

  it('redacts email addresses in message', () => {
    const entry = makeEntry({ message: 'user email is john@example.com and test@foo.co.uk' });
    const sanitised = sanitizeLogEntry(entry);
    expect(sanitised.message).not.toContain('john@example.com');
    expect(sanitised.message).not.toContain('test@foo.co.uk');
    expect(sanitised.message).toContain('[REDACTED_EMAIL]');
  });

  it('redacts UK postcodes in message', () => {
    const entry = makeEntry({ message: 'address postcode is SW1A 1AA' });
    const sanitised = sanitizeLogEntry(entry);
    expect(sanitised.message).not.toContain('SW1A 1AA');
    expect(sanitised.message).toContain('[REDACTED_POSTCODE]');
  });

  it('redacts postcodes without spaces', () => {
    const entry = makeEntry({ message: 'postcode EC2R8AH found' });
    const sanitised = sanitizeLogEntry(entry);
    expect(sanitised.message).not.toContain('EC2R8AH');
    expect(sanitised.message).toContain('[REDACTED_POSTCODE]');
  });

  it('redacts UK phone numbers with +44 prefix', () => {
    const entry = makeEntry({ message: 'phone: +44 7911 123456' });
    const sanitised = sanitizeLogEntry(entry);
    expect(sanitised.message).not.toContain('7911 123456');
    expect(sanitised.message).toContain('[REDACTED_PHONE]');
  });

  it('redacts UK phone numbers with 0 prefix', () => {
    const entry = makeEntry({ message: 'phone: 07911123456' });
    const sanitised = sanitizeLogEntry(entry);
    expect(sanitised.message).not.toContain('07911123456');
    expect(sanitised.message).toContain('[REDACTED_PHONE]');
  });

  it('redacts long alphanumeric strings (API keys)', () => {
    const entry = makeEntry({ message: 'key is abc123def456ghi789jkl012' });
    const sanitised = sanitizeLogEntry(entry);
    expect(sanitised.message).not.toContain('abc123def456ghi789jkl012');
    expect(sanitised.message).toContain('[REDACTED_KEY]');
  });

  it('redacts PII in data fields', () => {
    const entry = makeEntry({
      data: {
        email: 'test@example.com',
        nested: { postcode: 'SW1A 1AA' },
      },
    });
    const sanitised = sanitizeLogEntry(entry);
    expect(sanitised.data!.email).toContain('[REDACTED_EMAIL]');
    const nested = sanitised.data!.nested as Record<string, string>;
    expect(nested.postcode).toContain('[REDACTED_POSTCODE]');
  });

  it('handles arrays in data', () => {
    const entry = makeEntry({
      data: {
        emails: ['a@b.com', 'c@d.com'],
      },
    });
    const sanitised = sanitizeLogEntry(entry);
    const emails = sanitised.data!.emails as string[];
    expect(emails[0]).toContain('[REDACTED_EMAIL]');
    expect(emails[1]).toContain('[REDACTED_EMAIL]');
  });

  it('preserves numeric and boolean data values', () => {
    const entry = makeEntry({
      data: { count: 42, active: true },
    });
    const sanitised = sanitizeLogEntry(entry);
    expect(sanitised.data!.count).toBe(42);
    expect(sanitised.data!.active).toBe(true);
  });

  it('handles entries without data', () => {
    const entry = makeEntry({ data: undefined });
    const sanitised = sanitizeLogEntry(entry);
    expect(sanitised.data).toBeUndefined();
  });

  it('does not mutate the original entry', () => {
    const entry = makeEntry({ message: 'email: test@example.com' });
    sanitizeLogEntry(entry);
    expect(entry.message).toBe('email: test@example.com');
  });
});
