import { sendMessage } from '@/utils/messaging';
import { createLogger } from '@/lib/logger';
import type { LogEntry } from '@/lib/logger';

const OLDER_REPORT_HASH = '#/products/older-credit-report';

export default defineContentScript({
  matches: ['*://*.equifax.co.uk/*'],
  runAt: 'document_idle',

  main(ctx) {
    const logger = createLogger('equifax-content', async (entries: LogEntry[]) => {
      await sendMessage('logEntries', { entries });
    });

    logger.info('equifax content script loaded', {
      category: 'lifecycle',
      data: { url: window.location.href },
    });

    let detected = false;

    function detectPage(): void {
      const isOlderReportPage = location.hash.includes(OLDER_REPORT_HASH);

      if (isOlderReportPage && !detected) {
        detected = true;
        logger.info('older-report page detected', { category: 'adapter', data: { hash: location.hash } });
        sendMessage('pageDetected', {
          pageInfo: {
            siteName: 'Equifax',
            providers: ['Equifax'],
            subjectName: undefined,
            reportDate: undefined,
          },
        }).catch((err) =>
          logger.error('pageDetected message failed', { category: 'lifecycle', error: err }),
        );
      } else if (!isOlderReportPage && detected) {
        detected = false;
        sendMessage('pageLeft', undefined).catch((err) =>
          logger.error('pageLeft message failed', { category: 'lifecycle', error: err }),
        );
      }
    }

    // Detect on initial load
    detectPage();

    // Re-detect on SPA navigation (hash changes)
    ctx.addEventListener(window, 'wxt:locationchange', () => {
      detectPage();
    });

    // Clean up on invalidation
    ctx.onInvalidated(() => {
      logger.info('equifax content script invalidated', { category: 'lifecycle' });
      logger.flush().catch(() => {});
      detected = false;
    });
  },
});
