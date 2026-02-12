import { describe, it, expect, beforeEach } from 'vitest';
import { registerAdapter, getAdapterForUrl, getAllAdapters, _resetForTesting } from './registry';
import type { SiteAdapter } from './types';

/** Create a minimal mock adapter for testing */
function mockAdapter(overrides: Partial<SiteAdapter> = {}): SiteAdapter {
  return {
    id: 'test-adapter',
    name: 'Test Adapter',
    version: '1.0.0',
    matchPatterns: ['*://*.example.com/*'],
    detect: () => true,
    getPageInfo: () => ({ siteName: 'Test', providers: [] }),
    extract: async () => ({
      metadata: {
        adapterId: 'test-adapter',
        adapterVersion: '1.0.0',
        extractedAt: new Date().toISOString(),
        pageUrl: 'https://example.com',
        htmlHash: 'abc123',
        sourceSystemsFound: [],
      },
      sections: [],
    }),
    getSupportedSections: () => [],
    ...overrides,
  };
}

describe('adapter registry', () => {
  beforeEach(() => {
    _resetForTesting();
  });

  describe('registerAdapter', () => {
    it('adds an adapter that can be retrieved', () => {
      const adapter = mockAdapter();
      registerAdapter(adapter);
      expect(getAllAdapters()).toHaveLength(1);
      expect(getAllAdapters()[0]).toBe(adapter);
    });

    it('rejects duplicate id', () => {
      registerAdapter(mockAdapter({ id: 'dup' }));
      expect(() => registerAdapter(mockAdapter({ id: 'dup' }))).toThrow(
        'Adapter "dup" is already registered',
      );
    });

    it('allows multiple adapters with different ids', () => {
      registerAdapter(mockAdapter({ id: 'a' }));
      registerAdapter(mockAdapter({ id: 'b' }));
      expect(getAllAdapters()).toHaveLength(2);
    });
  });

  describe('getAdapterForUrl', () => {
    it('returns matching adapter for a URL', () => {
      const adapter = mockAdapter({
        id: 'cmf',
        matchPatterns: ['*://*.checkmyfile.com/*'],
      });
      registerAdapter(adapter);

      expect(getAdapterForUrl('https://www.checkmyfile.com/report')).toBe(adapter);
    });

    it('returns null for non-matching URL', () => {
      registerAdapter(
        mockAdapter({
          matchPatterns: ['*://*.checkmyfile.com/*'],
        }),
      );

      expect(getAdapterForUrl('https://www.google.com/')).toBeNull();
    });

    it('returns first matching adapter when multiple match', () => {
      const first = mockAdapter({
        id: 'first',
        matchPatterns: ['*://*.example.com/*'],
      });
      const second = mockAdapter({
        id: 'second',
        matchPatterns: ['*://*.example.com/*'],
      });
      registerAdapter(first);
      registerAdapter(second);

      expect(getAdapterForUrl('https://www.example.com/page')).toBe(first);
    });
  });

  describe('match pattern handling', () => {
    it('matches scheme wildcard (http and https)', () => {
      registerAdapter(
        mockAdapter({
          id: 'wild',
          matchPatterns: ['*://*.example.com/*'],
        }),
      );

      expect(getAdapterForUrl('https://www.example.com/page')).not.toBeNull();
      expect(getAdapterForUrl('http://www.example.com/page')).not.toBeNull();
    });

    it('matches host prefix wildcard (subdomain)', () => {
      registerAdapter(
        mockAdapter({
          id: 'host',
          matchPatterns: ['*://*.example.com/*'],
        }),
      );

      expect(getAdapterForUrl('https://sub.example.com/page')).not.toBeNull();
      expect(getAdapterForUrl('https://deep.sub.example.com/page')).not.toBeNull();
      expect(getAdapterForUrl('https://example.com/page')).not.toBeNull();
    });

    it('matches path wildcard', () => {
      registerAdapter(
        mockAdapter({
          id: 'path',
          matchPatterns: ['https://example.com/report/*'],
        }),
      );

      expect(getAdapterForUrl('https://example.com/report/123')).not.toBeNull();
      expect(getAdapterForUrl('https://example.com/report/')).not.toBeNull();
      expect(getAdapterForUrl('https://example.com/other')).toBeNull();
    });

    it('matches specific scheme only', () => {
      registerAdapter(
        mockAdapter({
          id: 'https-only',
          matchPatterns: ['https://example.com/*'],
        }),
      );

      expect(getAdapterForUrl('https://example.com/page')).not.toBeNull();
      expect(getAdapterForUrl('http://example.com/page')).toBeNull();
    });
  });

  describe('_resetForTesting', () => {
    it('clears all registered adapters', () => {
      registerAdapter(mockAdapter({ id: 'a' }));
      registerAdapter(mockAdapter({ id: 'b' }));
      expect(getAllAdapters()).toHaveLength(2);

      _resetForTesting();
      expect(getAllAdapters()).toHaveLength(0);
    });
  });
});
