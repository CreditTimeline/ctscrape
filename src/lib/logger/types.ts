export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogCategory =
  | 'extraction'
  | 'normalisation'
  | 'api'
  | 'retry'
  | 'storage'
  | 'lifecycle'
  | 'adapter';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  context: string; // 'background' | 'content' | 'sidepanel' | 'popup'
  message: string;
  data?: Record<string, unknown>;
}

export interface LogFilter {
  level?: LogLevel;
  category?: LogCategory;
  context?: string;
  since?: string; // ISO date
}

export interface LogExportBundle {
  exportedAt: string;
  extensionVersion: string;
  entries: LogEntry[];
  summary: {
    total: number;
    byLevel: Record<LogLevel, number>;
    byCategory: Record<LogCategory, number>;
    timeRange: { from: string; to: string } | null;
  };
}

export interface SupportBundle extends LogExportBundle {
  browser: string;
  timezone: string;
  permissions: string[];
  connectionConfigured: boolean;
  analyticsConsent: boolean;
  debugLogging: boolean;
  recentHistory: Array<{
    id: string;
    adapterId: string;
    status: string;
    extractedAt: string;
    error: string | null;
  }>;
  retryQueueSize: number;
}
