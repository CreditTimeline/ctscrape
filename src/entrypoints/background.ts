import { onMessage, sendMessage } from '@/utils/messaging';
import { scrapeHistory, type ScrapeHistoryEntry } from '@/utils/storage';
import * as orchestrator from '@/extraction/orchestrator';
import { normalise } from '@/normalizer/engine';
import { updateBadge, clearBadge } from '@/lib/badge';

export default defineBackground(() => {
  console.log('[ctscrape] service worker started');

  browser.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === 'install') {
      console.log('[ctscrape] extension installed');
    } else if (reason === 'update') {
      console.log('[ctscrape] extension updated');
    }
  });

  // --- Message handlers ---

  onMessage('pageDetected', ({ data, sender }) => {
    const tabId = sender.tab?.id;
    if (tabId == null) return;

    console.log('[ctscrape] page detected on tab', tabId, data.pageInfo);
    orchestrator.onPageDetected(tabId, data.pageInfo.siteName, data.pageInfo);
    updateBadge(tabId, 'detected').catch(console.error);
  });

  onMessage('pageLeft', ({ sender }) => {
    const tabId = sender.tab?.id;
    if (tabId == null) return;

    console.log('[ctscrape] page left on tab', tabId);
    orchestrator.onPageLeft(tabId);
    if (tabId != null) {
      clearBadge(tabId).catch(console.error);
    }
  });

  onMessage('extractResult', ({ data, sender }) => {
    const tabId = sender.tab?.id;
    if (tabId == null) return;

    console.log('[ctscrape] extraction complete on tab', tabId);
    updateBadge(tabId, 'extracting').catch(console.error);

    orchestrator.onExtractionComplete(tabId, data.rawData, {
      hash: data.rawData.metadata.htmlHash,
      capturedAt: data.rawData.metadata.extractedAt,
      pageUrl: data.rawData.metadata.pageUrl,
    });

    updateBadge(tabId, 'normalising').catch(console.error);

    // Normalise the raw data into a CreditFile
    const result = normalise({
      rawData: data.rawData,
      config: {
        defaultSubjectId: 'subject:default',
        currencyCode: 'GBP',
      },
    });

    orchestrator.onNormalisationComplete(tabId, result);
    updateBadge(tabId, result.success ? 'ready' : 'error').catch(console.error);

    console.log('[ctscrape] normalisation complete on tab', tabId, {
      success: result.success,
      errors: result.errors.length,
      warnings: result.warnings.length,
      summary: result.summary,
    });

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
    }).catch(console.error);
  });

  onMessage('extractError', ({ data, sender }) => {
    const tabId = sender.tab?.id;
    if (tabId == null) return;

    console.error('[ctscrape] extraction error on tab', tabId, data.error);
    orchestrator.onExtractionError(tabId, data.error);
    updateBadge(tabId, 'error').catch(console.error);
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

    // Send extractRequest to content script using tabs.sendMessage
    // Format must match @webext-core/messaging internal protocol
    browser.tabs.sendMessage(tabId, {
      type: 'extractRequest',
      data: undefined,
      timestamp: Date.now(),
    });
  });

  onMessage('sendToCtview', async () => {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const tabId = tabs[0]?.id;
    if (tabId == null) {
      sendMessage('sendResult', {
        success: false,
        error: 'No active tab found',
      }).catch(console.error);
      return;
    }

    try {
      orchestrator.onSendStarted(tabId);
      updateBadge(tabId, 'sending').catch(console.error);

      // Phase 1 stub: ctview integration not yet implemented
      orchestrator.onSendError(tabId, 'ctview integration not yet implemented');
      updateBadge(tabId, 'error').catch(console.error);
      sendMessage('sendResult', {
        success: false,
        error: 'ctview integration not yet implemented',
      }).catch(console.error);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      sendMessage('sendResult', {
        success: false,
        error: message,
      }).catch(console.error);
    }
  });

  // Clean up jobs when tabs are closed
  browser.tabs.onRemoved.addListener((tabId) => {
    clearBadge(tabId).catch(console.error);
    orchestrator.onPageLeft(tabId);
  });
});
