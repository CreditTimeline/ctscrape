import { describe, it, expect, vi } from 'vitest';
import {
  connectionSettings,
  userPreferences,
  scrapeHistory,
  retryQueue,
  currentExtraction,
} from '@/utils/storage';
import { makeQueueItem, makeHistoryEntry, makeConnectionSettings } from '@/__tests__/helpers/factories';

describe('storage items', () => {
  describe('connectionSettings (sync)', () => {
    it('has default value of empty serverUrl and apiKey', async () => {
      const value = await connectionSettings.getValue();
      expect(value).toEqual({ serverUrl: '', apiKey: '' });
    });

    it('round-trips setValue/getValue', async () => {
      const settings = makeConnectionSettings();
      await connectionSettings.setValue(settings);

      const retrieved = await connectionSettings.getValue();
      expect(retrieved).toEqual(settings);
    });
  });

  describe('userPreferences (sync)', () => {
    it('has correct default value', async () => {
      const value = await userPreferences.getValue();
      expect(value).toEqual({
        defaultSubjectId: '',
        autoExtract: false,
        theme: 'system',
        debugLogging: false,
        analyticsConsent: false,
      });
    });

    it('round-trips setValue/getValue', async () => {
      const prefs = {
        defaultSubjectId: 'subj-123',
        autoExtract: true,
        theme: 'dark' as const,
        debugLogging: false,
        analyticsConsent: false,
      };
      await userPreferences.setValue(prefs);

      const retrieved = await userPreferences.getValue();
      expect(retrieved).toEqual(prefs);
    });
  });

  describe('scrapeHistory (local)', () => {
    it('defaults to empty array', async () => {
      const value = await scrapeHistory.getValue();
      expect(value).toEqual([]);
    });

    it('can store and retrieve ScrapeHistoryEntry[]', async () => {
      const entries = [
        makeHistoryEntry({ id: 'h1' }),
        makeHistoryEntry({ id: 'h2', status: 'sent', sentAt: '2025-01-01T01:00:00Z' }),
      ];

      await scrapeHistory.setValue(entries);

      const retrieved = await scrapeHistory.getValue();
      expect(retrieved).toEqual(entries);
      expect(retrieved).toHaveLength(2);
    });
  });

  describe('retryQueue (local)', () => {
    it('defaults to empty array', async () => {
      const value = await retryQueue.getValue();
      expect(value).toEqual([]);
    });

    it('can store and retrieve RetryQueueItem[]', async () => {
      const items = [
        makeQueueItem({ id: 'r1' }),
        makeQueueItem({ id: 'r2', retryCount: 3 }),
      ];

      await retryQueue.setValue(items);

      const retrieved = await retryQueue.getValue();
      expect(retrieved).toEqual(items);
      expect(retrieved).toHaveLength(2);
    });
  });

  describe('currentExtraction (session)', () => {
    it('defaults to null', async () => {
      const value = await currentExtraction.getValue();
      expect(value).toBeNull();
    });

    it('can store a string value', async () => {
      await currentExtraction.setValue('extraction-in-progress-123');

      const retrieved = await currentExtraction.getValue();
      expect(retrieved).toBe('extraction-in-progress-123');
    });

    it('can clear with null', async () => {
      await currentExtraction.setValue('some-value');
      await currentExtraction.setValue(null);

      const retrieved = await currentExtraction.getValue();
      expect(retrieved).toBeNull();
    });
  });

  describe('watch behavior', () => {
    it('connectionSettings.watch() callback fires on setValue()', async () => {
      const callback = vi.fn();
      const unwatch = connectionSettings.watch(callback);

      const newSettings = makeConnectionSettings({ serverUrl: 'https://new.example.com' });
      await connectionSettings.setValue(newSettings);

      // Give the watch callback time to fire
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(callback).toHaveBeenCalled();
      const lastCallArg = callback.mock.calls[callback.mock.calls.length - 1]![0];
      expect(lastCallArg).toEqual(newSettings);

      unwatch();
    });
  });
});
