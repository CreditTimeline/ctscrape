// Auto-derived from ctspec/schemas/credittimeline-v1-enums.json

export const SOURCE_SYSTEMS = ['equifax', 'transunion', 'experian', 'other'] as const;
export type SourceSystem = (typeof SOURCE_SYSTEMS)[number];

export const ACQUISITION_METHODS = ['pdf_upload', 'html_scrape', 'api', 'image', 'other'] as const;
export type AcquisitionMethod = (typeof ACQUISITION_METHODS)[number];

export const CONFIDENCE_LEVELS = ['low', 'medium', 'high'] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

export const SUBJECT_IDENTIFIER_TYPES = ['provider_reference', 'application_reference', 'other'] as const;
export type SubjectIdentifierType = (typeof SUBJECT_IDENTIFIER_TYPES)[number];

export const NAME_TYPES = ['legal', 'alias', 'historical', 'other'] as const;
export type NameType = (typeof NAME_TYPES)[number];

export const ADDRESS_ASSOCIATION_ROLES = ['current', 'previous', 'linked', 'on_agreement', 'search_input', 'other'] as const;
export type AddressAssociationRole = (typeof ADDRESS_ASSOCIATION_ROLES)[number];

export const FINANCIAL_ASSOCIATE_RELATIONSHIPS = ['joint_account', 'joint_application', 'other'] as const;
export type FinancialAssociateRelationship = (typeof FINANCIAL_ASSOCIATE_RELATIONSHIPS)[number];

export const FINANCIAL_ASSOCIATE_STATUSES = ['active', 'disputed', 'removed', 'unknown'] as const;
export type FinancialAssociateStatus = (typeof FINANCIAL_ASSOCIATE_STATUSES)[number];

export const ELECTORAL_CHANGE_TYPES = ['added', 'amended', 'deleted', 'none', 'unknown'] as const;
export type ElectoralChangeType = (typeof ELECTORAL_CHANGE_TYPES)[number];

export const ORGANISATION_ROLES = ['furnisher', 'searcher', 'court_source', 'fraud_agency', 'other'] as const;
export type OrganisationRole = (typeof ORGANISATION_ROLES)[number];

export const INDUSTRY_TYPES = ['bank', 'telecom', 'utility', 'insurer', 'landlord', 'government', 'other'] as const;
export type IndustryType = (typeof INDUSTRY_TYPES)[number];

export const TRADELINE_ACCOUNT_TYPES = [
  'credit_card',
  'mortgage',
  'secured_loan',
  'unsecured_loan',
  'current_account',
  'telecom',
  'utility',
  'rental',
  'budget_account',
  'insurance',
  'other',
  'unknown',
] as const;
export type TradelineAccountType = (typeof TRADELINE_ACCOUNT_TYPES)[number];

export const TRADELINE_IDENTIFIER_TYPES = ['masked_account_number', 'provider_reference', 'other'] as const;
export type TradelineIdentifierType = (typeof TRADELINE_IDENTIFIER_TYPES)[number];

export const TRADELINE_PARTY_ROLES = ['primary', 'secondary', 'joint', 'guarantor', 'other'] as const;
export type TradelinePartyRole = (typeof TRADELINE_PARTY_ROLES)[number];

export const TRADELINE_TERM_TYPES = ['revolving', 'installment', 'mortgage', 'rental', 'other'] as const;
export type TradelineTermType = (typeof TRADELINE_TERM_TYPES)[number];

export const TRADELINE_METRIC_TYPES = ['payment_status', 'balance', 'credit_limit', 'statement_balance', 'payment_amount', 'other'] as const;
export type TradelineMetricType = (typeof TRADELINE_METRIC_TYPES)[number];

export const CANONICAL_PAYMENT_STATUSES = [
  'up_to_date',
  'in_arrears',
  'arrangement',
  'settled',
  'default',
  'query',
  'gone_away',
  'no_update',
  'inactive',
  'written_off',
  'transferred',
  'repossession',
  'unknown',
] as const;
export type CanonicalPaymentStatus = (typeof CANONICAL_PAYMENT_STATUSES)[number];

export const TRADELINE_EVENT_TYPES = [
  'default',
  'delinquency',
  'satisfied',
  'settled',
  'arrangement_to_pay',
  'query',
  'gone_away',
  'written_off',
  'repossession',
  'other',
] as const;
export type TradelineEventType = (typeof TRADELINE_EVENT_TYPES)[number];

export const SEARCH_TYPES = [
  'credit_application',
  'debt_collection',
  'quotation',
  'identity_check',
  'consumer_enquiry',
  'aml',
  'insurance_quote',
  'other',
] as const;
export type SearchType = (typeof SEARCH_TYPES)[number];

export const SEARCH_VISIBILITIES = ['hard', 'soft', 'unknown'] as const;
export type SearchVisibility = (typeof SEARCH_VISIBILITIES)[number];

export const PUBLIC_RECORD_TYPES = ['ccj', 'judgment', 'bankruptcy', 'iva', 'dro', 'administration_order', 'other'] as const;
export type PublicRecordType = (typeof PUBLIC_RECORD_TYPES)[number];

export const PUBLIC_RECORD_STATUSES = ['active', 'satisfied', 'set_aside', 'discharged', 'unknown'] as const;
export type PublicRecordStatus = (typeof PUBLIC_RECORD_STATUSES)[number];

export const NOTICE_SCOPES = ['file', 'address', 'entity'] as const;
export type NoticeScope = (typeof NOTICE_SCOPES)[number];

export const FRAUD_SCHEMES = ['cifas', 'other'] as const;
export type FraudScheme = (typeof FRAUD_SCHEMES)[number];

export const FRAUD_MARKER_TYPES = ['protective_registration', 'victim_of_impersonation', 'other'] as const;
export type FraudMarkerType = (typeof FRAUD_MARKER_TYPES)[number];

export const FRAUD_ADDRESS_SCOPES = ['current', 'previous', 'linked', 'file', 'unknown'] as const;
export type FraudAddressScope = (typeof FRAUD_ADDRESS_SCOPES)[number];

export const ATTRIBUTABLE_ENTITY_DOMAINS = ['tradeline', 'search', 'address', 'public_record', 'fraud_marker', 'other'] as const;
export type AttributableEntityDomain = (typeof ATTRIBUTABLE_ENTITY_DOMAINS)[number];

export const DISPUTE_ENTITY_DOMAINS = ['tradeline', 'search', 'address', 'public_record', 'fraud_marker', 'other'] as const;
export type DisputeEntityDomain = (typeof DISPUTE_ENTITY_DOMAINS)[number];

export const DISPUTE_STATUSES = ['open', 'under_review', 'resolved', 'rejected', 'withdrawn'] as const;
export type DisputeStatus = (typeof DISPUTE_STATUSES)[number];

export const CREDIT_SCORE_TYPES = ['credit_score', 'affordability', 'stability', 'custom', 'other'] as const;
export type CreditScoreType = (typeof CREDIT_SCORE_TYPES)[number];

export const RAW_ARTIFACT_TYPES = ['pdf', 'html', 'json', 'image', 'text', 'other'] as const;
export type RawArtifactType = (typeof RAW_ARTIFACT_TYPES)[number];
