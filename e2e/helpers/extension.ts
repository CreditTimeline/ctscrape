import puppeteer from 'puppeteer';
import type { Browser, Page } from 'puppeteer';
import { resolve } from 'path';

const EXTENSION_PATH = resolve(__dirname, '../../.output/chrome-mv3');

/**
 * Launch Chrome with the built extension loaded.
 *
 * MV3 extensions do NOT work in old headless mode. They require either:
 * - headed mode (headless: false) — needs a display (or xvfb in CI)
 * - new headless mode (headless: 'shell') — but this doesn't support extensions
 *
 * Default is headless: false. In CI, wrap with xvfb-run or similar.
 * Set CHROME_PATH to override the Chrome binary location.
 */
export async function launchBrowserWithExtension(): Promise<Browser> {
  return puppeteer.launch({
    headless: false,
    executablePath: process.env.CHROME_PATH,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-first-run',
      '--disable-default-apps',
      '--disable-gpu',
    ],
  });
}

export async function getExtensionId(browser: Browser): Promise<string> {
  const swTarget = await browser.waitForTarget(
    (t) => t.type() === 'service_worker' && t.url().includes('chrome-extension://'),
    { timeout: 10_000 },
  );
  const url = swTarget.url();
  const match = url.match(/chrome-extension:\/\/([a-z]+)\//);
  if (!match?.[1]) throw new Error(`Could not extract extension ID from ${url}`);
  return match[1];
}

export async function openExtensionPage(
  browser: Browser,
  extensionId: string,
  path: string,
): Promise<Page> {
  const page = await browser.newPage();
  await page.goto(`chrome-extension://${extensionId}/${path}`, {
    waitUntil: 'domcontentloaded',
  });
  return page;
}
