/**
 * Constants for the Equifax PDF adapter.
 * Regex patterns, known field labels, and section header matchers.
 */

/** Matches numbered section headers like "1. Personal Information" */
export const SECTION_HEADER_RE = /^(\d+)\.\s+(.+)$/;

/** Matches page headers like "Mr. Robert Knight - Equifax Credit Report - 13/02/2026" */
export const PAGE_HEADER_RE =
  /^.+\s-\sEquifax Credit Report\s-\s\d{2}\/\d{2}\/\d{4}$/;

/** Matches account headers like "Mortgage from Halifax" or "Credit Card from BARCLAYCARD CENTRE (I)" */
export const ACCOUNT_HEADER_RE = /^(.+?)\s+from\s+(.+)$/;

/** Matches "Payment History/ Account Number: XXXX" lines */
export const PAYMENT_HISTORY_HEADER_RE =
  /^Payment History\/ Account Number:\s*(.+)$/;

/** Matches the appendix note that terminates a payment history grid */
export const APPENDIX_NOTE_RE =
  /^See Appendix A for explanatory information on payment statuses used above\.$/;

/** Matches a 4-digit year on its own line */
export const YEAR_RE = /^\d{4}$/;

/** Matches a DD/MM/YYYY date */
export const DATE_RE = /^\d{2}\/\d{2}\/\d{4}$/;

/** Month letters in calendar order (Jan=J, Feb=F, ..., Dec=D) */
export const MONTH_LETTERS = [
  'J',
  'F',
  'M',
  'A',
  'M',
  'J',
  'J',
  'A',
  'S',
  'O',
  'N',
  'D',
] as const;

/**
 * Account type category sub-headers that appear within the Credit Agreements section.
 * These group individual accounts by broad type.
 */
export const CATEGORY_SUBHEADERS = [
  'Mortgage / Rentals Agreements',
  'Loan Agreements',
  'Utilities Agreements',
  'Banking Agreements',
  'Credit Card Agreement',
  'Hire Purchase Agreements',
  'Other Agreements',
] as const;

/**
 * Map from category sub-header text to the default account type.
 * Individual accounts may override this with more specific types (e.g., "Communications Supplier").
 */
export const CATEGORY_TO_DEFAULT_TYPE: Record<string, string> = {
  'Mortgage / Rentals Agreements': 'Mortgage',
  'Loan Agreements': 'Loan',
  'Utilities Agreements': 'Utilities',
  'Banking Agreements': 'Banking',
  'Credit Card Agreement': 'Credit Card',
  'Hire Purchase Agreements': 'Hire Purchase',
  'Other Agreements': 'Other',
};

/**
 * Known field labels for credit agreement entries, in typical order of appearance.
 * Used by extractFieldsFromLines to detect key-value patterns.
 */
export const CREDIT_AGREEMENT_LABELS: readonly string[] = [
  'Account Number',
  'Address On Agreement',
  'Account Holder',
  'Date of Birth',
  'Repayment Terms',
  'Status',
  'Payment Frequency',
  'Credit Limit',
  'Start Balance',
  'Current Balance',
  'Default/Delinquent Balance',
  'Start Date',
  'Date Updated',
  'Date last Delinquent',
  'Date Satisfied',
  'Default Date',
  'Supplementary Information',
] as const;

/**
 * Additional fields that appear on credit card accounts after the standard fields.
 */
export const CREDIT_CARD_EXTRA_LABELS: readonly string[] = [
  'Payment Amount',
  'Previous Statement Balance',
  'Cash Advance Amount',
  'Number of Cash Advances During Month',
  'Credit Limit Change',
  'Minimum Payment',
  'Promotional Rate',
] as const;

/**
 * All known credit agreement labels (standard + credit card extras).
 */
export const ALL_AGREEMENT_LABELS: readonly string[] = [
  ...CREDIT_AGREEMENT_LABELS,
  ...CREDIT_CARD_EXTRA_LABELS,
];

/** Valid payment history status codes (single characters) */
export const VALID_STATUS_CODES = new Set([
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  'A',
  'D',
  'N',
  'S',
  'U',
  '.',
]);

/** Adapter identifier */
export const ADAPTER_ID = 'equifax-pdf';

/** Adapter display name */
export const ADAPTER_NAME = 'Equifax PDF';

/** Adapter version */
export const ADAPTER_VERSION = '0.1.0';
