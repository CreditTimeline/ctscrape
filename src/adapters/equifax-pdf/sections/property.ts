/**
 * Parses Section 8 (Property Valuation) of the Equifax PDF report.
 *
 * Extracts property details including type, price, deed date, tenure, and
 * new build status for properties at the current address.
 */

import type { RawField, RawSection } from '../../types';
import { extractFieldsFromLines } from '../line-utils';

/** Known field labels for property valuation entries */
const PROPERTY_LABELS = [
  'Property Type',
  'Price Paid',
  'Deed Date',
  'Tenure',
  'New Build?',
] as const;

/**
 * Parse Section 8 lines into RawSection(s) for property data.
 *
 * @param lines - The lines belonging to Section 8 (after the section header)
 * @returns Array of RawSection objects for the personal_info domain
 */
export function parseProperty(lines: string[]): RawSection[] {
  const allText = lines.join('\n');

  if (allText.includes('No data present') && !allText.includes('Property Type')) {
    return [];
  }

  const fieldMap = extractFieldsFromLines(lines, [...PROPERTY_LABELS]);

  if (fieldMap.size === 0) {
    return [];
  }

  const groupKey = 'equifax:property:0';
  const fields: RawField[] = [];

  for (const [label, value] of fieldMap) {
    let fieldName: string;
    switch (label) {
      case 'Property Type':
        fieldName = 'property_type';
        break;
      case 'Price Paid':
        fieldName = 'price_paid';
        break;
      case 'Deed Date':
        fieldName = 'deed_date';
        break;
      case 'Tenure':
        fieldName = 'tenure';
        break;
      case 'New Build?':
        fieldName = 'new_build';
        break;
      default:
        continue;
    }

    fields.push({
      name: fieldName,
      value,
      groupKey,
      confidence: 'high',
    });
  }

  if (fields.length === 0) {
    return [];
  }

  return [
    {
      domain: 'personal_info',
      sourceSystem: 'Equifax',
      fields,
    },
  ];
}
