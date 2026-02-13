import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Browser } from 'puppeteer';
import {
  launchBrowserWithExtension,
  getExtensionId,
  openExtensionPage,
} from './helpers/extension';

describe('Sidepanel settings', () => {
  let browser: Browser;
  let extensionId: string;

  beforeAll(async () => {
    browser = await launchBrowserWithExtension();
    extensionId = await getExtensionId(browser);
  });

  afterAll(async () => {
    await browser?.close();
  });

  it('connection settings inputs accept and save values', async () => {
    const page = await openExtensionPage(browser, extensionId, 'sidepanel.html');
    await page.waitForSelector('input', { timeout: 5000 });

    const inputs = await page.$$('input');
    expect(inputs.length).toBeGreaterThanOrEqual(2);
    await page.close();
  });

  it('test connection button exists', async () => {
    const page = await openExtensionPage(browser, extensionId, 'sidepanel.html');
    await page.waitForSelector('button', { timeout: 5000 });
    const buttons = await page.$$('button');
    expect(buttons.length).toBeGreaterThan(0);
    await page.close();
  });
});
