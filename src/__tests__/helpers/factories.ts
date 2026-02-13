import type { RetryQueueItem, ScrapeHistoryEntry, ConnectionSettings, UserPreferences } from '@/utils/storage';

export function makeQueueItem(overrides?: Partial<RetryQueueItem>): RetryQueueItem {
  return {
    id: 'retry-1',
    creditFile: { test: true },
    historyId: 'hist-1',
    adapterId: 'checkmyfile',
    extractedAt: '2025-01-01T00:00:00.000Z',
    queuedAt: '2025-01-01T00:01:00.000Z',
    retryCount: 0,
    nextRetryAt: new Date(Date.now() - 1000).toISOString(),
    ...overrides,
  };
}

export function makeHistoryEntry(overrides?: Partial<ScrapeHistoryEntry>): ScrapeHistoryEntry {
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

export function makeConnectionSettings(overrides?: Partial<ConnectionSettings>): ConnectionSettings {
  return {
    serverUrl: 'https://ctview.example.com',
    apiKey: 'test-api-key-123',
    ...overrides,
  };
}

export function makeUserPreferences(overrides?: Partial<UserPreferences>): UserPreferences {
  return {
    defaultSubjectId: 'subject:test',
    autoExtract: false,
    theme: 'system',
    debugLogging: false,
    analyticsConsent: false,
    ...overrides,
  };
}
