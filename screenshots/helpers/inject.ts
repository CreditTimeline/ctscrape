/**
 * State injection helpers for screenshot generation.
 *
 * Uses page.evaluateOnNewDocument() to monkey-patch chrome.runtime.sendMessage
 * and seed chrome.storage before page scripts execute — no production code changes.
 *
 * @webext-core/messaging sends messages as { id, type, data, timestamp }
 * and expects responses as { res, err }.
 *
 * The webextension-polyfill always uses the callback pattern when calling
 * chrome.runtime.sendMessage(message, callback), so our mock must call the
 * callback rather than just returning a Promise.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Page } from 'puppeteer';

export interface MessageMockConfig {
  /** Map of message type → response payload. Returned as { res: payload }. */
  responses: Record<string, unknown>;
  /**
   * When true, calling 'sendToCtview' flips the getStatus response
   * from state:'ready' to state:'complete' with the sendToCtview result.
   */
  stateful?: boolean;
}

/**
 * Intercept chrome.runtime.sendMessage to return mock responses
 * for known message types, passing through others to the real handler.
 */
export async function injectMessageMock(page: Page, config: MessageMockConfig): Promise<void> {
  await page.evaluateOnNewDocument(
    (responses: Record<string, any>, stateful: boolean) => {
      const cr = (globalThis as any).chrome;
      if (!cr?.runtime?.sendMessage) {
        return;
      }

      const original = cr.runtime.sendMessage.bind(cr.runtime);
      let sendCompleted = false;

      // Helper: deliver response via callback or promise
      function deliver(response: any, args: any[]): any {
        const callback = args.find((a: any) => typeof a === 'function');
        if (callback) {
          setTimeout(() => callback(response), 0);
          return undefined;
        }
        return Promise.resolve(response);
      }

      cr.runtime.sendMessage = function (message: any, ...args: any[]) {
        if (typeof message === 'object' && message !== null && 'type' in message) {
          const msgType: string = message.type;

          // Stateful: after sendToCtview, getStatus returns 'complete'
          if (stateful && sendCompleted && msgType === 'getStatus' && responses['getStatus']) {
            const base = responses['getStatus'] as Record<string, any>;
            return deliver({ res: { ...base, state: 'complete' } }, args);
          }

          if (msgType in responses) {
            const res = responses[msgType];

            if (stateful && msgType === 'sendToCtview') {
              sendCompleted = true;
            }

            return deliver({ res }, args);
          }
        }

        // Pass through to real handler for unrecognised messages
        return original(message, ...args);
      };
    },
    config.responses,
    config.stateful ?? false,
  );
}

export interface StorageData {
  sync?: Record<string, unknown>;
  local?: Record<string, unknown>;
}

/**
 * Seed chrome.storage with data before page scripts execute.
 * Values are picked up by the App.svelte storage polling (every 2s).
 */
export async function injectStorageData(page: Page, data: StorageData): Promise<void> {
  await page.evaluateOnNewDocument(
    (syncData: Record<string, any> | undefined, localData: Record<string, any> | undefined) => {
      const cr = (globalThis as any).chrome;
      if (syncData && cr?.storage?.sync) {
        cr.storage.sync.set(syncData);
      }
      if (localData && cr?.storage?.local) {
        cr.storage.local.set(localData);
      }
    },
    data.sync,
    data.local,
  );
}
