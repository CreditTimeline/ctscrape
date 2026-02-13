export const CRA_NAMES = ['Experian', 'Equifax', 'TransUnion'] as const;
export type CraName = (typeof CRA_NAMES)[number];

/** data-testid based selectors for the download page */
export const SELECTORS = {
  PAGE_CONTAINER: 'printable-report-page-container',
  PAGE_HEADING: 'printable-report-page-heading',
  INTRO_HEADING: 'printable-report-page-intro-heading',
  FOOTER: 'footer',
  FOOTER_REPORT_INFO: 'footer-report-generation-info',
  SCORE: 'score',
  SCORE_LITE: 'score-lite',
  CURRENT_BAND: 'current-band',
  // Tables
  PAYMENT_HISTORY_TABLE: 'printable-report-paymentHistory-table',
  PAYMENT_HISTORY_TABLE_HEADING: 'printable-report-paymentHistory-table-heading',
  ADDRESSES_TABLE: 'printable-report-addresses-table',
  ADDRESSES_TABLE_HEADING: 'printable-report-addresses-table-heading',
  ASSOCIATIONS_TABLE: 'printable-report-associations-table',
  ASSOCIATIONS_TABLE_HEADING: 'printable-report-associations-table-heading',
  ALIASES_TABLE: 'printable-report-aliases-table',
  ALIASES_TABLE_HEADING: 'printable-report-aliases-table-heading',
  // Searches
  SEARCH_CARD: 'printable-report-search',
  SEARCH_HEADING: 'printable-report-search-heading',
  SEARCH_AGENCY_NAME: 'printable-report-search-agency-name',
} as const;

/** Build a data-testid selector for a CRA-specific table cell */
export function tableDataTestId(cra: CraName, fieldSlug: string): string {
  return `table-data-${cra}-${fieldSlug}`;
}

/** The field slugs found in account tables (used with tableDataTestId) */
export const ACCOUNT_FIELD_SLUGS = [
  'lender',
  'account-type',
  'opened',
  'opening-balance',
  'repayment-period',
  'regular-payment',
  'closed',
  'reported-until',
  'name',
  'address',
  'date-of-birth',
  'balance',
  'limit',
  'status',
  'payment-history',
] as const;

/** The field slugs found in address tables */
export const ADDRESS_FIELD_SLUGS = [
  'address',
  'name',
  'electoral-roll',
  'marketing-status',
  'linked-address',
] as const;

/** The field slugs found in association tables */
export const ASSOCIATION_FIELD_SLUGS = [
  'associated-to',
  'date-of-birth',
  'created-by',
  'created-on',
  'confirmed-by',
  'last-confirmed',
] as const;

/** The field slugs found in alias tables */
export const ALIAS_FIELD_SLUGS = ['alias-name'] as const;

/** The field slugs found in search cards */
export const SEARCH_FIELD_SLUGS = ['companyName', 'name', 'address'] as const;

/** Section heading text for classification */
export const SECTION_HEADINGS = {
  ACTIVE_ACCOUNTS: 'Payment History - Active Accounts',
  CLOSED_ACCOUNTS: 'Payment History - Closed Accounts',
  ADDRESSES: 'Addresses & Electoral Roll',
  ASSOCIATIONS: 'Associations',
  ALIASES: 'Aliases',
  HARD_SEARCHES: 'Hard Searches',
  SOFT_SEARCHES: 'Soft Searches',
} as const;

/** Sentinel text used when a CRA has no data for a field */
export const NO_DATA_SENTINEL =
  'No information has been reported to this agency matching these details.';
