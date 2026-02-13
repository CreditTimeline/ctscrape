/**
 * Equifax PDF adapter entry point.
 *
 * Creates and registers the PdfAdapter instance for parsing Equifax UK
 * credit reports extracted from PDF files via pdftotext.
 */

import { registerPdfAdapter } from '../pdf-registry';
import type { DataDomain, PdfAdapter, PdfExtractionInput, PdfReportInfo } from '../types';
import { ADAPTER_ID, ADAPTER_NAME, ADAPTER_VERSION } from './constants';
import { detect, getReportInfo } from './detector';
import { extract } from './extractor';

/** The Equifax PDF adapter instance */
const equifaxPdfAdapter: PdfAdapter = {
  id: ADAPTER_ID,
  name: ADAPTER_NAME,
  version: ADAPTER_VERSION,

  detect(textSample: string): boolean {
    return detect(textSample);
  },

  getReportInfo(fullText: string): PdfReportInfo {
    return getReportInfo(fullText);
  },

  async extract(input: PdfExtractionInput) {
    return extract(input);
  },

  getSupportedSections(): DataDomain[] {
    return [
      'personal_info',
      'addresses',
      'tradelines',
      'searches',
      'public_records',
      'electoral_roll',
      'financial_associates',
      'fraud_markers',
      'notices_of_correction',
    ];
  },
};

registerPdfAdapter(equifaxPdfAdapter);

export default equifaxPdfAdapter;
