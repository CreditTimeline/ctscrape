// Auto-derived from ctspec/mappings/normalization-rules.v1.json

import type {
  AddressAssociationRole,
  CanonicalPaymentStatus,
  ElectoralChangeType,
  SearchType,
  SearchVisibility,
  TradelineAccountType,
} from './enums';

// ---------------------------------------------------------------------------
// Account type map — per CRA, raw text → TradelineAccountType
// ---------------------------------------------------------------------------

export const ACCOUNT_TYPE_MAP: Record<string, Record<string, TradelineAccountType>> = {
  equifax: {
    'credit card': 'credit_card',
    'budget card / revolving credit': 'budget_account',
    'mortgage': 'mortgage',
    'property rental': 'rental',
    'loan': 'unsecured_loan',
    'current account': 'current_account',
    'communications supplier': 'telecom',
    'utilities agreements': 'utility',
  },
  transunion: {
    'credit card': 'credit_card',
    'mortgage (unspecified type)': 'mortgage',
    'unsecured loan': 'unsecured_loan',
    'current account': 'current_account',
    'telecommunications supplier': 'telecom',
    'utility': 'utility',
    'property rental': 'rental',
    'budget account': 'budget_account',
  },
  experian: {
    'credit card': 'credit_card',
    'loan': 'unsecured_loan',
    'mortgage': 'mortgage',
    'mobile account': 'telecom',
    'utility account': 'utility',
    'bank account': 'current_account',
  },
} satisfies Record<string, Record<string, TradelineAccountType>>;

// ---------------------------------------------------------------------------
// Account status map — per CRA, raw text → canonical status string
// ---------------------------------------------------------------------------

export const ACCOUNT_STATUS_MAP: Record<string, Record<string, string>> = {
  equifax: {
    'up to date with payments': 'up_to_date',
    'settled': 'settled',
    'no update received': 'no_update',
    'defaulted': 'defaulted',
    'delinquent': 'delinquent',
  },
  transunion: {
    'up to date': 'up_to_date',
    'settled': 'settled',
    'satisfied': 'satisfied',
    'defaulted': 'defaulted',
    'arrangement to pay': 'arrangement',
    'no update received': 'no_update',
  },
};

// ---------------------------------------------------------------------------
// Payment status map — per CRA, CRA codes → CanonicalPaymentStatus
// ---------------------------------------------------------------------------

export const PAYMENT_STATUS_MAP: Record<string, Record<string, CanonicalPaymentStatus>> = {
  equifax: {
    '.': 'no_update',
    '0': 'up_to_date',
    '1': 'in_arrears',
    '2': 'in_arrears',
    '3': 'in_arrears',
    '4': 'in_arrears',
    '5': 'in_arrears',
    '6': 'in_arrears',
    'A': 'in_arrears',
    'B': 'in_arrears',
    'I': 'arrangement',
    'S': 'settled',
    'U': 'no_update',
    'R': 'repossession',
    'D': 'default',
    'Q': 'query',
    'G': 'gone_away',
    'N': 'inactive',
    'Z': 'inactive',
    'V': 'repossession',
    'W': 'written_off',
    'X': 'transferred',
  },
  transunion: {
    '0': 'up_to_date',
    '1': 'in_arrears',
    '2': 'in_arrears',
    '3': 'in_arrears',
    '4': 'in_arrears',
    '5': 'in_arrears',
    '6': 'in_arrears',
    'U': 'no_update',
    'UC': 'no_update',
    '?': 'unknown',
    'S': 'settled',
    'D': 'default',
    'Q': 'query',
    'G': 'gone_away',
  },
} satisfies Record<string, Record<string, CanonicalPaymentStatus>>;

// ---------------------------------------------------------------------------
// Search type map — per CRA, raw text → {search_type, visibility}
// ---------------------------------------------------------------------------

export const SEARCH_TYPE_MAP: Record<
  string,
  Record<string, { search_type: SearchType; visibility: SearchVisibility }>
> = {
  equifax: {
    'credit application': { search_type: 'credit_application', visibility: 'hard' },
    'debt collection': { search_type: 'debt_collection', visibility: 'hard' },
    'consumer enquiry': { search_type: 'consumer_enquiry', visibility: 'soft' },
    'id check to comply with ml regs': { search_type: 'identity_check', visibility: 'soft' },
    'credit quotation': { search_type: 'quotation', visibility: 'soft' },
    'identity verification': { search_type: 'identity_check', visibility: 'soft' },
    'n/a': { search_type: 'other', visibility: 'unknown' },
  },
  transunion: {
    'consumer credit file request': { search_type: 'consumer_enquiry', visibility: 'soft' },
    'quotation search': { search_type: 'quotation', visibility: 'soft' },
    'identity check for credit': { search_type: 'identity_check', visibility: 'soft' },
    'checking credit application': { search_type: 'credit_application', visibility: 'hard' },
    'general insurance': { search_type: 'insurance_quote', visibility: 'soft' },
    'AF': { search_type: 'credit_application', visibility: 'hard' },
    'AI': { search_type: 'identity_check', visibility: 'soft' },
    'AV': { search_type: 'aml', visibility: 'soft' },
  },
} satisfies Record<string, Record<string, { search_type: SearchType; visibility: SearchVisibility }>>;

// ---------------------------------------------------------------------------
// Address role map — per CRA, raw text → AddressAssociationRole
// ---------------------------------------------------------------------------

export const ADDRESS_ROLE_MAP: Record<string, Record<string, AddressAssociationRole>> = {
  equifax: {
    'current address': 'current',
    'previous address': 'previous',
    'linked address': 'linked',
    'address on agreement': 'on_agreement',
  },
  transunion: {
    'current address': 'current',
    'previous address': 'previous',
    'address links': 'linked',
    'input address': 'search_input',
    'address on agreement': 'on_agreement',
  },
  generic: {
    'default': 'other',
  },
} satisfies Record<string, Record<string, AddressAssociationRole>>;

// ---------------------------------------------------------------------------
// Electoral change type map — raw text → ElectoralChangeType
// ---------------------------------------------------------------------------

export const ELECTORAL_CHANGE_TYPE_MAP: Record<string, ElectoralChangeType> = {
  'added at the address': 'added',
  'amended at the address': 'amended',
  'deleted at the address': 'deleted',
  'n/a': 'none',
};

// ---------------------------------------------------------------------------
// CheckMyFile-specific payment status text map
// CheckMyFile uses descriptive text instead of CRA codes
// ---------------------------------------------------------------------------

export const CHECKMYFILE_PAYMENT_STATUS_MAP: Record<string, CanonicalPaymentStatus> = {
  'Clean Payment': 'up_to_date',
  'Late Payment': 'in_arrears',
  'Default': 'default',
  'Arrangement': 'arrangement',
  'Settled': 'settled',
  'Query': 'query',
  'Gone Away': 'gone_away',
  'No Update': 'no_update',
  'Written Off': 'written_off',
  'Repossession': 'repossession',
  'Transferred': 'transferred',
  'Inactive': 'inactive',
};
