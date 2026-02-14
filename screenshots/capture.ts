/**
 * Chrome Web Store screenshot generation.
 *
 * Captures 4 screenshots of the sidepanel in different UI states:
 *   01 - Connection Settings (configured + "Server ready")
 *   02 - Extraction Results (entity summary grid)
 *   03 - Send Confirmation (success with receipt link)
 *   04 - History (mixed statuses)
 *
 * Run: pnpm screenshots
 */

import { describe, it, beforeAll, afterAll } from 'vitest';
import type { Browser } from 'puppeteer';
import {
  launchBrowserWithExtension,
  getExtensionId,
  createPage,
  openSidepanel,
  waitForRender,
  screenshot,
} from './helpers/browser';
import { injectMessageMock, injectStorageData } from './helpers/inject';
import {
  MOCK_CONNECTION_SETTINGS,
  MOCK_PAGE_INFO,
  MOCK_SUCCESS_RESULT,
  MOCK_SEND_RESULT,
  MOCK_HISTORY_ENTRIES,
} from './helpers/mock-data';

describe('Chrome Web Store screenshots', () => {
  let browser: Browser;
  let extensionId: string;

  beforeAll(async () => {
    browser = await launchBrowserWithExtension();
    extensionId = await getExtensionId(browser);
  });

  afterAll(async () => {
    await browser?.close();
  });

  it('01 - Connection Settings', async () => {
    const page = await createPage(browser);

    // Inject storage: connection configured so fields are pre-filled
    await injectStorageData(page, {
      sync: { connectionSettings: MOCK_CONNECTION_SETTINGS },
    });

    // Mock messages: idle status + successful test connection
    await injectMessageMock(page, {
      responses: {
        getStatus: { state: 'idle' },
        testConnection: { success: true },
        getLogs: [],
      },
    });

    await openSidepanel(extensionId, page);

    // Wait for storage poll to fill in form fields (polls every 2s)
    await waitForRender(page, '.sidepanel', 3000);

    // Expand the Connection Settings section (collapsed when isConfigured=true)
    // The first ExpandableSection is Connection Settings
    const expandHeader = await page.$('.expandable-section .header');
    if (expandHeader) {
      await expandHeader.click();
      await new Promise((r) => setTimeout(r, 300));
    }

    // Click "Test Connection" button
    const testBtn = await page.waitForSelector('.btn.btn-secondary:not(:disabled)', {
      timeout: 5000,
    });
    if (testBtn) {
      const text = await testBtn.evaluate((el) => el.textContent ?? '');
      if (text.includes('Test Connection')) {
        await testBtn.click();
      }
    }

    // Wait for "Server ready" green status
    await page.waitForFunction(
      () => document.querySelector('.status.connected')?.textContent?.includes('Server ready'),
      { timeout: 5000 },
    );
    await new Promise((r) => setTimeout(r, 300));

    await screenshot(page, '01-connection-settings.png');
    await page.close();
  });

  it('02 - Extraction Results', async () => {
    const page = await createPage(browser);

    await injectStorageData(page, {
      sync: { connectionSettings: MOCK_CONNECTION_SETTINGS },
    });

    // Mock: extraction ready with results
    await injectMessageMock(page, {
      responses: {
        getStatus: {
          state: 'ready',
          pageInfo: MOCK_PAGE_INFO,
          result: MOCK_SUCCESS_RESULT,
        },
        getLogs: [],
      },
    });

    await openSidepanel(extensionId, page);

    // Wait for extraction results to render (status poller fires within ~1s)
    await waitForRender(page, '.extraction-results', 1000);

    // Scroll to center extraction results in view
    await page.evaluate(() => {
      document.querySelector('.extraction-results')?.scrollIntoView({ block: 'center' });
    });
    await new Promise((r) => setTimeout(r, 300));

    await screenshot(page, '02-extraction-results.png');
    await page.close();
  });

  it('03 - Send Confirmation', async () => {
    const page = await createPage(browser);

    await injectStorageData(page, {
      sync: { connectionSettings: MOCK_CONNECTION_SETTINGS },
    });

    // Stateful mock: getStatus starts at 'ready', flips to 'complete' after sendToCtview
    await injectMessageMock(page, {
      responses: {
        getStatus: {
          state: 'ready',
          pageInfo: MOCK_PAGE_INFO,
          result: MOCK_SUCCESS_RESULT,
        },
        sendToCtview: MOCK_SEND_RESULT,
        testConnection: { success: true },
        getLogs: [],
      },
      stateful: true,
    });

    await openSidepanel(extensionId, page);

    // Wait for "Send to ctview" button
    await waitForRender(page, '.send-section .btn-primary', 1500);

    // Click "Send to ctview" → opens ConfirmDialog
    const sendBtn = await page.$('.send-section .btn-primary');
    await sendBtn?.click();

    // Wait for confirm dialog overlay
    await page.waitForSelector('.overlay .dialog', { timeout: 5000 });
    await new Promise((r) => setTimeout(r, 200));

    // Click the "Send" confirm button in the dialog
    const confirmBtn = await page.$('.overlay .dialog .btn-primary');
    await confirmBtn?.click();

    // Wait for success message after send completes + status transitions
    await page.waitForFunction(
      () => document.body.textContent?.includes('Data sent successfully'),
      { timeout: 10000 },
    );
    await new Promise((r) => setTimeout(r, 500));

    // Scroll to show the send confirmation section
    await page.evaluate(() => {
      document.querySelector('.send-section')?.scrollIntoView({ block: 'center' });
    });
    await new Promise((r) => setTimeout(r, 300));

    await screenshot(page, '03-send-confirmation.png');
    await page.close();
  });

  it('04 - History', async () => {
    const page = await createPage(browser);

    await injectStorageData(page, {
      sync: { connectionSettings: MOCK_CONNECTION_SETTINGS },
      local: { scrapeHistory: MOCK_HISTORY_ENTRIES },
    });

    await injectMessageMock(page, {
      responses: {
        getStatus: { state: 'idle' },
        getLogs: [],
      },
    });

    await openSidepanel(extensionId, page);

    // Wait for history entries to render (storage polls every 2s)
    await waitForRender(page, '.entry-list', 3000);

    // Scroll to center History section
    await page.evaluate(() => {
      document.querySelector('.history')?.scrollIntoView({ block: 'center' });
    });
    await new Promise((r) => setTimeout(r, 300));

    await screenshot(page, '04-history.png');
    await page.close();
  });
});
