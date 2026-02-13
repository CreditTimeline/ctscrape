/**
 * Retry queue — manages a persistent queue of failed sends with
 * exponential backoff for automatic retry.
 */

import { retryQueue, scrapeHistory, type RetryQueueItem } from '../utils/storage';
import { getClient, classifySendError } from './ctview-client';

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 30_000; // 30 seconds
const MAX_DELAY_MS = 1_800_000; // 30 minutes

/** Calculate next retry delay with exponential backoff and jitter. */
function calculateDelay(retryCount: number): number {
  const exponential = Math.min(BASE_DELAY_MS * Math.pow(2, retryCount), MAX_DELAY_MS);
  const jitter = exponential * 0.2 * Math.random();
  return exponential + jitter;
}

/** Update a history entry by id with a partial update. */
async function updateHistoryEntry(
  historyId: string,
  update: Partial<Pick<import('../utils/storage').ScrapeHistoryEntry, 'status' | 'sentAt' | 'receiptId' | 'error'>>,
): Promise<void> {
  const history = await scrapeHistory.getValue();
  const idx = history.findIndex((h) => h.id === historyId);
  if (idx === -1) return;
  history[idx] = { ...history[idx]!, ...update };
  await scrapeHistory.setValue(history);
}

/** Add a failed send to the retry queue. Skips duplicates by historyId. */
export async function enqueueRetry(item: Omit<RetryQueueItem, 'retryCount' | 'nextRetryAt'>): Promise<void> {
  const queue = await retryQueue.getValue();

  // Skip if already queued for this history entry
  if (queue.some((q) => q.historyId === item.historyId)) {
    return;
  }

  const newItem: RetryQueueItem = {
    ...item,
    retryCount: 0,
    nextRetryAt: new Date(Date.now() + calculateDelay(0)).toISOString(),
  };

  await retryQueue.setValue([...queue, newItem]);
}

/** Process one ready item from the retry queue. */
export async function processRetryQueue(): Promise<void> {
  const queue = await retryQueue.getValue();
  if (queue.length === 0) return;

  const now = Date.now();
  const readyIndex = queue.findIndex((q) => new Date(q.nextRetryAt).getTime() <= now);
  if (readyIndex === -1) return;

  const item = queue[readyIndex]!;

  const client = await getClient();
  if (!client) return; // Not configured — skip processing

  try {
    const result = await client.ingest(item.creditFile);

    // Success — remove from queue and update history
    await retryQueue.setValue(queue.filter((_q, i) => i !== readyIndex));
    await updateHistoryEntry(item.historyId, {
      status: 'sent',
      sentAt: new Date().toISOString(),
      receiptId: result.receiptId ?? null,
      error: null,
    });
  } catch (err) {
    const classified = classifySendError(err);

    if (!classified.retryable || item.retryCount + 1 >= MAX_RETRIES) {
      // Non-retryable or exhausted retries — remove from queue
      await retryQueue.setValue(queue.filter((_q, i) => i !== readyIndex));
      await updateHistoryEntry(item.historyId, {
        status: 'failed',
        error: classified.error + (item.retryCount + 1 >= MAX_RETRIES ? ' (max retries reached)' : ''),
      });
      return;
    }

    // Retryable — increment count and schedule next attempt
    const nextRetryCount = item.retryCount + 1;
    queue[readyIndex] = {
      ...item,
      retryCount: nextRetryCount,
      nextRetryAt: new Date(Date.now() + calculateDelay(nextRetryCount)).toISOString(),
      lastError: classified.error,
    };
    await retryQueue.setValue(queue);
  }
}

/** Reset retry timing for a specific history entry and trigger processing. */
export async function manualRetry(historyId: string): Promise<void> {
  const queue = await retryQueue.getValue();
  const idx = queue.findIndex((q) => q.historyId === historyId);
  if (idx === -1) return;

  const existing = queue[idx]!;
  queue[idx] = { ...existing, nextRetryAt: new Date().toISOString() };
  await retryQueue.setValue(queue);
  await processRetryQueue();
}

/** Remove an item from the retry queue by historyId. */
export async function removeFromQueue(historyId: string): Promise<void> {
  const queue = await retryQueue.getValue();
  await retryQueue.setValue(queue.filter((q) => q.historyId !== historyId));
}
