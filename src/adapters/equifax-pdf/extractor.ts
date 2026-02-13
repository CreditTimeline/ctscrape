/**
 * Main extraction orchestrator for the Equifax PDF adapter.
 *
 * Splits the full text into numbered sections, delegates each section to its
 * specialist parser, and assembles the final RawExtractedData result.
 */

import type { PdfExtractionInput, RawExtractedData, RawSection } from '../types';
import { ADAPTER_ID, ADAPTER_VERSION } from './constants';
import { splitIntoSections } from './section-splitter';
import { parsePersonalInfo } from './sections/personal-info';
import { parseFinancialAssociates } from './sections/financial-associates';
import { parseElectoralRegister } from './sections/electoral-register';
import { parseCreditAgreements } from './sections/credit-agreements';
import { parsePublicRecords } from './sections/public-records';
import { parseNotices } from './sections/notices';
import { parseSearches } from './sections/searches';
import { parseProperty } from './sections/property';
import { parseGoneAway } from './sections/gone-away';
import { parseCifas } from './sections/cifas';

/**
 * Extract all structured data from an Equifax PDF credit report.
 *
 * @param input - The PDF extraction input containing full text and metadata
 * @returns RawExtractedData with all parsed sections and metadata
 */
export async function extract(
  input: PdfExtractionInput,
): Promise<RawExtractedData> {
  const sections = splitIntoSections(input.fullText);
  const rawSections: RawSection[] = [];

  for (const section of sections) {
    let parsed: RawSection[] = [];

    switch (section.sectionNumber) {
      case 1:
        parsed = parsePersonalInfo(section.lines);
        break;
      case 2:
        parsed = parseFinancialAssociates(section.lines);
        break;
      case 3:
        parsed = parseElectoralRegister(section.lines);
        break;
      case 4:
        parsed = parseCreditAgreements(section.lines);
        break;
      case 5:
        parsed = parsePublicRecords(section.lines);
        break;
      case 6:
        parsed = parseNotices(section.lines);
        break;
      case 7:
        parsed = parseSearches(section.lines);
        break;
      case 8:
        parsed = parseProperty(section.lines);
        break;
      case 9:
        parsed = parseGoneAway(section.lines);
        break;
      case 10:
        parsed = parseCifas(section.lines);
        break;
      default:
        // Unknown section — skip
        break;
    }

    rawSections.push(...parsed);
  }

  return {
    metadata: {
      adapterId: ADAPTER_ID,
      adapterVersion: ADAPTER_VERSION,
      extractedAt: new Date().toISOString(),
      pageUrl: '',
      htmlHash: '', // Will be set by caller with PDF hash
      sourceSystemsFound: ['Equifax'],
      artifactType: 'pdf',
      sourceFilename: input.filename,
    },
    sections: rawSections,
  };
}
