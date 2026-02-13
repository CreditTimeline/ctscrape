/**
 * PDF text extraction using pdfjs-dist.
 * Runs in the service worker — uses fake worker mode for MV3 compatibility.
 * No DOM dependency — uses getTextContent() only.
 */

import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

// Disable worker (MV3 service worker can't spawn web workers)
GlobalWorkerOptions.workerSrc = '';

export interface PdfTextResult {
  fullText: string;
  pages: string[];
  pageCount: number;
}

/**
 * Extract text content from a PDF ArrayBuffer.
 * Returns full text, per-page text, and page count.
 */
export async function extractTextFromPdf(pdfBytes: ArrayBuffer): Promise<PdfTextResult> {
  const doc = await getDocument({
    data: new Uint8Array(pdfBytes),
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;

  const pages: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .filter((item) => 'str' in item)
      .map((item) => (item as { str: string }).str)
      .join(' ');
    pages.push(pageText);
  }

  const fullText = pages.join('\n\n');

  return {
    fullText,
    pages,
    pageCount: doc.numPages,
  };
}
