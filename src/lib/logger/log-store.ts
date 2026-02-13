import { errorLog } from '@/utils/storage';
import { sanitizeLogEntry } from './sanitizer';
import type { LogEntry, LogExportBundle, LogFilter, LogLevel, LogCategory } from './types';

const MAX_ENTRIES = 500;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getExtensionVersion(): string {
  try {
    return browser.runtime.getManifest().version;
  } catch {
    return '0.0.0';
  }
}

export async function appendLogs(entries: LogEntry[]): Promise<void> {
  const current = await errorLog.getValue();
  const updated = [...current, ...entries].slice(-MAX_ENTRIES);
  await errorLog.setValue(updated);
}

export async function getLogs(filter?: LogFilter): Promise<LogEntry[]> {
  const entries = await errorLog.getValue();
  if (!filter) return entries;

  return entries.filter((entry) => {
    if (filter.level && entry.level !== filter.level) return false;
    if (filter.category && entry.category !== filter.category) return false;
    if (filter.context && entry.context !== filter.context) return false;
    if (filter.since && entry.timestamp < filter.since) return false;
    return true;
  });
}

export async function rotateLogs(): Promise<void> {
  const entries = await errorLog.getValue();
  const cutoff = new Date(Date.now() - MAX_AGE_MS).toISOString();
  const filtered = entries.filter((e) => e.timestamp >= cutoff).slice(-MAX_ENTRIES);
  if (filtered.length !== entries.length) {
    await errorLog.setValue(filtered);
  }
}

export async function clearAllLogs(): Promise<void> {
  await errorLog.setValue([]);
}

export async function exportLogs(): Promise<LogExportBundle> {
  const entries = await errorLog.getValue();
  const sanitised = entries.map(sanitizeLogEntry);

  const byLevel: Record<LogLevel, number> = { debug: 0, info: 0, warn: 0, error: 0 };
  const byCategory: Record<LogCategory, number> = {
    extraction: 0,
    normalisation: 0,
    api: 0,
    retry: 0,
    storage: 0,
    lifecycle: 0,
    adapter: 0,
  };

  for (const entry of sanitised) {
    byLevel[entry.level]++;
    byCategory[entry.category]++;
  }

  const sorted = [...sanitised].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const timeRange =
    first && last
      ? { from: first.timestamp, to: last.timestamp }
      : null;

  return {
    exportedAt: new Date().toISOString(),
    extensionVersion: getExtensionVersion(),
    entries: sanitised,
    summary: {
      total: sanitised.length,
      byLevel,
      byCategory,
      timeRange,
    },
  };
}
