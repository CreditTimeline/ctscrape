import { onMessage, sendMessage, type SendResult, type PdfProcessResult } from '@/utils/messaging';
import { scrapeHistory, connectionSettings, type ScrapeHistoryEntry } from '@/utils/storage';
import * as orchestrator from '@/extraction/orchestrator';
import { normalise } from '@/normalizer/engine';
import { updateBadge, clearBadge } from '@/lib/badge';
import { getClient, invalidateClient, testConnection, classifySendError } from '@/lib/ctview-client';
import { enqueueRetry, processRetryQueue, manualRetry } from '@/lib/retry-queue';
import { createLogger, appendLogs, getLogs, rotateLogs, clearAllLogs, exportLogs } from '@/lib/logger';
import { sendGA4Event } from '@/lib/analytics/ga4';
import * as ga4Events from '@/lib/analytics/events';
import { startCollector, pushError, pushEvent, pushMeasurement } from '@/lib/telemetry/collector';
import { exportSupportBundle } from '@/lib/logger/support-bundle';
import { extractTextFromPdf, sha256Buffer } from '@/lib/pdf';
import { detectPdfAdapter } from '@/adapters/pdf-registry';

// Register PDF adapters — side-effect imports
import '@/adapters/equifax-pdf';

export default defineBackground(() => {
  const logger = createLogger('background');

  logger.info('service worker started', { category: 'lifecycle' });

  // Start Faro headless collector for background telemetry
  startCollector();

  browser.runtime.onInstalled.addListener(({ reason, previousVersion }) => {
    if (reason === 'install') {
      logger.info('extension installed', { category: 'lifecycle' });
      sendGA4Event(ga4Events.extensionInstalled().name).catch(() => {});
      pushEvent('extension_installed');
    } else if (reason === 'update') {
      logger.info('extension updated', { category: 'lifecycle' });
      sendGA4Event(ga4Events.extensionUpdated(previousVersion ?? 'unknown').name, ga4Events.extensionUpdated(previousVersion ?? 'unknown').params).catch(() => {});
      pushEvent('extension_updated', { previous_version: previousVersion ?? 'unknown' });
    }
  });

  // --- Settings watcher ---
  // Invalidate cached client when connection settings change
  connectionSettings.watch(() => {
    invalidateClient();
  });

  // --- Retry queue alarm ---
  browser.alarms.create('retryQueue', { periodInMinutes: 1 });
  browser.alarms.create('logRotation', { periodInMinutes: 60 });

  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'retryQueue') {
      processRetryQueue().catch((err) => logger.error('retry queue processing failed', { category: 'retry', error: err }));
    }
    if (alarm.name === 'logRotation') {
      rotateLogs().catch((err) => logger.error('log rotation failed', { category: 'storage', error: err }));
    }
  });

  // Process any pending retries on startup
  processRetryQueue().catch((err) => logger.error('startup retry queue processing failed', { category: 'retry', error: err }));

  // Rotate logs on startup
  rotateLogs().catch((err) => logger.error('startup log rotation failed', { category: 'storage', error: err }));

  // --- Message handlers ---

  onMessage('pageDetected', ({ data, sender }) => {
    const tabId = sender.tab?.id;
    if (tabId == null) return;

    logger.info('page detected', { category: 'lifecycle', data: { tabId, pageInfo: data.pageInfo } });
    orchestrator.onPageDetected(tabId, data.pageInfo.siteName, data.pageInfo);
    updateBadge(tabId, 'detected').catch((err) => logger.error('badge update failed', { category: 'lifecycle', error: err }));

    const evt = ga4Events.pageDetected(data.pageInfo.siteName);
    sendGA4Event(evt.name, evt.params).catch(() => {});
    pushEvent('page_detected', { site_name: data.pageInfo.siteName });
  });

  onMessage('pageLeft', ({ sender }) => {
    const tabId = sender.tab?.id;
    if (tabId == null) return;

    logger.info('page left', { category: 'lifecycle', data: { tabId } });
    orchestrator.onPageLeft(tabId);
    if (tabId != null) {
      clearBadge(tabId).catch((err) => logger.error('badge clear failed', { category: 'lifecycle', error: err }));
    }
  });

  onMessage('extractResult', ({ data, sender }) => {
    const tabId = sender.tab?.id;
    if (tabId == null) return;

    const extractionStart = Date.now();

    logger.info('extraction complete', { category: 'extraction', data: { tabId } });
    updateBadge(tabId, 'extracting').catch((err) => logger.error('badge update failed', { category: 'lifecycle', error: err }));

    orchestrator.onExtractionComplete(tabId, data.rawData, {
      hash: data.rawData.metadata.htmlHash,
      capturedAt: data.rawData.metadata.extractedAt,
      pageUrl: data.rawData.metadata.pageUrl,
    });

    updateBadge(tabId, 'normalising').catch((err) => logger.error('badge update failed', { category: 'lifecycle', error: err }));

    // Normalise the raw data into a CreditFile
    const normStart = Date.now();
    const result = normalise({
      rawData: data.rawData,
      config: {
        defaultSubjectId: 'subject:default',
        currencyCode: 'GBP',
      },
    });
    const normDuration = Date.now() - normStart;

    orchestrator.onNormalisationComplete(tabId, result);
    updateBadge(tabId, result.success ? 'ready' : 'error').catch((err) => logger.error('badge update failed', { category: 'lifecycle', error: err }));

    logger.info('normalisation complete', {
      category: 'normalisation',
      data: {
        tabId,
        success: result.success,
        errors: result.errors.length,
        warnings: result.warnings.length,
        summary: result.summary,
      },
    });

    // Track analytics
    const totalEntities = Object.values(result.summary).reduce((sum, v) => sum + (v as number), 0);
    const extractEvt = ga4Events.extractionCompleted(data.rawData.metadata.adapterId, totalEntities);
    sendGA4Event(extractEvt.name, extractEvt.params).catch(() => {});

    const normEvt = ga4Events.normalisationCompleted(result.success, result.errors.length, result.warnings.length);
    sendGA4Event(normEvt.name, normEvt.params).catch(() => {});

    pushMeasurement('normalisation', { duration_ms: normDuration }, { adapter_id: data.rawData.metadata.adapterId });
    pushMeasurement('extraction_pipeline', { duration_ms: Date.now() - extractionStart }, { adapter_id: data.rawData.metadata.adapterId });

    // Write history entry
    scrapeHistory.getValue().then((history) => {
      const entry: ScrapeHistoryEntry = {
        id: `${Date.now()}-${tabId}`,
        adapterId: data.rawData.metadata.adapterId,
        siteName: data.rawData.metadata.adapterId,
        extractedAt: data.rawData.metadata.extractedAt,
        sentAt: null,
        status: 'pending',
        entityCounts: Object.fromEntries(
          Object.entries(result.summary).filter(([, v]) => (v as number) > 0),
        ),
        receiptId: null,
        error: result.success ? null : result.errors.map((e) => e.message).join('; '),
      };
      return scrapeHistory.setValue([entry, ...history].slice(0, 50));
    }).catch((err) => logger.error('history write failed', { category: 'storage', error: err }));
  });

  onMessage('extractError', ({ data, sender }) => {
    const tabId = sender.tab?.id;
    if (tabId == null) return;

    logger.error('extraction error', { category: 'extraction', data: { tabId, error: data.error } });
    orchestrator.onExtractionError(tabId, data.error);
    updateBadge(tabId, 'error').catch((err) => logger.error('badge update failed', { category: 'lifecycle', error: err }));

    const evt = ga4Events.extractionError('unknown', data.error);
    sendGA4Event(evt.name, evt.params).catch(() => {});
    pushError(new Error(data.error), { context: 'extraction' });
  });

  onMessage('getStatus', async () => {
    // Find the active tab to determine which job to report on
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const tabId = tabs[0]?.id;
    if (tabId == null) {
      return { state: 'idle' as const };
    }
    return orchestrator.getStatusForTab(tabId);
  });

  onMessage('triggerExtract', async () => {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const tabId = tabs[0]?.id;
    if (tabId == null) return;

    orchestrator.onExtractionStarted(tabId);
    await updateBadge(tabId, 'extracting');

    const evt = ga4Events.extractionStarted('unknown');
    sendGA4Event(evt.name, evt.params).catch(() => {});
    pushEvent('extraction_started');

    // Send extractRequest to content script using tabs.sendMessage
    // Format must match @webext-core/messaging internal protocol
    browser.tabs.sendMessage(tabId, {
      type: 'extractRequest',
      data: undefined,
      timestamp: Date.now(),
    });
  });

  onMessage('sendToCtview', async (): Promise<SendResult> => {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const tabId = tabs[0]?.id;
    if (tabId == null) {
      return { success: false, error: 'No active tab found', errorCode: 'NO_TAB' };
    }

    const job = orchestrator.getJob(tabId);
    if (!job || !job.normalisationResult?.creditFile) {
      return { success: false, error: 'No normalised data available to send', errorCode: 'NO_DATA' };
    }

    const client = await getClient();
    if (!client) {
      return {
        success: false,
        error: 'ctview server is not configured',
        errorCode: 'NOT_CONFIGURED',
        suggestion: 'Enter a server URL and API key in Connection Settings.',
      };
    }

    const sendEvt = ga4Events.sendStarted();
    sendGA4Event(sendEvt.name, sendEvt.params).catch(() => {});

    try {
      orchestrator.onSendStarted(tabId);
      updateBadge(tabId, 'sending').catch((err) => logger.error('badge update failed', { category: 'lifecycle', error: err }));

      const sendStart = Date.now();
      const result = await client.ingest(job.normalisationResult.creditFile);
      const sendDuration = Date.now() - sendStart;

      orchestrator.onSendComplete(tabId);
      updateBadge(tabId, 'complete').catch((err) => logger.error('badge update failed', { category: 'lifecycle', error: err }));

      // Update history entry
      await updateHistoryEntry(job.adapterId, job.rawData?.metadata.extractedAt ?? '', {
        status: 'sent',
        sentAt: new Date().toISOString(),
        receiptId: result.receiptId ?? null,
        error: null,
      });

      logger.info('data sent to ctview', { category: 'api', data: { receiptId: result.receiptId, duplicate: result.duplicate } });

      const completedEvt = ga4Events.sendCompleted(result.duplicate ?? false);
      sendGA4Event(completedEvt.name, completedEvt.params).catch(() => {});
      pushMeasurement('ctview_send', { duration_ms: sendDuration });
      pushEvent('send_completed', { duplicate: String(result.duplicate ?? false) });

      // Broadcast for popup
      sendMessage('sendResult', {
        success: true,
        receiptId: result.receiptId,
      }).catch((err) => logger.error('broadcast send result failed', { category: 'lifecycle', error: err }));

      return {
        success: true,
        receiptId: result.receiptId,
        importIds: result.importIds,
        summary: result.summary,
        duplicate: result.duplicate,
      };
    } catch (err) {
      const classified = classifySendError(err);

      orchestrator.onSendError(tabId, classified.error);
      updateBadge(tabId, 'error').catch((e) => logger.error('badge update failed', { category: 'lifecycle', error: e }));

      logger.error('send to ctview failed', { category: 'api', data: { errorCode: classified.errorCode, error: classified.error } });

      const errorEvt = ga4Events.sendError(classified.errorCode);
      sendGA4Event(errorEvt.name, errorEvt.params).catch(() => {});
      pushError(err instanceof Error ? err : new Error(classified.error), { context: 'ctview_send', error_code: classified.errorCode });

      // Update history entry
      const historyId = await updateHistoryEntry(
        job.adapterId,
        job.rawData?.metadata.extractedAt ?? '',
        {
          status: 'failed',
          error: classified.error,
        },
      );

      // Enqueue for retry if retryable
      if (classified.retryable && historyId) {
        await enqueueRetry({
          id: `retry-${Date.now()}`,
          creditFile: job.normalisationResult.creditFile,
          historyId,
          adapterId: job.adapterId,
          extractedAt: job.rawData?.metadata.extractedAt ?? '',
          queuedAt: new Date().toISOString(),
        });
      }

      // Broadcast for popup
      sendMessage('sendResult', {
        success: false,
        error: classified.error,
      }).catch((e) => logger.error('broadcast send result failed', { category: 'lifecycle', error: e }));

      return {
        success: false,
        error: classified.error,
        errorCode: classified.errorCode,
        suggestion: classified.suggestion,
        duplicate: classified.duplicate,
      };
    }
  });

  onMessage('testConnection', async () => {
    const result = await testConnection();
    const evt = ga4Events.connectionTested(result.success);
    sendGA4Event(evt.name, evt.params).catch(() => {});
    return result;
  });

  onMessage('manualRetry', async ({ data }): Promise<SendResult> => {
    try {
      await manualRetry(data.historyId);
      const evt = ga4Events.retryAttempted(true);
      sendGA4Event(evt.name, evt.params).catch(() => {});
      return { success: true };
    } catch (err) {
      const evt = ga4Events.retryAttempted(false);
      sendGA4Event(evt.name, evt.params).catch(() => {});
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  });

  // --- Log message handlers ---

  onMessage('logEntries', ({ data }) => {
    appendLogs(data.entries).catch((err) => logger.error('log append failed', { category: 'storage', error: err }));
  });

  onMessage('getLogs', async ({ data }) => {
    return getLogs(data.filter);
  });

  onMessage('exportLogs', async () => {
    return exportLogs();
  });

  onMessage('clearLogs', () => {
    clearAllLogs().catch((err) => logger.error('log clear failed', { category: 'storage', error: err }));
  });

  // --- Support bundle ---

  onMessage('exportSupportBundle', async () => {
    return exportSupportBundle();
  });

  // --- Analytics event forwarding ---

  onMessage('trackEvent', ({ data }) => {
    sendGA4Event(data.eventName, data.params).catch(() => {});
  });

  // --- PDF processing handlers ---

  onMessage('processPdf', async ({ data }): Promise<PdfProcessResult> => {
    try {
      // Decode Base64 to ArrayBuffer
      const binaryString = atob(data.pdfBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const pdfBuffer = bytes.buffer;

      // Extract text from PDF
      const textResult = await extractTextFromPdf(pdfBuffer);
      logger.info('PDF text extracted', { category: 'extraction', data: { pageCount: textResult.pageCount, textLength: textResult.fullText.length } });

      // Compute SHA-256 hash for provenance
      const pdfHash = await sha256Buffer(pdfBuffer);

      // Auto-detect adapter from first 2000 chars of text
      const adapter = detectPdfAdapter(textResult.fullText.substring(0, 2000));
      if (!adapter) {
        return { detected: false, error: 'Unrecognised PDF format. This does not appear to be a supported credit report.' };
      }

      // Get report info
      const reportInfo = adapter.getReportInfo(textResult.fullText);
      reportInfo.pageCount = textResult.pageCount;

      // Create job
      const jobId = `pdf-${Date.now()}`;
      const job = orchestrator.createPdfJob(jobId, adapter.id);
      job.pageInfo = {
        siteName: adapter.name,
        subjectName: reportInfo.subjectName,
        reportDate: reportInfo.reportDate,
        providers: ['Equifax'],
      };

      logger.info('PDF adapter detected', { category: 'extraction', data: { adapterId: adapter.id, jobId, reportInfo } });

      // Run extraction
      orchestrator.onPdfExtractionStarted(jobId);
      const rawData = await adapter.extract({
        fullText: textResult.fullText,
        pages: textResult.pages,
        pageCount: textResult.pageCount,
        filename: data.filename,
      });

      // Set the hash from the PDF bytes
      rawData.metadata.htmlHash = pdfHash;

      orchestrator.onPdfExtractionComplete(jobId, rawData, {
        hash: pdfHash,
        filename: data.filename,
        pageCount: textResult.pageCount,
        extractedAt: rawData.metadata.extractedAt,
      });

      // Normalise
      const normStart = Date.now();
      const result = normalise({
        rawData,
        config: {
          defaultSubjectId: 'subject:default',
          currencyCode: 'GBP',
        },
        pageInfo: job.pageInfo,
      });
      const normDuration = Date.now() - normStart;

      orchestrator.onPdfNormalisationComplete(jobId, result);

      logger.info('PDF normalisation complete', {
        category: 'normalisation',
        data: { jobId, success: result.success, errors: result.errors.length, warnings: result.warnings.length, summary: result.summary },
      });

      // Track analytics
      const totalEntities = Object.values(result.summary).reduce((sum, v) => sum + (v as number), 0);
      const extractEvt = ga4Events.extractionCompleted(adapter.id, totalEntities);
      sendGA4Event(extractEvt.name, extractEvt.params).catch(() => {});
      pushMeasurement('normalisation', { duration_ms: normDuration }, { adapter_id: adapter.id });

      // Write history entry
      scrapeHistory.getValue().then((history) => {
        const entry: ScrapeHistoryEntry = {
          id: `${Date.now()}-pdf-${jobId}`,
          adapterId: adapter.id,
          siteName: adapter.name,
          extractedAt: rawData.metadata.extractedAt,
          sentAt: null,
          status: 'pending',
          entityCounts: Object.fromEntries(
            Object.entries(result.summary).filter(([, v]) => (v as number) > 0),
          ),
          receiptId: null,
          error: result.success ? null : result.errors.map((e) => e.message).join('; '),
        };
        return scrapeHistory.setValue([entry, ...history].slice(0, 50));
      }).catch((err) => logger.error('history write failed', { category: 'storage', error: err }));

      return { detected: true, jobId, adapterId: adapter.id, reportInfo };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('PDF processing failed', { category: 'extraction', data: { error: message } });
      pushError(err instanceof Error ? err : new Error(message), { context: 'pdf_processing' });
      return { detected: false, error: `PDF processing failed: ${message}` };
    }
  });

  onMessage('getPdfJobStatus', async ({ data }) => {
    return orchestrator.getStatusForJob(data.jobId);
  });

  onMessage('sendPdfJobToCtview', async ({ data }): Promise<SendResult> => {
    const job = orchestrator.getJobById(data.jobId);
    if (!job || !job.normalisationResult?.creditFile) {
      return { success: false, error: 'No normalised PDF data available to send', errorCode: 'NO_DATA' };
    }

    const client = await getClient();
    if (!client) {
      return {
        success: false,
        error: 'ctview server is not configured',
        errorCode: 'NOT_CONFIGURED',
        suggestion: 'Enter a server URL and API key in Connection Settings.',
      };
    }

    try {
      orchestrator.onPdfSendStarted(data.jobId);

      const sendStart = Date.now();
      const result = await client.ingest(job.normalisationResult.creditFile);
      const sendDuration = Date.now() - sendStart;

      orchestrator.onPdfSendComplete(data.jobId);

      await updateHistoryEntry(job.adapterId, job.rawData?.metadata.extractedAt ?? '', {
        status: 'sent',
        sentAt: new Date().toISOString(),
        receiptId: result.receiptId ?? null,
        error: null,
      });

      logger.info('PDF data sent to ctview', { category: 'api', data: { jobId: data.jobId, receiptId: result.receiptId } });
      pushMeasurement('ctview_send', { duration_ms: sendDuration });

      return {
        success: true,
        receiptId: result.receiptId,
        importIds: result.importIds,
        summary: result.summary,
        duplicate: result.duplicate,
      };
    } catch (err) {
      const classified = classifySendError(err);
      orchestrator.onPdfSendError(data.jobId, classified.error);
      logger.error('PDF send to ctview failed', { category: 'api', data: { errorCode: classified.errorCode, error: classified.error } });

      await updateHistoryEntry(job.adapterId, job.rawData?.metadata.extractedAt ?? '', {
        status: 'failed',
        error: classified.error,
      });

      return {
        success: false,
        error: classified.error,
        errorCode: classified.errorCode,
        suggestion: classified.suggestion,
        duplicate: classified.duplicate,
      };
    }
  });

  // --- Telemetry event forwarding (from content scripts) ---

  onMessage('telemetryEvent', ({ data }) => {
    if (data.type === 'error') {
      const payload = data.payload as { message?: string; name?: string };
      pushError(new Error(payload.message ?? 'Unknown error'));
    } else if (data.type === 'event') {
      const payload = data.payload as { name?: string; attributes?: Record<string, string> };
      pushEvent(payload.name ?? 'unknown', payload.attributes);
    } else if (data.type === 'measurement') {
      const payload = data.payload as { type?: string; values?: Record<string, number> };
      pushMeasurement(payload.type ?? 'unknown', payload.values ?? {});
    }
  });

  // Clean up jobs when tabs are closed
  browser.tabs.onRemoved.addListener((tabId) => {
    clearBadge(tabId).catch((err) => logger.error('badge clear failed', { category: 'lifecycle', error: err }));
    orchestrator.onPageLeft(tabId);
  });
});

/**
 * Find and update a history entry by adapterId + extractedAt.
 * Returns the history entry id if found, or null if not found.
 */
async function updateHistoryEntry(
  adapterId: string,
  extractedAt: string,
  update: Partial<Pick<ScrapeHistoryEntry, 'status' | 'sentAt' | 'receiptId' | 'error'>>,
): Promise<string | null> {
  const history = await scrapeHistory.getValue();
  const idx = history.findIndex(
    (h) => h.adapterId === adapterId && h.extractedAt === extractedAt,
  );
  if (idx === -1) return null;

  const entry = history[idx]!;
  history[idx] = { ...entry, ...update };
  await scrapeHistory.setValue(history);
  return entry.id;
}
