import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createLogger } from '../../../lib/logger/logger';
import type { LogEntry } from '../../../lib/logger/types';

// Mock userPreferences
vi.mock('@/utils/storage', () => ({
  userPreferences: {
    getValue: vi.fn().mockResolvedValue({ debugLogging: false }),
  },
  errorLog: {
    getValue: vi.fn().mockResolvedValue([]),
    setValue: vi.fn().mockResolvedValue(undefined),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createLogger', () => {
  it('creates a logger with the given context', () => {
    const logger = createLogger('test-context');
    expect(logger).toHaveProperty('debug');
    expect(logger).toHaveProperty('info');
    expect(logger).toHaveProperty('warn');
    expect(logger).toHaveProperty('error');
    expect(logger).toHaveProperty('flush');
  });

  it('generates entries with correct context', async () => {
    const flushed: LogEntry[] = [];
    const logger = createLogger('background', async (entries) => {
      flushed.push(...entries);
    });

    logger.info('test message', { category: 'lifecycle' });
    await logger.flush();

    expect(flushed).toHaveLength(1);
    expect(flushed[0]!.context).toBe('background');
    expect(flushed[0]!.message).toBe('test message');
    expect(flushed[0]!.level).toBe('info');
    expect(flushed[0]!.category).toBe('lifecycle');
  });

  it('generates unique IDs', async () => {
    const flushed: LogEntry[] = [];
    const logger = createLogger('test', async (entries) => {
      flushed.push(...entries);
    });

    logger.info('msg1');
    logger.info('msg2');
    await logger.flush();

    expect(flushed[0]!.id).not.toBe(flushed[1]!.id);
  });

  it('generates ISO timestamps', async () => {
    const flushed: LogEntry[] = [];
    const logger = createLogger('test', async (entries) => {
      flushed.push(...entries);
    });

    logger.info('test');
    await logger.flush();

    // Should be a valid ISO date
    expect(new Date(flushed[0]!.timestamp).toISOString()).toBe(flushed[0]!.timestamp);
  });

  it('defaults category to lifecycle', async () => {
    const flushed: LogEntry[] = [];
    const logger = createLogger('test', async (entries) => {
      flushed.push(...entries);
    });

    logger.info('no category');
    await logger.flush();

    expect(flushed[0]!.category).toBe('lifecycle');
  });

  it('includes data in entries', async () => {
    const flushed: LogEntry[] = [];
    const logger = createLogger('test', async (entries) => {
      flushed.push(...entries);
    });

    logger.info('with data', { category: 'api', data: { url: 'http://example.com' } });
    await logger.flush();

    expect(flushed[0]!.data).toEqual({ url: 'http://example.com' });
  });

  it('serialises error objects in data', async () => {
    const flushed: LogEntry[] = [];
    const logger = createLogger('test', async (entries) => {
      flushed.push(...entries);
    });

    const err = new Error('test error');
    logger.error('failed', { category: 'api', error: err });
    await logger.flush();

    const data = flushed[0]!.data!;
    expect(data.error).toBeDefined();
    const errorData = data.error as Record<string, unknown>;
    expect(errorData.name).toBe('Error');
    expect(errorData.message).toBe('test error');
  });
});

describe('buffering', () => {
  it('buffers entries until flushed', async () => {
    let flushCount = 0;
    const logger = createLogger('test', async () => {
      flushCount++;
    });

    logger.info('msg1');
    logger.info('msg2');
    logger.info('msg3');

    expect(flushCount).toBe(0);

    await logger.flush();
    expect(flushCount).toBe(1);
  });

  it('auto-flushes when buffer reaches max size (10)', async () => {
    const flushed: LogEntry[] = [];
    const logger = createLogger('test', async (entries) => {
      flushed.push(...entries);
    });

    // Log 10 entries to trigger auto-flush
    for (let i = 0; i < 10; i++) {
      logger.info(`msg ${i}`);
    }

    // Give the async flush a tick to complete
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(flushed.length).toBe(10);
  });

  it('does nothing on flush if buffer is empty', async () => {
    let flushCount = 0;
    const logger = createLogger('test', async () => {
      flushCount++;
    });

    await logger.flush();
    expect(flushCount).toBe(0);
  });
});

describe('debug filtering', () => {
  it('does not log debug messages when debugLogging is false', async () => {
    const { userPreferences } = await import('@/utils/storage');
    vi.mocked(userPreferences.getValue).mockResolvedValue({
      debugLogging: false,
      defaultSubjectId: '',
      autoExtract: false,
      theme: 'system',
      analyticsConsent: false,
    });

    const flushed: LogEntry[] = [];
    const logger = createLogger('test', async (entries) => {
      flushed.push(...entries);
    });

    logger.debug('debug msg');
    // Give time for the async preference check
    await new Promise((resolve) => setTimeout(resolve, 50));
    await logger.flush();

    expect(flushed).toHaveLength(0);
  });

  it('logs debug messages when debugLogging is true', async () => {
    const { userPreferences } = await import('@/utils/storage');
    vi.mocked(userPreferences.getValue).mockResolvedValue({
      debugLogging: true,
      defaultSubjectId: '',
      autoExtract: false,
      theme: 'system',
      analyticsConsent: false,
    });

    const flushed: LogEntry[] = [];
    const logger = createLogger('test', async (entries) => {
      flushed.push(...entries);
    });

    logger.debug('debug msg');
    // Give time for the async preference check
    await new Promise((resolve) => setTimeout(resolve, 50));
    await logger.flush();

    expect(flushed).toHaveLength(1);
    expect(flushed[0]!.level).toBe('debug');
  });
});
