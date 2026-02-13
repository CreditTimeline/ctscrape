/**
 * Headless Faro collector for the background service worker.
 *
 * The full Faro SDK requires DOM/window, so this module sends
 * telemetry payloads directly to the Faro collector endpoint via fetch().
 * Payloads match the Faro transport format.
 */
import { userPreferences } from '@/utils/storage';
import { FARO_COLLECTOR_URL, FARO_APP_NAME, getFaroAppVersion, getFaroEnvironment, isFaroConfigured } from './config';

const MAX_BATCH_SIZE = 20;
const FLUSH_INTERVAL_MS = 10_000; // 10 seconds

interface TelemetryItem {
  type: 'log' | 'error' | 'event' | 'measurement';
  timestamp: string;
  payload: Record<string, unknown>;
}

let buffer: TelemetryItem[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

function getMeta(): Record<string, unknown> {
  return {
    app: {
      name: FARO_APP_NAME,
      version: getFaroAppVersion(),
      environment: getFaroEnvironment(),
    },
    sdk: { name: 'ctscrape-collector', version: '1.0.0' },
  };
}

async function hasConsent(): Promise<boolean> {
  try {
    const prefs = await userPreferences.getValue();
    return prefs.analyticsConsent;
  } catch {
    return false;
  }
}

async function doFlush(): Promise<void> {
  if (buffer.length === 0) return;
  if (!isFaroConfigured()) return;
  if (!(await hasConsent())) {
    buffer = [];
    return;
  }

  const items = buffer;
  buffer = [];

  const meta = getMeta();

  // Group items by type for the Faro transport format
  const logs = items.filter((i) => i.type === 'log').map((i) => i.payload);
  const exceptions = items.filter((i) => i.type === 'error').map((i) => i.payload);
  const events = items.filter((i) => i.type === 'event').map((i) => i.payload);
  const measurements = items.filter((i) => i.type === 'measurement').map((i) => i.payload);

  const payload: Record<string, unknown> = { meta };
  if (logs.length > 0) payload.logs = logs;
  if (exceptions.length > 0) payload.exceptions = exceptions;
  if (events.length > 0) payload.events = events;
  if (measurements.length > 0) payload.measurements = measurements;

  try {
    await fetch(FARO_COLLECTOR_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // Telemetry failures are non-critical
  }
}

function enqueue(item: TelemetryItem): void {
  buffer.push(item);
  if (buffer.length >= MAX_BATCH_SIZE) {
    doFlush().catch(() => {});
  }
}

/**
 * Start the periodic flush timer. Call once on service worker startup.
 */
export function startCollector(): void {
  if (flushTimer) return;
  flushTimer = setInterval(() => {
    doFlush().catch(() => {});
  }, FLUSH_INTERVAL_MS);
}

/**
 * Stop the collector and flush remaining items.
 */
export async function stopCollector(): Promise<void> {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  await doFlush();
}

/**
 * Push a log message to the collector.
 */
export function pushLog(message: string, level: string = 'info', context?: Record<string, string>): void {
  enqueue({
    type: 'log',
    timestamp: new Date().toISOString(),
    payload: { message, level, context, timestamp: new Date().toISOString() },
  });
}

/**
 * Push an error to the collector.
 */
export function pushError(error: Error, context?: Record<string, string>): void {
  enqueue({
    type: 'error',
    timestamp: new Date().toISOString(),
    payload: {
      type: error.name,
      value: error.message,
      stacktrace: error.stack ? { frames: [{ filename: error.stack }] } : undefined,
      context,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Push a custom event to the collector.
 */
export function pushEvent(name: string, attributes?: Record<string, string>): void {
  enqueue({
    type: 'event',
    timestamp: new Date().toISOString(),
    payload: { name, attributes, timestamp: new Date().toISOString() },
  });
}

/**
 * Push a performance measurement to the collector.
 */
export function pushMeasurement(type: string, values: Record<string, number>, context?: Record<string, string>): void {
  enqueue({
    type: 'measurement',
    timestamp: new Date().toISOString(),
    payload: { type, values, context, timestamp: new Date().toISOString() },
  });
}
