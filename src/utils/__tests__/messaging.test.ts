import { describe, it, expect } from 'vitest';
import { sendMessage, onMessage } from '@/utils/messaging';
import type { SendResult, ExtensionStatus } from '@/utils/messaging';

describe('messaging protocol', () => {
  it('sendMessage is an exported function', () => {
    expect(typeof sendMessage).toBe('function');
  });

  it('onMessage is an exported function', () => {
    expect(typeof onMessage).toBe('function');
  });

  it('getStatus round-trip returns ExtensionStatus', async () => {
    const status: ExtensionStatus = {
      state: 'idle',
      pageInfo: undefined,
      result: undefined,
      lastError: undefined,
    };

    onMessage('getStatus', () => status);

    const result = await sendMessage('getStatus', undefined);
    expect(result).toEqual(status);
  });

  it('sendToCtview round-trip returns SendResult', async () => {
    const sendResult: SendResult = {
      success: true,
      receiptId: 'receipt-123',
      importIds: ['imp-1', 'imp-2'],
    };

    onMessage('sendToCtview', () => sendResult);

    const result = await sendMessage('sendToCtview', undefined);
    expect(result).toEqual(sendResult);
  });

  it('testConnection round-trip returns handler return value', async () => {
    const testResult = {
      success: true,
      status: 'ok',
    };

    onMessage('testConnection', () => testResult);

    const result = await sendMessage('testConnection', undefined);
    expect(result).toEqual(testResult);
  });

  it('extractResult message carries rawData through to handler', async () => {
    const rawData = {
      metadata: {
        adapterId: 'checkmyfile',
        adapterVersion: '0.1.0',
        extractedAt: '2025-01-01T00:00:00Z',
        pageUrl: 'https://example.com',
        htmlHash: 'abc123',
        sourceSystemsFound: ['Equifax'],
      },
      sections: [],
    };

    let receivedData: unknown = null;
    onMessage('extractResult', ({ data }) => {
      receivedData = data.rawData;
    });

    await sendMessage('extractResult', { rawData });
    expect(receivedData).toEqual(rawData);
  });

  it('extractError message carries error and details', async () => {
    let receivedError: string | null = null;
    let receivedDetails: string | undefined = undefined;

    onMessage('extractError', ({ data }) => {
      receivedError = data.error;
      receivedDetails = data.details;
    });

    await sendMessage('extractError', {
      error: 'DOM parse failed',
      details: 'Missing required section',
    });

    expect(receivedError).toBe('DOM parse failed');
    expect(receivedDetails).toBe('Missing required section');
  });

  it('multiple handlers for different message names coexist', async () => {
    // Previous tests already registered handlers for getStatus and sendToCtview.
    // @webext-core/messaging allows only one listener per message name in a
    // given JS context, but handlers for *different* names coexist.
    // We verify by calling both previously-registered handlers concurrently.
    const [status, send] = await Promise.all([
      sendMessage('getStatus', undefined),
      sendMessage('sendToCtview', undefined),
    ]);

    // Both should resolve (handlers from earlier tests still active)
    expect(status).toBeDefined();
    expect(send).toBeDefined();
  });
});
