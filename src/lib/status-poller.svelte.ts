/**
 * Status poller — reactive polling of the background service worker's
 * ExtractionState via getStatus message.
 * Uses Svelte 5 runes ($state) — requires .svelte.ts extension.
 */

import { sendMessage, type ExtensionStatus } from '../utils/messaging';

const POLL_INTERVAL = 1000;

export interface StatusPoller {
  readonly status: ExtensionStatus;
  start(): void;
  stop(): void;
}

/** Create a reactive status poller. Call start() to begin polling. */
export function createStatusPoller(): StatusPoller {
  let status = $state<ExtensionStatus>({ state: 'idle' });
  let timer: ReturnType<typeof setInterval> | null = null;

  async function poll(): Promise<void> {
    try {
      const result = await sendMessage('getStatus', undefined);
      status = result;
    } catch {
      // Service worker may not be ready yet — keep current status
    }
  }

  function start(): void {
    if (timer) return;
    poll(); // immediate first poll
    timer = setInterval(poll, POLL_INTERVAL);
  }

  function stop(): void {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  return {
    get status() {
      return status;
    },
    start,
    stop,
  };
}
