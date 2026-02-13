import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CtviewClient } from '../../lib/ctview-sdk/client';
import { CtviewApiError } from '../../lib/ctview-sdk/errors';
import type { IngestResult } from '../../lib/ctview-sdk/types';

/**
 * Integration test: exercises the full chain from CtviewClient through
 * fetch-wrapper to mock fetch responses — verifying the SDK vendoring
 * works correctly end-to-end.
 */

describe('CtviewClient integration', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let client: CtviewClient;

  beforeEach(() => {
    mockFetch = vi.fn();
    client = new CtviewClient({
      baseUrl: 'https://ctview.example.com',
      apiKey: 'test-key-123',
      fetch: mockFetch,
    });
  });

  function jsonResponse(data: unknown, status = 200): Response {
    return new Response(JSON.stringify({ data }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  function errorResponse(status: number, code: string, message: string): Response {
    const body = JSON.stringify({ error: { code, message } });
    return {
      ok: false,
      status,
      statusText: message,
      json: () => Promise.resolve(JSON.parse(body)),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    } as unknown as Response;
  }

  describe('checkReady', () => {
    it('calls /api/v1/ready with auth header', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ status: 'ok' }));

      const result = await client.checkReady();

      expect(result).toEqual({ status: 'ok' });
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, init] = mockFetch.mock.calls[0]!;
      expect(url).toBe('https://ctview.example.com/api/v1/ready');
      expect(init.headers['Authorization']).toBe('Bearer test-key-123');
    });
  });

  describe('ingest', () => {
    it('sends POST to /api/v1/ingest with JSON body', async () => {
      const ingestResult: IngestResult = {
        success: true,
        importIds: ['imp-abc-123'],
        receiptId: 'receipt-xyz',
        summary: { tradelines: 5, searches: 3 },
      };
      mockFetch.mockResolvedValue(jsonResponse(ingestResult));

      const creditFile = {
        version: '1.0',
        imports: [{ source_system: 'equifax' }],
      };

      const result = await client.ingest(creditFile);

      expect(result).toEqual(ingestResult);
      const [url, init] = mockFetch.mock.calls[0]!;
      expect(url).toBe('https://ctview.example.com/api/v1/ingest');
      expect(init.method).toBe('POST');
      expect(init.headers['Content-Type']).toBe('application/json');
      expect(JSON.parse(init.body)).toEqual(creditFile);
    });

    it('throws CtviewApiError on validation failure', async () => {
      mockFetch.mockResolvedValue(
        errorResponse(422, 'VALIDATION_FAILED', 'Schema validation failed'),
      );

      try {
        await client.ingest({});
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CtviewApiError);
        const apiErr = err as CtviewApiError;
        expect(apiErr.status).toBe(422);
        // The error code comes from the response body's error.code field
        expect(apiErr.code).toBe('VALIDATION_FAILED');
      }
    });

    it('throws CtviewApiError on duplicate import', async () => {
      mockFetch.mockResolvedValue(
        errorResponse(409, 'DUPLICATE_IMPORT', 'Data already imported'),
      );

      await expect(client.ingest({})).rejects.toThrow(CtviewApiError);
    });

    it('throws CtviewApiError on rate limit', async () => {
      mockFetch.mockResolvedValue(
        errorResponse(429, 'RATE_LIMITED', 'Too many requests'),
      );

      try {
        await client.ingest({});
      } catch (err) {
        expect(err).toBeInstanceOf(CtviewApiError);
        const apiErr = err as CtviewApiError;
        expect(apiErr.status).toBe(429);
        expect(apiErr.code).toBe('RATE_LIMITED');
      }
    });

    it('handles network errors gracefully', async () => {
      mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

      await expect(client.ingest({})).rejects.toThrow(TypeError);
    });
  });

  describe('getHealth', () => {
    it('calls /api/v1/settings/health', async () => {
      mockFetch.mockResolvedValue(
        jsonResponse({
          tableCounts: { tradelines: 100, searches: 50 },
          lastIngestAt: '2025-01-01T00:00:00.000Z',
          dbEngine: 'sqlite',
          schemaVersion: '1.0.0',
        }),
      );

      const result = await client.getHealth();

      expect(result.dbEngine).toBe('sqlite');
      expect(result.tableCounts.tradelines).toBe(100);
    });
  });

  describe('URL handling', () => {
    it('appends /api/v1 if not present', () => {
      const fetch = vi.fn().mockResolvedValue(jsonResponse({ status: 'ok' }));
      const c = new CtviewClient({ baseUrl: 'https://example.com', fetch });
      c.checkReady();
      expect(fetch.mock.calls[0]![0]).toBe('https://example.com/api/v1/ready');
    });

    it('does not double-append /api/v1', () => {
      const fetch = vi.fn().mockResolvedValue(jsonResponse({ status: 'ok' }));
      const c = new CtviewClient({ baseUrl: 'https://example.com/api/v1', fetch });
      c.checkReady();
      expect(fetch.mock.calls[0]![0]).toBe('https://example.com/api/v1/ready');
    });

    it('strips trailing slash from baseUrl', () => {
      const fetch = vi.fn().mockResolvedValue(jsonResponse({ status: 'ok' }));
      const c = new CtviewClient({ baseUrl: 'https://example.com/', fetch });
      c.checkReady();
      expect(fetch.mock.calls[0]![0]).toBe('https://example.com/api/v1/ready');
    });
  });
});
