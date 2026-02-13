/**
 * Action badge — updates the extension icon badge text and colour
 * based on the current ExtractionState.
 */

import type { ExtractionState } from '../extraction/types';

interface BadgeConfig {
  text: string;
  color: string;
}

const BADGE_MAP: Record<ExtractionState, BadgeConfig> = {
  idle: { text: '', color: '#9ca3af' },
  detected: { text: '!', color: '#3b82f6' },
  extracting: { text: '...', color: '#f59e0b' },
  normalising: { text: '...', color: '#f59e0b' },
  ready: { text: 'OK', color: '#10b981' },
  sending: { text: '...', color: '#f59e0b' },
  complete: { text: 'OK', color: '#10b981' },
  error: { text: 'ERR', color: '#ef4444' },
};

/** Update the action badge for a given tab. */
export async function updateBadge(tabId: number, state: ExtractionState): Promise<void> {
  const config = BADGE_MAP[state];
  await Promise.all([
    browser.action.setBadgeText({ text: config.text, tabId }),
    browser.action.setBadgeBackgroundColor({ color: config.color, tabId }),
  ]);
}

/** Clear the action badge for a given tab. */
export async function clearBadge(tabId: number): Promise<void> {
  await browser.action.setBadgeText({ text: '', tabId });
}
