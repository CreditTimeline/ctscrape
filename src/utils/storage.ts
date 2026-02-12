import { storage } from 'wxt/storage';

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
  defaultValue: { defaultSubjectId: '', autoExtract: false, theme: 'system' },
});

// --- Local storage (this device only) ---

export const scrapeHistory = storage.defineItem<ScrapeHistoryEntry[]>('local:scrapeHistory', {
  defaultValue: [],
});

// --- Session storage (cleared on browser close) ---

export const currentExtraction = storage.defineItem<string | null>('session:currentExtraction', {
  defaultValue: null,
});
