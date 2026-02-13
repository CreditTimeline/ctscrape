import { defineExtensionMessaging } from '@webext-core/messaging';
import type { PageInfo, PdfReportInfo, RawExtractedData } from '../adapters/types';
import type { NormalisationResult } from '../normalizer/types';
import type { ConnectionTestResult } from '../lib/ctview-client';
import type { LogEntry, LogFilter, LogExportBundle, SupportBundle } from '../lib/logger/types';

/** Result of processing a PDF upload */
export interface PdfProcessResult {
  detected: boolean;
  jobId?: string;
  adapterId?: string;
  reportInfo?: PdfReportInfo;
  error?: string;
}

/** Result of a sendToCtview operation. */
export interface SendResult {
  success: boolean;
  receiptId?: string;
  importIds?: string[];
  error?: string;
  errorCode?: string;
  suggestion?: string;
  duplicate?: boolean;
  summary?: Record<string, number>;
}

/**
 * Type-safe messaging protocol between extension contexts.
 *
 * Content script <-> Background (service worker) <-> Popup/Sidepanel
 */
interface ProtocolMap {
  /** Content script detected a supported report page */
  pageDetected(data: { pageInfo: PageInfo }): void;

  /** Content script reports page is no longer a report (e.g., navigated away) */
  pageLeft(): void;

  /** Background requests content script to perform full extraction */
  extractRequest(): void;

  /** Content script returns extracted data */
  extractResult(data: { rawData: RawExtractedData }): void;

  /** Content script reports extraction failure */
  extractError(data: { error: string; details?: string }): void;

  /** Background has finished normalisation — data ready for review */
  normaliseComplete(data: { result: NormalisationResult }): void;

  /** User approved sending data to ctview — returns result directly */
  sendToCtview(): SendResult;

  /** Background reports send result (broadcast for popup) */
  sendResult(data: { success: boolean; receiptId?: string; error?: string }): void;

  /** Test connection to ctview server */
  testConnection(): ConnectionTestResult;

  /** Request manual retry of a failed send from history */
  manualRetry(data: { historyId: string }): SendResult;

  /** Popup/sidepanel requests extraction via background (not direct to content) */
  triggerExtract(): void;

  /** Popup/sidepanel requests current extension state */
  getStatus(): ExtensionStatus;

  /** Content/sidepanel sends log entries to background for storage */
  logEntries(data: { entries: LogEntry[] }): void;

  /** Request stored log entries with optional filter */
  getLogs(data: { filter?: LogFilter }): LogEntry[];

  /** Export all logs as a sanitised bundle */
  exportLogs(): LogExportBundle;

  /** Clear all stored logs */
  clearLogs(): void;

  /** Export a comprehensive support bundle */
  exportSupportBundle(): SupportBundle;

  /** Track a GA4 analytics event from non-background contexts */
  trackEvent(data: { eventName: string; params: Record<string, string | number> }): void;

  /** Forward telemetry data from content scripts to background Faro collector */
  telemetryEvent(data: {
    type: 'error' | 'log' | 'event' | 'measurement';
    payload: Record<string, unknown>;
  }): void;

  // --- PDF processing messages ---

  /** Sidepanel sends a PDF for processing (Base64-encoded) */
  processPdf(data: { pdfBase64: string; filename: string }): PdfProcessResult;

  /** Sidepanel queries a PDF job's status */
  getPdfJobStatus(data: { jobId: string }): ExtensionStatus;

  /** Sidepanel requests sending a PDF job to ctview */
  sendPdfJobToCtview(data: { jobId: string }): SendResult;
}

/** Current state of the extension, returned by getStatus */
export interface ExtensionStatus {
  state: 'idle' | 'detected' | 'extracting' | 'normalising' | 'ready' | 'sending' | 'complete' | 'error';
  pageInfo?: PageInfo;
  result?: NormalisationResult;
  lastError?: string;
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();
