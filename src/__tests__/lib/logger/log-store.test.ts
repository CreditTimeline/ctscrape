import { describe, it, expect, beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import { appendLogs, getLogs, rotateLogs, clearAllLogs, exportLogs } from '../../../lib/logger/log-store';
import type { LogEntry } from '../../../lib/logger/types';

function makeEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    id: `test-${Math.random().toString(36).slice(2)}`,
    timestamp: new Date().toISOString(),
    level: 'info',
    category: 'lifecycle',
    context: 'background',
    message: 'test',
    ...overrides,
  };
}

beforeEach(async () => {
  await fakeBrowser.reset();
});

describe('appendLogs', () => {
  it('appends entries to empty storage', async () => {
    const entries = [makeEntry({ message: 'first' })];
    await appendLogs(entries);

    const stored = await getLogs();
    expect(stored).toHaveLength(1);
    expect(stored[0]!.message).toBe('first');
  });

  it('appends entries to existing storage', async () => {
    await appendLogs([makeEntry({ message: 'first' })]);
    await appendLogs([makeEntry({ message: 'second' })]);

    const stored = await getLogs();
    expect(stored).toHaveLength(2);
  });

  it('enforces max 500 entries', async () => {
    // Add 500 entries
    const big = Array.from({ length: 500 }, (_, i) => makeEntry({ message: `msg-${i}` }));
    await appendLogs(big);

    // Add 10 more
    const extra = Array.from({ length: 10 }, (_, i) => makeEntry({ message: `extra-${i}` }));
    await appendLogs(extra);

    const stored = await getLogs();
    expect(stored.length).toBeLessThanOrEqual(500);
    // The most recent entries should be present
    expect(stored[stored.length - 1]!.message).toBe('extra-9');
  });
});

describe('getLogs', () => {
  it('returns all entries with no filter', async () => {
    await appendLogs([
      makeEntry({ level: 'info', message: 'a' }),
      makeEntry({ level: 'error', message: 'b' }),
    ]);

    const result = await getLogs();
    expect(result).toHaveLength(2);
  });

  it('filters by level', async () => {
    await appendLogs([
      makeEntry({ level: 'info', message: 'a' }),
      makeEntry({ level: 'error', message: 'b' }),
      makeEntry({ level: 'warn', message: 'c' }),
    ]);

    const errors = await getLogs({ level: 'error' });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.level).toBe('error');
  });

  it('filters by category', async () => {
    await appendLogs([
      makeEntry({ category: 'api', message: 'a' }),
      makeEntry({ category: 'extraction', message: 'b' }),
    ]);

    const api = await getLogs({ category: 'api' });
    expect(api).toHaveLength(1);
    expect(api[0]!.category).toBe('api');
  });

  it('filters by context', async () => {
    await appendLogs([
      makeEntry({ context: 'background', message: 'a' }),
      makeEntry({ context: 'content', message: 'b' }),
    ]);

    const bg = await getLogs({ context: 'background' });
    expect(bg).toHaveLength(1);
    expect(bg[0]!.context).toBe('background');
  });

  it('filters by since', async () => {
    const old = new Date('2020-01-01').toISOString();
    const recent = new Date().toISOString();

    await appendLogs([
      makeEntry({ timestamp: old, message: 'old' }),
      makeEntry({ timestamp: recent, message: 'recent' }),
    ]);

    const result = await getLogs({ since: '2024-01-01T00:00:00.000Z' });
    expect(result).toHaveLength(1);
    expect(result[0]!.message).toBe('recent');
  });

  it('combines multiple filters', async () => {
    await appendLogs([
      makeEntry({ level: 'error', category: 'api', message: 'api error' }),
      makeEntry({ level: 'error', category: 'extraction', message: 'extract error' }),
      makeEntry({ level: 'info', category: 'api', message: 'api info' }),
    ]);

    const result = await getLogs({ level: 'error', category: 'api' });
    expect(result).toHaveLength(1);
    expect(result[0]!.message).toBe('api error');
  });
});

describe('rotateLogs', () => {
  it('removes entries older than 7 days', async () => {
    const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    const recentDate = new Date().toISOString();

    await appendLogs([
      makeEntry({ timestamp: oldDate, message: 'old' }),
      makeEntry({ timestamp: recentDate, message: 'recent' }),
    ]);

    await rotateLogs();

    const result = await getLogs();
    expect(result).toHaveLength(1);
    expect(result[0]!.message).toBe('recent');
  });

  it('does nothing when all entries are recent', async () => {
    await appendLogs([
      makeEntry({ message: 'a' }),
      makeEntry({ message: 'b' }),
    ]);

    await rotateLogs();

    const result = await getLogs();
    expect(result).toHaveLength(2);
  });
});

describe('clearAllLogs', () => {
  it('removes all log entries', async () => {
    await appendLogs([makeEntry(), makeEntry(), makeEntry()]);
    expect((await getLogs()).length).toBe(3);

    await clearAllLogs();

    const result = await getLogs();
    expect(result).toHaveLength(0);
  });
});

describe('exportLogs', () => {
  it('returns a valid export bundle', async () => {
    await appendLogs([
      makeEntry({ level: 'info', category: 'api', message: 'safe message' }),
      makeEntry({ level: 'error', category: 'extraction', message: 'another safe message' }),
    ]);

    const bundle = await exportLogs();
    expect(bundle.exportedAt).toBeTruthy();
    expect(bundle.entries).toHaveLength(2);
    expect(bundle.summary.total).toBe(2);
    expect(bundle.summary.byLevel.info).toBe(1);
    expect(bundle.summary.byLevel.error).toBe(1);
    expect(bundle.summary.byCategory.api).toBe(1);
    expect(bundle.summary.byCategory.extraction).toBe(1);
    expect(bundle.summary.timeRange).not.toBeNull();
  });

  it('returns null timeRange for empty logs', async () => {
    const bundle = await exportLogs();
    expect(bundle.summary.total).toBe(0);
    expect(bundle.summary.timeRange).toBeNull();
  });

  it('sanitises entries in export', async () => {
    await appendLogs([
      makeEntry({ message: 'email: test@example.com' }),
    ]);

    const bundle = await exportLogs();
    expect(bundle.entries[0]!.message).not.toContain('test@example.com');
    expect(bundle.entries[0]!.message).toContain('[REDACTED_EMAIL]');
  });
});
