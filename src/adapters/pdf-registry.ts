/**
 * PDF adapter registry — manages PdfAdapter instances and text-based detection.
 * PDF adapters are detected by examining extracted text content, not URL patterns.
 */

import type { PdfAdapter } from './types';

const pdfAdapters = new Map<string, PdfAdapter>();

/** Register a PDF adapter. Throws if an adapter with the same id is already registered. */
export function registerPdfAdapter(adapter: PdfAdapter): void {
  if (pdfAdapters.has(adapter.id)) {
    throw new Error(`PDF adapter "${adapter.id}" is already registered`);
  }
  pdfAdapters.set(adapter.id, adapter);
}

/** Find the first PDF adapter whose detect() returns true for the given text sample. */
export function detectPdfAdapter(textSample: string): PdfAdapter | null {
  for (const adapter of pdfAdapters.values()) {
    if (adapter.detect(textSample)) {
      return adapter;
    }
  }
  return null;
}

/** Get a specific PDF adapter by id. */
export function getPdfAdapter(id: string): PdfAdapter | null {
  return pdfAdapters.get(id) ?? null;
}

/** Return all registered PDF adapters. */
export function getAllPdfAdapters(): PdfAdapter[] {
  return Array.from(pdfAdapters.values());
}

/** Clear the registry — for use in tests only. */
export function _resetPdfRegistryForTesting(): void {
  pdfAdapters.clear();
}
