import type { RawExtractedData, RawSection } from '../types';
import { classifySections } from './section-classifier';
import { extractAccounts } from './sections/accounts';
import { extractAddresses } from './sections/addresses';
import { extractAliases } from './sections/aliases';
import { extractAssociations } from './sections/associations';
import { extractScores } from './sections/scores';
import { extractSearches } from './sections/searches';

/**
 * Full extraction orchestration for the CheckMyFile /download page.
 * Classifies all sections, runs each section extractor, and aggregates results.
 */
export async function extract(
  doc: Document,
  adapterId: string,
  adapterVersion: string,
): Promise<RawExtractedData> {
  const classified = classifySections(doc);

  // Run all section extractors
  const allSections: RawSection[] = [
    ...extractScores(classified),
    ...extractAccounts(classified),
    ...extractAddresses(classified),
    ...extractAssociations(classified),
    ...extractAliases(classified),
    ...extractSearches(classified),
  ];

  // Collect unique source systems found
  const sourceSystemsFound = [
    ...new Set(
      allSections
        .map((s) => s.sourceSystem)
        .filter((s): s is string => s !== null),
    ),
  ].sort();

  return {
    metadata: {
      adapterId,
      adapterVersion,
      extractedAt: new Date().toISOString(),
      pageUrl: doc.location?.href ?? '',
      htmlHash: '', // Set by content script after captureWithHash()
      sourceSystemsFound,
    },
    sections: allSections,
  };
}
