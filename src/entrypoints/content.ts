import '@/adapters/checkmyfile';
import { getAdapterForUrl } from '@/adapters/registry';
import { captureWithHash } from '@/utils/html-capture';
import { sendMessage, onMessage } from '@/utils/messaging';
import type { SiteAdapter } from '@/adapters/types';
import { createLogger } from '@/lib/logger';
import type { LogEntry } from '@/lib/logger';

export default defineContentScript({
  matches: ['*://*.checkmyfile.com/*'],
  runAt: 'document_idle',

  main(ctx) {
    // Content script logger: flushes entries to background via logEntries message
    const logger = createLogger('content', async (entries: LogEntry[]) => {
      await sendMessage('logEntries', { entries });
    });

    logger.info('content script loaded', { category: 'lifecycle', data: { url: window.location.href } });

    let currentAdapter: SiteAdapter | null = null;

    function detectPage(): void {
      const adapter = getAdapterForUrl(location.href);
      if (!adapter || !adapter.detect(document)) {
        if (currentAdapter) {
          // Was previously detected, now left
          currentAdapter = null;
          sendMessage('pageLeft', undefined).catch((err) => logger.error('pageLeft message failed', { category: 'lifecycle', error: err }));
        }
        return;
      }

      currentAdapter = adapter;
      const pageInfo = adapter.getPageInfo(document);
      logger.info('page detected', { category: 'adapter', data: { adapter: adapter.name, pageInfo } });
      sendMessage('pageDetected', { pageInfo }).catch((err) => logger.error('pageDetected message failed', { category: 'lifecycle', error: err }));
    }

    // Detect on initial load
    detectPage();

    // Handle extraction requests from the background service worker
    onMessage('extractRequest', async () => {
      if (!currentAdapter) {
        sendMessage('extractError', {
          error: 'No adapter active for this page',
        }).catch((err) => logger.error('extractError message failed', { category: 'extraction', error: err }));
        return;
      }

      try {
        // Capture HTML and hash for provenance (AD-009)
        const { hash } = await captureWithHash(document.documentElement);

        // Run the adapter's extraction
        const rawData = await currentAdapter.extract(document);

        // Set the HTML hash on the extraction metadata
        rawData.metadata.htmlHash = hash;

        sendMessage('extractResult', { rawData }).catch((err) => logger.error('extractResult message failed', { category: 'extraction', error: err }));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error('extraction failed', { category: 'extraction', error: err });
        sendMessage('extractError', {
          error: message,
          details: err instanceof Error ? err.stack : undefined,
        }).catch((e) => logger.error('extractError message failed', { category: 'extraction', error: e }));
      }
    });

    // Re-detect on SPA navigation (WXT fires this on URL changes)
    ctx.addEventListener(window, 'wxt:locationchange', () => {
      detectPage();
    });

    // Clean up on invalidation (extension update, disable, etc.)
    ctx.onInvalidated(() => {
      logger.info('content script invalidated', { category: 'lifecycle' });
      logger.flush().catch(() => {});
      currentAdapter = null;
    });
  },
});
