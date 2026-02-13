import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Browser } from 'puppeteer';
import {
  launchBrowserWithExtension,
  getExtensionId,
  openExtensionPage,
} from './helpers/extension';

describe('Extension loading', () => {
  let browser: Browser;
  let extensionId: string;

  beforeAll(async () => {
    browser = await launchBrowserWithExtension();
    extensionId = await getExtensionId(browser);
  });

  afterAll(async () => {
    await browser?.close();
  });

  it('loads and has a service worker', () => {
    expect(extensionId).toBeTruthy();
    expect(extensionId.length).toBeGreaterThan(0);
  });

  it('popup page renders', async () => {
    const page = await openExtensionPage(browser, extensionId, 'popup.html');
    const body = await page.$eval('body', (el) => el.textContent);
    expect(body).toBeTruthy();
    await page.close();
  });

  it('sidepanel page renders', async () => {
    const page = await openExtensionPage(browser, extensionId, 'sidepanel.html');
    await page.waitForSelector('body', { timeout: 5000 });
    const body = await page.$eval('body', (el) => el.textContent ?? '');
    expect(body.length).toBeGreaterThan(0);
    await page.close();
  });
});
