import puppeteer from 'puppeteer';
import type { Browser, Page } from 'puppeteer';
import { resolve } from 'path';

const EXTENSION_PATH = resolve(__dirname, '../../.output/chrome-mv3');

/**
 * Launch Chrome with the built extension loaded.
 *
 * Uses the default headless mode (full Chrome, not chrome-headless-shell)
 * which supports MV3 extensions since Puppeteer v22+.
 * Set HEADLESS=false to run headed (useful for local debugging).
 */
export async function launchBrowserWithExtension(): Promise<Browser> {
  return puppeteer.launch({
    headless: process.env.HEADLESS === 'false' ? false : true,
    pipe: true,
    executablePath: process.env.CHROME_PATH,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-first-run',
      '--disable-default-apps',
      '--disable-gpu',
      ...(process.env.CI ? ['--no-sandbox'] : []),
    ],
  });
}

export async function getExtensionId(browser: Browser): Promise<string> {
  const swTarget = await browser.waitForTarget(
    (t) => t.type() === 'service_worker' && t.url().includes('chrome-extension://'),
    { timeout: 30_000 },
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
