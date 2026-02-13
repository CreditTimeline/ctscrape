import { exportLogs } from './log-store';
import type { SupportBundle } from './types';
import { connectionSettings, userPreferences, scrapeHistory, retryQueue } from '@/utils/storage';

/**
 * Generate a comprehensive support bundle for user-facing diagnostics.
 * Includes log data plus system info, preferences, and recent history.
 * Sensitive data (API keys, postcode, etc.) is already sanitised by exportLogs.
 */
export async function exportSupportBundle(): Promise<SupportBundle> {
  const [logBundle, connSettings, prefs, history, queue] = await Promise.all([
    exportLogs(),
    connectionSettings.getValue(),
    userPreferences.getValue(),
    scrapeHistory.getValue(),
    retryQueue.getValue(),
  ]);

  const permissions = browser.runtime.getManifest().permissions ?? [];

  const recentHistory = history.slice(0, 10).map((h) => ({
    id: h.id,
    adapterId: h.adapterId,
    status: h.status,
    extractedAt: h.extractedAt,
    error: h.error,
  }));

  return {
    ...logBundle,
    browser: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    permissions,
    connectionConfigured: connSettings.serverUrl !== '' && connSettings.apiKey !== '',
    analyticsConsent: prefs.analyticsConsent,
    debugLogging: prefs.debugLogging,
    recentHistory,
    retryQueueSize: queue.length,
  };
}
