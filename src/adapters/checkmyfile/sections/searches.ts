import type { ClassifiedSection } from '../section-classifier';
import type { RawSection } from '../../types';
import { SELECTORS, tableDataTestId, type CraName, CRA_NAMES } from '../constants';
import { extractCellText } from '../parsers';

export function extractSearches(sections: ClassifiedSection[]): RawSection[] {
  const results: RawSection[] = [];
  let cardIndex = 0;

  for (const section of sections) {
    if (section.type !== 'hard_searches' && section.type !== 'soft_searches')
      continue;

    const searchType = section.type === 'hard_searches' ? 'hard' : 'soft';

    const cards = section.element.querySelectorAll(
      `[data-testid="${SELECTORS.SEARCH_CARD}"]`,
    );

    for (const card of cards) {
      // CRA name
      const agencyEl = card.querySelector(
        `[data-testid="${SELECTORS.SEARCH_AGENCY_NAME}"]`,
      );
      const craName = extractCellText(agencyEl);
      if (!craName) {
        cardIndex++;
        continue;
      }

      // Date: second <p> inside search heading
      const headingEl = card.querySelector(
        `[data-testid="${SELECTORS.SEARCH_HEADING}"]`,
      );
      const paragraphs = headingEl?.querySelectorAll('p') ?? [];
      const dateEl = paragraphs.length >= 2 ? paragraphs[1]! : null;
      const dateText = extractCellText(dateEl);

      // Resolve the CRA name for testid lookups
      const cra = CRA_NAMES.find((c) => c === craName) ?? craName;

      // Field data
      const company = extractCellText(
        card.querySelector(`[data-testid="${tableDataTestId(cra as CraName, 'companyName')}"]`),
      );
      const name = extractCellText(
        card.querySelector(`[data-testid="${tableDataTestId(cra as CraName, 'name')}"]`),
      );
      const address = extractCellText(
        card.querySelector(`[data-testid="${tableDataTestId(cra as CraName, 'address')}"]`),
      );

      const groupKey = `search-${searchType}-${cardIndex}`;
      const fields: RawSection['fields'] = [
        { name: 'search_type', value: searchType, groupKey, confidence: 'high' },
      ];

      if (dateText) {
        fields.push({ name: 'date', value: dateText, groupKey, confidence: 'high' });
      }
      if (company) {
        fields.push({ name: 'company', value: company, groupKey, confidence: 'high' });
      }
      if (name) {
        fields.push({ name: 'name', value: name, groupKey, confidence: 'high' });
      }
      if (address) {
        fields.push({ name: 'address', value: address, groupKey, confidence: 'high' });
      }

      results.push({
        domain: 'searches',
        sourceSystem: craName,
        fields,
      });

      cardIndex++;
    }
  }

  return results;
}
