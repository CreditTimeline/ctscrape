import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getClient, invalidateClient, testConnection, classifySendError } from '../../lib/ctview-client';
import { CtviewApiError } from '../../lib/ctview-sdk/errors';
import { connectionSettings } from '../../utils/storage';

// Mock storage
vi.mock('../../utils/storage', () => ({
  connectionSettings: {
    getValue: vi.fn(),
  },
}));

const mockGetValue = vi.mocked(connectionSettings.getValue);

beforeEach(() => {
  invalidateClient();
});

describe('getClient', () => {
  it('returns null when serverUrl is empty', async () => {
    mockGetValue.mockResolvedValue({ serverUrl: '', apiKey: '' });
    const client = await getClient();
    expect(client).toBeNull();
  });

  it('creates a CtviewClient with correct settings', async () => {
    mockGetValue.mockResolvedValue({ serverUrl: 'https://ctview.example.com', apiKey: 'test-key' });
    const client = await getClient();
    expect(client).not.toBeNull();
  });

  it('caches client across calls with same settings', async () => {
    mockGetValue.mockResolvedValue({ serverUrl: 'https://ctview.example.com', apiKey: 'test-key' });
    const client1 = await getClient();
    const client2 = await getClient();
    expect(client1).toBe(client2);
  });

  it('re-creates client when settings change', async () => {
    mockGetValue.mockResolvedValue({ serverUrl: 'https://ctview.example.com', apiKey: 'key1' });
    const client1 = await getClient();

    mockGetValue.mockResolvedValue({ serverUrl: 'https://ctview.example.com', apiKey: 'key2' });
    const client2 = await getClient();

    expect(client1).not.toBe(client2);
  });

  it('invalidateClient forces re-creation', async () => {
    mockGetValue.mockResolvedValue({ serverUrl: 'https://ctview.example.com', apiKey: 'test-key' });
    const client1 = await getClient();

    invalidateClient();
    const client2 = await getClient();

    expect(client1).not.toBe(client2);
  });
});

describe('testConnection', () => {
  it('returns error when serverUrl is not configured', async () => {
    mockGetValue.mockResolvedValue({ serverUrl: '', apiKey: '' });
    const result = await testConnection();
    expect(result.success).toBe(false);
    expect(result.error).toContain('not configured');
  });

  // Note: testing success/error paths with actual fetch calls would require
  // mocking the global fetch. The CtviewClient constructor is tested above.
  // The error classification logic is tested via classifySendError below.
});

describe('classifySendError', () => {
  it('classifies VALIDATION_FAILED as non-retryable', () => {
    const err = new CtviewApiError(422, 'VALIDATION_FAILED', 'Invalid data', [
      { path: '/imports/0', message: 'missing field' },
    ]);
    const result = classifySendError(err);
    expect(result.retryable).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_FAILED');
    expect(result.details).toHaveLength(1);
  });

  it('classifies DUPLICATE_IMPORT as non-retryable with duplicate flag', () => {
    const err = new CtviewApiError(409, 'DUPLICATE_IMPORT', 'Already imported');
    const result = classifySendError(err);
    expect(result.retryable).toBe(false);
    expect(result.duplicate).toBe(true);
    expect(result.errorCode).toBe('DUPLICATE_IMPORT');
  });

  it('classifies 401 as non-retryable', () => {
    const err = new CtviewApiError(401, 'UNAUTHORIZED', 'Bad credentials');
    const result = classifySendError(err);
    expect(result.retryable).toBe(false);
    expect(result.errorCode).toBe('UNAUTHORIZED');
    expect(result.suggestion).toContain('API key');
  });

  it('classifies 429 as retryable', () => {
    const err = new CtviewApiError(429, 'RATE_LIMITED', 'Too many requests');
    const result = classifySendError(err);
    expect(result.retryable).toBe(true);
    expect(result.errorCode).toBe('RATE_LIMITED');
  });

  it('classifies 503 as retryable', () => {
    const err = new CtviewApiError(503, 'NOT_READY', 'Server starting');
    const result = classifySendError(err);
    expect(result.retryable).toBe(true);
    expect(result.errorCode).toBe('NOT_READY');
  });

  it('classifies 5xx as retryable', () => {
    const err = new CtviewApiError(500, 'INTERNAL_ERROR', 'Server error');
    const result = classifySendError(err);
    expect(result.retryable).toBe(true);
  });

  it('classifies network TypeError as retryable', () => {
    const err = new TypeError('Failed to fetch');
    const result = classifySendError(err);
    expect(result.retryable).toBe(true);
    expect(result.errorCode).toBe('NETWORK_ERROR');
  });

  it('classifies unknown errors as non-retryable', () => {
    const err = new Error('something unexpected');
    const result = classifySendError(err);
    expect(result.retryable).toBe(false);
    expect(result.errorCode).toBe('UNKNOWN');
  });

  it('classifies 4xx errors as non-retryable', () => {
    const err = new CtviewApiError(400, 'BAD_REQUEST', 'Bad request');
    const result = classifySendError(err);
    expect(result.retryable).toBe(false);
  });
});
