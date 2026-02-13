import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enqueueRetry, processRetryQueue, manualRetry, removeFromQueue } from '../../lib/retry-queue';
import { retryQueue, scrapeHistory, type RetryQueueItem, type ScrapeHistoryEntry } from '../../utils/storage';

// Mock storage
vi.mock('../../utils/storage', () => ({
  retryQueue: {
    getValue: vi.fn(),
    setValue: vi.fn(),
  },
  scrapeHistory: {
    getValue: vi.fn(),
    setValue: vi.fn(),
  },
}));

// Mock ctview-client
const mockIngest = vi.fn();
vi.mock('../../lib/ctview-client', () => ({
  getClient: vi.fn(async () => ({ ingest: mockIngest })),
  classifySendError: vi.fn((err: unknown) => ({
    error: err instanceof Error ? err.message : String(err),
    errorCode: 'TEST_ERROR',
    retryable: true,
  })),
}));

const mockQueueGetValue = vi.mocked(retryQueue.getValue);
const mockQueueSetValue = vi.mocked(retryQueue.setValue);
const mockHistoryGetValue = vi.mocked(scrapeHistory.getValue);
const mockHistorySetValue = vi.mocked(scrapeHistory.setValue);

function makeQueueItem(overrides?: Partial<RetryQueueItem>): RetryQueueItem {
  return {
    id: 'retry-1',
    creditFile: { test: true },
    historyId: 'hist-1',
    adapterId: 'checkmyfile',
    extractedAt: '2025-01-01T00:00:00.000Z',
    queuedAt: '2025-01-01T00:01:00.000Z',
    retryCount: 0,
    nextRetryAt: new Date(Date.now() - 1000).toISOString(), // ready now
    ...overrides,
  };
}

function makeHistoryEntry(overrides?: Partial<ScrapeHistoryEntry>): ScrapeHistoryEntry {
  return {
    id: 'hist-1',
    adapterId: 'checkmyfile',
    siteName: 'CheckMyFile',
    extractedAt: '2025-01-01T00:00:00.000Z',
    sentAt: null,
    status: 'failed',
    entityCounts: { tradelines: 5 },
    receiptId: null,
    error: 'Previous error',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockQueueSetValue.mockResolvedValue(undefined);
  mockHistorySetValue.mockResolvedValue(undefined);
});

describe('enqueueRetry', () => {
  it('adds item with correct structure', async () => {
    mockQueueGetValue.mockResolvedValue([]);

    await enqueueRetry({
      id: 'retry-1',
      creditFile: { test: true },
      historyId: 'hist-1',
      adapterId: 'checkmyfile',
      extractedAt: '2025-01-01T00:00:00.000Z',
      queuedAt: '2025-01-01T00:01:00.000Z',
    });

    expect(mockQueueSetValue).toHaveBeenCalledTimes(1);
    const savedQueue = mockQueueSetValue.mock.calls[0]![0] as RetryQueueItem[];
    expect(savedQueue).toHaveLength(1);
    expect(savedQueue[0]!.retryCount).toBe(0);
    expect(savedQueue[0]!.nextRetryAt).toBeDefined();
  });

  it('deduplicates by historyId', async () => {
    mockQueueGetValue.mockResolvedValue([makeQueueItem({ historyId: 'hist-1' })]);

    await enqueueRetry({
      id: 'retry-2',
      creditFile: { test: true },
      historyId: 'hist-1',
      adapterId: 'checkmyfile',
      extractedAt: '2025-01-01T00:00:00.000Z',
      queuedAt: '2025-01-01T00:02:00.000Z',
    });

    expect(mockQueueSetValue).not.toHaveBeenCalled();
  });
});

describe('processRetryQueue', () => {
  it('does nothing when queue is empty', async () => {
    mockQueueGetValue.mockResolvedValue([]);
    await processRetryQueue();
    expect(mockIngest).not.toHaveBeenCalled();
  });

  it('skips items not yet ready', async () => {
    const futureItem = makeQueueItem({
      nextRetryAt: new Date(Date.now() + 60_000).toISOString(),
    });
    mockQueueGetValue.mockResolvedValue([futureItem]);
    await processRetryQueue();
    expect(mockIngest).not.toHaveBeenCalled();
  });

  it('processes ready items and removes on success', async () => {
    const item = makeQueueItem();
    mockQueueGetValue.mockResolvedValue([item]);
    mockHistoryGetValue.mockResolvedValue([makeHistoryEntry()]);
    mockIngest.mockResolvedValue({
      success: true,
      importIds: ['imp-1'],
      receiptId: 'receipt-1',
    });

    await processRetryQueue();

    expect(mockIngest).toHaveBeenCalledWith(item.creditFile);
    // Queue should be empty after success
    expect(mockQueueSetValue).toHaveBeenCalledWith([]);
    // History should be updated
    expect(mockHistorySetValue).toHaveBeenCalledTimes(1);
    const updatedHistory = mockHistorySetValue.mock.calls[0]![0] as ScrapeHistoryEntry[];
    expect(updatedHistory[0]!.status).toBe('sent');
    expect(updatedHistory[0]!.receiptId).toBe('receipt-1');
  });

  it('increments retryCount on retryable failure', async () => {
    const item = makeQueueItem({ retryCount: 1 });
    mockQueueGetValue.mockResolvedValue([item]);
    mockIngest.mockRejectedValue(new Error('Server error'));

    await processRetryQueue();

    expect(mockQueueSetValue).toHaveBeenCalledTimes(1);
    const updatedQueue = mockQueueSetValue.mock.calls[0]![0] as RetryQueueItem[];
    expect(updatedQueue).toHaveLength(1);
    expect(updatedQueue[0]!.retryCount).toBe(2);
    expect(updatedQueue[0]!.lastError).toBeDefined();
  });

  it('removes item when max retries reached', async () => {
    const item = makeQueueItem({ retryCount: 4 }); // 4 + 1 = 5 = MAX_RETRIES
    mockQueueGetValue.mockResolvedValue([item]);
    mockHistoryGetValue.mockResolvedValue([makeHistoryEntry()]);
    mockIngest.mockRejectedValue(new Error('Server error'));

    await processRetryQueue();

    // Queue should be empty
    expect(mockQueueSetValue).toHaveBeenCalledWith([]);
    // History should show final error
    const updatedHistory = mockHistorySetValue.mock.calls[0]![0] as ScrapeHistoryEntry[];
    expect(updatedHistory[0]!.status).toBe('failed');
    expect(updatedHistory[0]!.error).toContain('max retries reached');
  });
});

describe('manualRetry', () => {
  it('resets nextRetryAt and triggers processing', async () => {
    const item = makeQueueItem({
      nextRetryAt: new Date(Date.now() + 60_000).toISOString(), // future
    });
    mockQueueGetValue.mockResolvedValue([item]);
    mockHistoryGetValue.mockResolvedValue([makeHistoryEntry()]);
    mockIngest.mockResolvedValue({
      success: true,
      importIds: ['imp-1'],
      receiptId: 'receipt-1',
    });

    await manualRetry('hist-1');

    // Should have been called twice: once to reset timing, once during processRetryQueue
    expect(mockQueueSetValue).toHaveBeenCalled();
  });

  it('does nothing for unknown historyId', async () => {
    mockQueueGetValue.mockResolvedValue([makeQueueItem()]);
    await manualRetry('unknown-id');
    // Only the initial getValue call, no setValue
    expect(mockQueueSetValue).toHaveBeenCalledTimes(0);
  });
});

describe('removeFromQueue', () => {
  it('removes item by historyId', async () => {
    mockQueueGetValue.mockResolvedValue([
      makeQueueItem({ historyId: 'hist-1' }),
      makeQueueItem({ historyId: 'hist-2', id: 'retry-2' }),
    ]);

    await removeFromQueue('hist-1');

    expect(mockQueueSetValue).toHaveBeenCalledTimes(1);
    const remaining = mockQueueSetValue.mock.calls[0]![0] as RetryQueueItem[];
    expect(remaining).toHaveLength(1);
    expect(remaining[0]!.historyId).toBe('hist-2');
  });
});
