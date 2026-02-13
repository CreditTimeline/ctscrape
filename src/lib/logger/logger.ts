import type { LogCategory, LogEntry } from './types';
import { userPreferences } from '@/utils/storage';

const MAX_BUFFER_SIZE = 10;

interface LogOptions {
  category?: LogCategory;
  data?: Record<string, unknown>;
  error?: unknown;
}

interface Logger {
  debug(message: string, options?: LogOptions): void;
  info(message: string, options?: LogOptions): void;
  warn(message: string, options?: LogOptions): void;
  error(message: string, options?: LogOptions): void;
  flush(): Promise<void>;
}

type FlushFn = (entries: LogEntry[]) => Promise<void>;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function serialiseError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
  }
  return { value: String(err) };
}

export function createLogger(context: string, flushFn?: FlushFn): Logger {
  let buffer: LogEntry[] = [];
  let flushing = false;

  async function flush(): Promise<void> {
    if (buffer.length === 0 || flushing) return;
    flushing = true;
    const entries = buffer;
    buffer = [];
    try {
      if (flushFn) {
        await flushFn(entries);
      } else {
        // Default: import and call appendLogs from log-store (background context)
        const { appendLogs } = await import('./log-store');
        await appendLogs(entries);
      }
    } catch {
      // If flush fails, put entries back (drop if too many to avoid infinite loop)
      if (buffer.length < MAX_BUFFER_SIZE) {
        buffer = [...entries, ...buffer].slice(0, MAX_BUFFER_SIZE);
      }
    } finally {
      flushing = false;
    }
  }

  function log(
    level: LogEntry['level'],
    message: string,
    options?: LogOptions,
  ): void {
    const entry: LogEntry = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      level,
      category: options?.category ?? 'lifecycle',
      context,
      message,
      data: options?.error
        ? { ...options.data, error: serialiseError(options.error) }
        : options?.data,
    };

    // DEV console mirror
    if (import.meta.env.DEV) {
      const prefix = `[ctscrape:${context}]`;
      // eslint-disable-next-line no-console
      console[level === 'debug' ? 'log' : level]?.(prefix, message, entry.data ?? '');
    }

    buffer.push(entry);
    if (buffer.length >= MAX_BUFFER_SIZE) {
      flush().catch(() => {});
    }
  }

  async function shouldLogDebug(): Promise<boolean> {
    try {
      const prefs = await userPreferences.getValue();
      return prefs.debugLogging;
    } catch {
      return false;
    }
  }

  return {
    debug(message: string, options?: LogOptions): void {
      // Debug messages only logged if debugLogging preference is enabled
      shouldLogDebug().then((enabled) => {
        if (enabled) log('debug', message, options);
      }).catch(() => {});
    },
    info(message: string, options?: LogOptions): void {
      log('info', message, options);
    },
    warn(message: string, options?: LogOptions): void {
      log('warn', message, options);
    },
    error(message: string, options?: LogOptions): void {
      log('error', message, options);
    },
    flush,
  };
}
