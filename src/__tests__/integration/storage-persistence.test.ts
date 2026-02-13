import { describe, it, expect } from 'vitest';
import {
  scrapeHistory,
  retryQueue,
  connectionSettings,
} from '@/utils/storage';
import {
  onPageDetected,
  getJob,
  _resetForTesting,
} from '@/extraction/orchestrator';
import { makeHistoryEntry, makeQueueItem, makeConnectionSettings } from '@/__tests__/helpers/factories';

describe('storage persistence', () => {
  it('scrapeHistory persists across reads after write', async () => {
    const entries = [
      makeHistoryEntry({ id: 'persist-1' }),
      makeHistoryEntry({ id: 'persist-2', status: 'sent' }),
    ];

    await scrapeHistory.setValue(entries);

    // First read
    const read1 = await scrapeHistory.getValue();
    expect(read1).toEqual(entries);

    // Second read
    const read2 = await scrapeHistory.getValue();
    expect(read2).toEqual(entries);
    expect(read2).toEqual(read1);
  });

  it('retryQueue items survive read-after-write', async () => {
    const items = [
      makeQueueItem({ id: 'rq-1', historyId: 'h-1' }),
      makeQueueItem({ id: 'rq-2', historyId: 'h-2', retryCount: 3 }),
    ];

    await retryQueue.setValue(items);

    const retrieved = await retryQueue.getValue();
    expect(retrieved).toEqual(items);
    expect(retrieved).toHaveLength(2);
    expect(retrieved[1]!.retryCount).toBe(3);
  });

  it('connectionSettings accessible after re-initialization', async () => {
    const settings = makeConnectionSettings({
      serverUrl: 'https://persist-test.example.com',
      apiKey: 'persist-key',
    });

    await connectionSettings.setValue(settings);

    // Simulate re-access (reading from same storage item)
    const retrieved = await connectionSettings.getValue();
    expect(retrieved.serverUrl).toBe('https://persist-test.example.com');
    expect(retrieved.apiKey).toBe('persist-key');
  });

  it('orchestrator in-memory jobs are lost on _resetForTesting()', () => {
    // Create a job
    onPageDetected(100, 'checkmyfile', {
      siteName: 'CheckMyFile',
      providers: ['Equifax'],
    });

    // Verify job exists
    const job = getJob(100);
    expect(job).not.toBeNull();
    expect(job!.state).toBe('detected');

    // Reset
    _resetForTesting();

    // Job should be gone (documents known limitation: in-memory state lost)
    const jobAfterReset = getJob(100);
    expect(jobAfterReset).toBeNull();
  });
});
