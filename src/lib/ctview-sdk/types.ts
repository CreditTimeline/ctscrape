/** Options for creating a CtviewClient instance. */
export interface CtviewClientOptions {
  baseUrl: string;
  apiKey?: string;
  fetch?: typeof globalThis.fetch;
  headers?: Record<string, string>;
}

/** Result returned by the ingest endpoint. */
export interface IngestResult {
  success: boolean;
  importIds: string[];
  errors?: string[];
  warnings?: unknown[];
  duplicate?: boolean;
  receiptId?: string;
  durationMs?: number;
  summary?: Record<string, number>;
}

/** System health information from the settings/health endpoint. */
export interface SystemHealth {
  tableCounts: Record<string, number>;
  lastIngestAt: string | null;
  dbEngine: string;
  schemaVersion: string | null;
}
