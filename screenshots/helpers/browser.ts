/**
 * Browser helpers for screenshot generation.
 * Wraps e2e/helpers/extension.ts and adds screenshot-specific utilities.
 */

import type { Browser, Page } from 'puppeteer';
import { resolve } from 'path';

export { launchBrowserWithExtension, getExtensionId } from '../../e2e/helpers/extension';

const OUTPUT_DIR = resolve(__dirname, '../output');

export const VIEWPORT = { width: 1280, height: 800 };

/**
 * Open the sidepanel page with a 1280x800 viewport.
 * Callers should inject mocks (via evaluateOnNewDocument) BEFORE calling this,
 * since evaluateOnNewDocument must be set up before navigation.
 */
export async function openSidepanel(extensionId: string, page: Page): Promise<Page> {
  await page.setViewport(VIEWPORT);
  await page.goto(`chrome-extension://${extensionId}/sidepanel.html`, {
    waitUntil: 'domcontentloaded',
  });
  return page;
}

/**
 * Create a new page without navigating — used so evaluateOnNewDocument
 * can be set up before the first navigation.
 */
export async function createPage(browser: Browser): Promise<Page> {
  return browser.newPage();
}

/**
 * Wait for a CSS selector to appear, then an extra settle delay.
 */
export async function waitForRender(page: Page, selector: string, extraMs = 500): Promise<void> {
  await page.waitForSelector(selector, { timeout: 15_000 });
  if (extraMs > 0) {
    await new Promise((r) => setTimeout(r, extraMs));
  }
}

/**
 * Take a screenshot saved to the output directory.
 */
export async function screenshot(page: Page, filename: string): Promise<void> {
  const path = resolve(OUTPUT_DIR, filename);
  await page.screenshot({ path });
}
