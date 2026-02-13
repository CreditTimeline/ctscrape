import type { ClassifiedSection } from '../section-classifier';
import type { RawSection } from '../../types';
import { CRA_NAMES, SELECTORS, tableDataTestId, ACCOUNT_FIELD_SLUGS } from '../constants';
import { extractCellText } from '../parsers';
import { extractPaymentHistory } from './payment-history';

const HEADING_RE = /^(.+?)\s*-\s*(.+?)\s*-\s*Ending\s+(.+)$/;

function parseHeading(text: string): {
  lender: string;
  accountType: string;
  last4: string;
} | null {
  const match = text.match(HEADING_RE);
  if (!match) return null;
  return {
    lender: match[1]!.trim(),
    accountType: match[2]!.trim(),
    last4: match[3]!.trim(),
  };
}

export function extractAccounts(sections: ClassifiedSection[]): RawSection[] {
  const results: RawSection[] = [];

  for (const section of sections) {
    if (section.type !== 'active_accounts' && section.type !== 'closed_accounts')
      continue;

    const isClosed = section.type === 'closed_accounts';

    const tables = section.element.querySelectorAll(
      `[data-testid="${SELECTORS.PAYMENT_HISTORY_TABLE}"]`,
    );

    for (let tableIndex = 0; tableIndex < tables.length; tableIndex++) {
      const table = tables[tableIndex]!;

      // Parse heading
      const headingEl =
        table
          .closest('div')
          ?.querySelector(
            `[data-testid="${SELECTORS.PAYMENT_HISTORY_TABLE_HEADING}"]`,
          ) ??
        section.element.querySelectorAll(
          `[data-testid="${SELECTORS.PAYMENT_HISTORY_TABLE_HEADING}"]`,
        )[tableIndex] ??
        null;
      const headingText = extractCellText(headingEl);
      const parsed = headingText ? parseHeading(headingText) : null;

      for (const cra of CRA_NAMES) {
        // Check if lender cell has data
        const lenderCell = table.querySelector(
          `[data-testid="${tableDataTestId(cra, 'lender')}"]`,
        );
        const lenderText = extractCellText(lenderCell);
        if (lenderText === null || lenderText === '-') continue;

        const groupKey = `account-${tableIndex}-${cra}`;
        const fields: RawSection['fields'] = [];

        // Extract all standard fields except payment-history
        for (const slug of ACCOUNT_FIELD_SLUGS) {
          if (slug === 'payment-history') continue;

          const cellEl = table.querySelector(
            `[data-testid="${tableDataTestId(cra, slug)}"]`,
          );
          const cellText = extractCellText(cellEl);
          if (cellText !== null) {
            fields.push({
              name: slug,
              value: cellText,
              groupKey,
              confidence: 'high',
            });
          }
        }

        // Payment history
        const phCell = table.querySelector(
          `[data-testid="${tableDataTestId(cra, 'payment-history')}"]`,
        );
        if (phCell) {
          const phFields = extractPaymentHistory(phCell, cra, groupKey);
          fields.push(...phFields);
        }

        // is_closed field
        fields.push({
          name: 'is_closed',
          value: isClosed ? 'true' : 'false',
          groupKey,
          confidence: 'high',
        });

        // Heading fields
        if (parsed) {
          fields.push({
            name: 'heading_lender',
            value: parsed.lender,
            groupKey,
            confidence: 'high',
          });
          fields.push({
            name: 'heading_account_type',
            value: parsed.accountType,
            groupKey,
            confidence: 'high',
          });
          fields.push({
            name: 'heading_last4',
            value: parsed.last4,
            groupKey,
            confidence: 'high',
          });
        }

        results.push({
          domain: 'tradelines',
          sourceSystem: cra,
          fields,
        });
      }
    }
  }

  return results;
}
