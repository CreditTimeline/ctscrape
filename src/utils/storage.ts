import { storage } from 'wxt/storage';
import type { LogEntry } from '../lib/logger/types';

/** ctview connection settings — synced across devices */
export interface ConnectionSettings {
  serverUrl: string;
  apiKey: string;
}

/** User preferences — synced across devices */
export interface UserPreferences {
  defaultSubjectId: string;
  autoExtract: boolean;
  theme: 'light' | 'dark' | 'system';
  debugLogging: boolean;
  analyticsConsent: boolean;
}

/** Record of a completed scrape */
export interface ScrapeHistoryEntry {
  id: string;
  adapterId: string;
  siteName: string;
  extractedAt: string;
  sentAt: string | null;
  status: 'pending' | 'sent' | 'failed';
  entityCounts: Record<string, number>;
  receiptId: string | null;
  error: string | null;
}

// --- Synced storage (persists across devices) ---

export const connectionSettings = storage.defineItem<ConnectionSettings>('sync:connectionSettings', {
  defaultValue: { serverUrl: '', apiKey: '' },
});

export const userPreferences = storage.defineItem<UserPreferences>('sync:userPreferences', {
  defaultValue: { defaultSubjectId: '', autoExtract: false, theme: 'system', debugLogging: false, analyticsConsent: false },
});

/** An item in the retry queue for failed sends */
export interface RetryQueueItem {
  id: string;
  creditFile: unknown;
  historyId: string;
  adapterId: string;
  extractedAt: string;
  queuedAt: string;
  retryCount: number;
  nextRetryAt: string;
  lastError?: string;
}

// --- Local storage (this device only) ---

export const scrapeHistory = storage.defineItem<ScrapeHistoryEntry[]>('local:scrapeHistory', {
  defaultValue: [],
});

export const retryQueue = storage.defineItem<RetryQueueItem[]>('local:retryQueue', {
  defaultValue: [],
});

export const errorLog = storage.defineItem<LogEntry[]>('local:errorLog', {
  defaultValue: [],
});

export const ga4ClientId = storage.defineItem<string | null>('local:ga4ClientId', {
  defaultValue: null,
});

// --- Session storage (cleared on browser close) ---

export const currentExtraction = storage.defineItem<string | null>('session:currentExtraction', {
  defaultValue: null,
});
