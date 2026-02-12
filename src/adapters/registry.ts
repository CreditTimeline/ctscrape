/**
 * Central adapter registry — manages SiteAdapter instances and URL matching.
 * Content scripts use getAdapterForUrl() to find the right adapter for the current page.
 */

import type { SiteAdapter } from './types';

const adapters = new Map<string, SiteAdapter>();

/** Register an adapter. Throws if an adapter with the same id is already registered. */
export function registerAdapter(adapter: SiteAdapter): void {
  if (adapters.has(adapter.id)) {
    throw new Error(`Adapter "${adapter.id}" is already registered`);
  }
  adapters.set(adapter.id, adapter);
}

/** Find the first adapter whose matchPatterns match the given URL, or null. */
export function getAdapterForUrl(url: string): SiteAdapter | null {
  for (const adapter of adapters.values()) {
    for (const pattern of adapter.matchPatterns) {
      if (matchPattern(pattern, url)) {
        return adapter;
      }
    }
  }
  return null;
}

/** Return all registered adapters. */
export function getAllAdapters(): SiteAdapter[] {
  return Array.from(adapters.values());
}

/** Clear the registry — for use in tests only. */
export function _resetForTesting(): void {
  adapters.clear();
}

// NOTE: For future multi-adapter content scripts, dynamic import() would slot in
// here — e.g. lazy-loading adapter modules based on URL match before registering.

/**
 * Match a Chrome extension match pattern against a URL.
 * Supports patterns like: *://*.example.com/*, https://example.com/path/*
 * See https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns
 */
function matchPattern(pattern: string, url: string): boolean {
  const re = matchPatternToRegExp(pattern);
  return re.test(url);
}

function matchPatternToRegExp(pattern: string): RegExp {
  // Special case: <all_urls>
  if (pattern === '<all_urls>') {
    return /^https?:\/\/.+/;
  }

  const match = /^(\*|https?|ftp):\/\/(\*|\*\.[^/]+|[^/]+)\/(.*)$/.exec(pattern);
  if (!match) {
    throw new Error(`Invalid match pattern: "${pattern}"`);
  }

  const scheme = match[1]!;
  const host = match[2]!;
  const path = match[3]!;

  let re = '^';

  // Scheme
  if (scheme === '*') {
    re += 'https?';
  } else {
    re += escapeRegExp(scheme);
  }
  re += ':\\/\\/';

  // Host
  if (host === '*') {
    re += '[^/]+';
  } else if (host.startsWith('*.')) {
    // *.example.com matches example.com and any subdomain
    re += '([^/]+\\.)?' + escapeRegExp(host.slice(2));
  } else {
    re += escapeRegExp(host);
  }

  // Path
  re += '\\/';
  re += path.split('*').map(escapeRegExp).join('.*');

  re += '$';
  return new RegExp(re);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
