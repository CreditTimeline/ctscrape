/**
 * Parses Section 4 (Credit Agreements) of the Equifax PDF report.
 *
 * This is the largest and most complex parser. It handles:
 * - Open and Closed credit agreement sections
 * - Account type category sub-headers (Mortgage, Loan, Utilities, etc.)
 * - Individual account blocks with key-value fields
 * - Payment history grids
 * - Credit card extra fields
 * - Attributable Data sections (skipped)
 */

import type { RawField, RawSection } from '../../types';
import {
  ACCOUNT_HEADER_RE,
  ALL_AGREEMENT_LABELS,
  APPENDIX_NOTE_RE,
  CATEGORY_SUBHEADERS,
  PAYMENT_HISTORY_HEADER_RE,
} from '../constants';
import { extractFieldsFromLines, isBlankLine, lastNChars } from '../line-utils';
import { parsePaymentHistoryGrid } from '../payment-history-grid';

/** Represents a single credit account block with its parsed lines and metadata */
interface AccountBlock {
  /** Account type from the header (e.g., "Mortgage", "Credit Card") */
  accountType: string;
  /** Lender name from the header */
  lender: string;
  /** Whether this is under Closed Credit Agreements */
  isClosed: boolean;
  /** The raw lines for this account (from header to next account/section) */
  lines: string[];
}

/**
 * Parse Section 4 lines into RawSection(s) for the tradelines domain.
 *
 * @param lines - The lines belonging to Section 4 (after the section header)
 * @returns Array of RawSection objects for the tradelines domain
 */
export function parseCreditAgreements(lines: string[]): RawSection[] {
  // Skip introductory text (description of the section)
  const accountBlocks = splitIntoAccountBlocks(lines);
  const sections: RawSection[] = [];

  for (const block of accountBlocks) {
    const section = parseAccountBlock(block);
    if (section) {
      sections.push(section);
    }
  }

  return sections;
}

/**
 * Split the section 4 lines into individual account blocks.
 * Detects open/closed boundaries, category sub-headers, and account headers.
 */
function splitIntoAccountBlocks(lines: string[]): AccountBlock[] {
  const blocks: AccountBlock[] = [];
  let isClosed = false;
  let currentBlock: AccountBlock | null = null;
  let inAttributableData = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i]!.trim();

    // Skip blank lines for header detection
    if (isBlankLine(lines[i]!)) {
      if (currentBlock) {
        currentBlock.lines.push(lines[i]!);
      }
      continue;
    }

    // Detect "Attributable Data" section — skip everything until next major section
    if (trimmed === 'Attributable Data') {
      // Flush current block
      if (currentBlock) {
        blocks.push(currentBlock);
        currentBlock = null;
      }
      inAttributableData = true;
      continue;
    }

    // Detect "Open Credit Agreements" / "Closed Credit Agreements"
    if (trimmed === 'Open Credit Agreements') {
      if (inAttributableData) inAttributableData = false;
      if (currentBlock) {
        blocks.push(currentBlock);
        currentBlock = null;
      }
      isClosed = false;
      continue;
    }

    if (trimmed === 'Closed Credit Agreements') {
      if (inAttributableData) inAttributableData = false;
      if (currentBlock) {
        blocks.push(currentBlock);
        currentBlock = null;
      }
      isClosed = true;
      continue;
    }

    // Skip attributable data lines
    if (inAttributableData) {
      // Check for "No data present" — these are within attributable data
      continue;
    }

    // Detect category sub-headers
    if (isCategorySubheader(trimmed)) {
      if (currentBlock) {
        blocks.push(currentBlock);
        currentBlock = null;
      }
      // Category type is captured in individual account headers
      continue;
    }

    // Detect account headers: "{Type} from {Lender}"
    const accountMatch = ACCOUNT_HEADER_RE.exec(trimmed);
    if (accountMatch && isLikelyAccountHeader(trimmed, accountMatch)) {
      if (currentBlock) {
        blocks.push(currentBlock);
      }

      const accountType = accountMatch[1]!.trim();
      const lender = accountMatch[2]!.trim();

      currentBlock = {
        accountType,
        lender,
        isClosed,
        lines: [],
      };
      continue;
    }

    // "No data present" at the top of a category — skip
    if (
      trimmed === 'No data present' ||
      trimmed.startsWith('There is no data present')
    ) {
      continue;
    }

    // Skip section intro text
    if (
      trimmed.startsWith('This section shows information') ||
      trimmed.startsWith('Organisations typically update') ||
      trimmed.startsWith(
        'retain the data for up to six years',
      ) ||
      trimmed.startsWith('Live accounts will remain') ||
      trimmed.startsWith(
        'Attributable data is information',
      ) ||
      trimmed.startsWith(
        'yours. A lender can see this data',
      ) ||
      trimmed.startsWith('a lending decision.')
    ) {
      continue;
    }

    // Accumulate lines for the current account block
    if (currentBlock) {
      currentBlock.lines.push(lines[i]!);
    }
  }

  // Push final block
  if (currentBlock) {
    blocks.push(currentBlock);
  }

  return blocks;
}

/**
 * Check if a line is a category sub-header.
 */
function isCategorySubheader(line: string): boolean {
  return (CATEGORY_SUBHEADERS as readonly string[]).includes(line);
}

/**
 * Heuristic check: is this match likely an actual account header
 * and not some other "X from Y" text in the report?
 * Account headers have known account type prefixes.
 */
function isLikelyAccountHeader(
  _line: string,
  match: RegExpExecArray,
): boolean {
  const type = match[1]!.trim();
  const knownTypes = [
    'Mortgage',
    'Property Rental',
    'Loan',
    'Communications Supplier',
    'Current Account',
    'Credit Card',
    'Budget Card / Revolving Credit',
    'Hire Purchase',
    'Insurance',
    'Mail Order',
    'Option Account',
    'Basic Bank Account',
    'Second Mortgage',
    'Charge Card',
    'Store Card',
    'Overdraft',
    'Deferred Payment',
  ];

  return knownTypes.some(
    (kt) => type === kt || type.startsWith(kt),
  );
}

/**
 * Parse a single account block into a RawSection with all its fields.
 */
function parseAccountBlock(block: AccountBlock): RawSection | null {
  const { lines, accountType, lender, isClosed } = block;

  // Separate the main field lines from the payment history grid
  const { fieldLines, paymentHistoryLines } = splitFieldsAndPaymentHistory(lines);

  // Extract key-value fields
  const fieldMap = extractFieldsFromLines(fieldLines, ALL_AGREEMENT_LABELS);

  // Build the groupKey from lender, type, and last chars of account number
  const accountNumber = fieldMap.get('Account Number') ?? '';
  const last4 = lastNChars(accountNumber, 4);
  const groupKey = `equifax:${lender} - ${accountType} - ${last4}`;

  const fields: RawField[] = [];

  // Heading fields (from the account header, not from key-value parsing)
  fields.push({
    name: 'heading_lender',
    value: lender,
    groupKey,
    confidence: 'high',
  });
  fields.push({
    name: 'heading_account_type',
    value: accountType,
    groupKey,
    confidence: 'high',
  });
  if (last4) {
    fields.push({
      name: 'heading_last4',
      value: last4,
      groupKey,
      confidence: 'high',
    });
  }

  // is_closed
  fields.push({
    name: 'is_closed',
    value: isClosed ? 'true' : 'false',
    groupKey,
    confidence: 'high',
  });

  // Map extracted fields to normaliser-expected names
  addFieldIfPresent(fields, fieldMap, 'Account Number', 'account_number', groupKey);
  addFieldIfPresent(fields, fieldMap, 'Status', 'status', groupKey);
  addFieldIfPresent(fields, fieldMap, 'Current Balance', 'balance', groupKey);
  addFieldIfPresent(fields, fieldMap, 'Credit Limit', 'limit', groupKey);
  addFieldIfPresent(fields, fieldMap, 'Start Balance', 'opening-balance', groupKey);
  addFieldIfPresent(fields, fieldMap, 'Start Date', 'opened', groupKey);
  addFieldIfPresent(fields, fieldMap, 'Date Updated', 'date_updated', groupKey);
  addFieldIfNotNA(fields, fieldMap, 'Date Satisfied', 'date_satisfied', groupKey);
  addFieldIfNotNA(fields, fieldMap, 'Default Date', 'default_date', groupKey);
  addFieldIfPresent(
    fields,
    fieldMap,
    'Default/Delinquent Balance',
    'delinquent_balance',
    groupKey,
  );
  addFieldIfPresent(fields, fieldMap, 'Payment Frequency', 'payment_frequency', groupKey);
  addFieldIfNotNA(
    fields,
    fieldMap,
    'Supplementary Information',
    'supplementary_info',
    groupKey,
  );

  // Parse Repayment Terms: "420 payments @ £1634" → separate fields
  const repaymentTerms = fieldMap.get('Repayment Terms');
  if (repaymentTerms && repaymentTerms !== 'N/A') {
    const termsMatch = /^(\d+)\s+payments?\s+@\s+(.+)$/.exec(repaymentTerms);
    if (termsMatch) {
      fields.push({
        name: 'repayment-period',
        value: termsMatch[1]!,
        groupKey,
        confidence: 'high',
      });
      fields.push({
        name: 'regular-payment',
        value: termsMatch[2]!,
        groupKey,
        confidence: 'high',
      });
    }
  }

  // Credit card extra fields
  if (isCreditCardType(accountType)) {
    addFieldIfPresent(fields, fieldMap, 'Payment Amount', 'payment_amount', groupKey);
    addFieldIfPresent(
      fields,
      fieldMap,
      'Previous Statement Balance',
      'statement_balance',
      groupKey,
    );
    addFieldIfPresent(
      fields,
      fieldMap,
      'Cash Advance Amount',
      'cash_advance_amount',
      groupKey,
    );
    addFieldIfPresent(
      fields,
      fieldMap,
      'Number of Cash Advances During Month',
      'cash_advance_count',
      groupKey,
    );
    addFieldIfPresent(
      fields,
      fieldMap,
      'Credit Limit Change',
      'credit_limit_change',
      groupKey,
    );
    addFieldIfPresent(fields, fieldMap, 'Minimum Payment', 'minimum_payment', groupKey);
    addFieldIfPresent(fields, fieldMap, 'Promotional Rate', 'promotional_rate', groupKey);
  }

  // Parse payment history grid
  if (paymentHistoryLines.length > 0) {
    const entries = parsePaymentHistoryGrid(paymentHistoryLines);
    for (const entry of entries) {
      fields.push({
        name: `payment_history_${entry.period.replace('-', '_')}`,
        value: entry.code,
        groupKey,
        confidence: 'high',
      });
    }
  }

  return {
    domain: 'tradelines',
    sourceSystem: 'Equifax',
    fields,
  };
}

/**
 * Split account lines into field lines (before payment history) and
 * payment history grid lines.
 */
function splitFieldsAndPaymentHistory(lines: string[]): {
  fieldLines: string[];
  paymentHistoryLines: string[];
} {
  const fieldLines: string[] = [];
  const paymentHistoryLines: string[] = [];
  let inPaymentHistory = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (PAYMENT_HISTORY_HEADER_RE.test(trimmed)) {
      inPaymentHistory = true;
      // Don't include the header in payment history lines — it's been consumed
      continue;
    }

    if (inPaymentHistory) {
      if (APPENDIX_NOTE_RE.test(trimmed)) {
        // End of payment history
        inPaymentHistory = false;
        continue;
      }
      paymentHistoryLines.push(line);
    } else {
      fieldLines.push(line);
    }
  }

  return { fieldLines, paymentHistoryLines };
}

/**
 * Add a field to the array if the source label exists in the map.
 */
function addFieldIfPresent(
  fields: RawField[],
  fieldMap: Map<string, string>,
  sourceLabel: string,
  targetName: string,
  groupKey: string,
): void {
  const value = fieldMap.get(sourceLabel);
  if (value !== undefined) {
    fields.push({
      name: targetName,
      value,
      groupKey,
      confidence: 'high',
    });
  }
}

/**
 * Add a field to the array if it exists and is not "N/A".
 */
function addFieldIfNotNA(
  fields: RawField[],
  fieldMap: Map<string, string>,
  sourceLabel: string,
  targetName: string,
  groupKey: string,
): void {
  const value = fieldMap.get(sourceLabel);
  if (value !== undefined && value !== 'N/A') {
    fields.push({
      name: targetName,
      value,
      groupKey,
      confidence: 'high',
    });
  }
}

/**
 * Check if an account type is a credit card type (has extra fields).
 */
function isCreditCardType(accountType: string): boolean {
  const ccTypes = [
    'Credit Card',
    'Budget Card / Revolving Credit',
    'Charge Card',
    'Store Card',
  ];
  return ccTypes.some((t) => accountType.startsWith(t));
}
