import { getAdapterForUrl } from '@/adapters/registry';
import { captureWithHash } from '@/utils/html-capture';
import { sendMessage, onMessage } from '@/utils/messaging';
import type { SiteAdapter } from '@/adapters/types';

export default defineContentScript({
  matches: ['*://*.checkmyfile.com/*'],
  runAt: 'document_idle',

  main(ctx) {
    console.log('[ctscrape] content script loaded on', window.location.href);

    let currentAdapter: SiteAdapter | null = null;

    function detectPage(): void {
      const adapter = getAdapterForUrl(location.href);
      if (!adapter || !adapter.detect(document)) {
        if (currentAdapter) {
          // Was previously detected, now left
          currentAdapter = null;
          sendMessage('pageLeft', undefined).catch(console.error);
        }
        return;
      }

      currentAdapter = adapter;
      const pageInfo = adapter.getPageInfo(document);
      console.log('[ctscrape] page detected:', adapter.name, pageInfo);
      sendMessage('pageDetected', { pageInfo }).catch(console.error);
    }

    // Detect on initial load
    detectPage();

    // Handle extraction requests from the background service worker
    onMessage('extractRequest', async () => {
      if (!currentAdapter) {
        sendMessage('extractError', {
          error: 'No adapter active for this page',
        }).catch(console.error);
        return;
      }

      try {
        // Capture HTML and hash for provenance (AD-009)
        const { hash } = await captureWithHash(document.documentElement);

        // Run the adapter's extraction
        const rawData = await currentAdapter.extract(document);

        // Set the HTML hash on the extraction metadata
        rawData.metadata.htmlHash = hash;

        sendMessage('extractResult', { rawData }).catch(console.error);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        sendMessage('extractError', {
          error: message,
          details: err instanceof Error ? err.stack : undefined,
        }).catch(console.error);
      }
    });

    // Re-detect on SPA navigation (WXT fires this on URL changes)
    ctx.addEventListener(window, 'wxt:locationchange', () => {
      detectPage();
    });

    // Clean up on invalidation (extension update, disable, etc.)
    ctx.onInvalidated(() => {
      console.log('[ctscrape] content script invalidated');
      currentAdapter = null;
    });
  },
});
