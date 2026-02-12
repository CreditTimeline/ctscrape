import { onMessage, sendMessage } from '@/utils/messaging';
import * as orchestrator from '@/extraction/orchestrator';
import type { NormalisationResult } from '@/normalizer/types';

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
    // pageDetected resets any existing job for this tab
    orchestrator.onPageDetected(tabId, data.pageInfo.siteName, data.pageInfo);
  });

  onMessage('pageLeft', ({ sender }) => {
    const tabId = sender.tab?.id;
    if (tabId == null) return;

    console.log('[ctscrape] page left on tab', tabId);
    orchestrator.onPageLeft(tabId);
  });

  onMessage('extractResult', ({ data, sender }) => {
    const tabId = sender.tab?.id;
    if (tabId == null) return;

    console.log('[ctscrape] extraction complete on tab', tabId);
    orchestrator.onExtractionComplete(tabId, data.rawData, {
      hash: data.rawData.metadata.htmlHash,
      capturedAt: data.rawData.metadata.extractedAt,
      pageUrl: data.rawData.metadata.pageUrl,
    });

    // Phase 1 stub: normalisation not yet implemented.
    // Immediately complete with a stub result so the full message flow can be tested.
    const stubResult: NormalisationResult = {
      success: false,
      creditFile: null,
      errors: [{ domain: 'system', message: 'Normalisation not yet implemented' }],
      warnings: [],
      summary: {
        personNames: 0,
        addresses: 0,
        tradelines: 0,
        searches: 0,
        creditScores: 0,
        publicRecords: 0,
        electoralRollEntries: 0,
        financialAssociates: 0,
        fraudMarkers: 0,
        noticesOfCorrection: 0,
      },
    };

    orchestrator.onNormalisationComplete(tabId, stubResult);
    console.log('[ctscrape] stub normalisation complete on tab', tabId);
  });

  onMessage('extractError', ({ data, sender }) => {
    const tabId = sender.tab?.id;
    if (tabId == null) return;

    console.error('[ctscrape] extraction error on tab', tabId, data.error);
    orchestrator.onExtractionError(tabId, data.error);
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

      // Phase 1 stub: ctview integration not yet implemented
      orchestrator.onSendError(tabId, 'ctview integration not yet implemented');
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
    orchestrator.onPageLeft(tabId);
  });
});
