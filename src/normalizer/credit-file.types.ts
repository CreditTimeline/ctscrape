/**
 * TypeScript interfaces for the ctspec CreditTimeline Canonical Credit File v1.
 * Derived from credittimeline-file.v1.schema.json and credittimeline-v1-enums.json.
 */

// ---------------------------------------------------------------------------
// Branded / alias scalar types
// ---------------------------------------------------------------------------

/** ID string: ^[A-Za-z0-9._:-]+$, 1-128 chars */
export type CtId = string;

/** Date: YYYY-MM-DD */
export type CtDate = string;

/** Month: YYYY-MM */
export type CtMonth = string;

/** ISO 8601 date-time */
export type CtDateTime = string;

/** Integer minor units (pence for GBP) */
export type CtAmount = number;

/** Arbitrary vendor/adapter extension data */
export type Extensions = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Enum literal unions
// ---------------------------------------------------------------------------

export type SourceSystem = 'equifax' | 'transunion' | 'experian' | 'other';

export type AcquisitionMethod =
  | 'pdf_upload'
  | 'html_scrape'
  | 'api'
  | 'image'
  | 'other';

export type ConfidenceLevel = 'low' | 'medium' | 'high';

export type SubjectIdentifierType =
  | 'provider_reference'
  | 'application_reference'
  | 'other';

export type NameType = 'legal' | 'alias' | 'historical' | 'other';

export type AddressAssociationRole =
  | 'current'
  | 'previous'
  | 'linked'
  | 'on_agreement'
  | 'search_input'
  | 'other';

export type FinancialAssociateRelationship =
  | 'joint_account'
  | 'joint_application'
  | 'other';

export type FinancialAssociateStatus =
  | 'active'
  | 'disputed'
  | 'removed'
  | 'unknown';

export type ElectoralChangeType =
  | 'added'
  | 'amended'
  | 'deleted'
  | 'none'
  | 'unknown';

export type OrganisationRole =
  | 'furnisher'
  | 'searcher'
  | 'court_source'
  | 'fraud_agency'
  | 'other';

export type IndustryType =
  | 'bank'
  | 'telecom'
  | 'utility'
  | 'insurer'
  | 'landlord'
  | 'government'
  | 'other';

export type TradelineAccountType =
  | 'credit_card'
  | 'mortgage'
  | 'secured_loan'
  | 'unsecured_loan'
  | 'current_account'
  | 'telecom'
  | 'utility'
  | 'rental'
  | 'budget_account'
  | 'insurance'
  | 'other'
  | 'unknown';

export type TradelineIdentifierType =
  | 'masked_account_number'
  | 'provider_reference'
  | 'other';

export type TradelinePartyRole =
  | 'primary'
  | 'secondary'
  | 'joint'
  | 'guarantor'
  | 'other';

export type TradelineTermType =
  | 'revolving'
  | 'installment'
  | 'mortgage'
  | 'rental'
  | 'other';

export type TradelineMetricType =
  | 'payment_status'
  | 'balance'
  | 'credit_limit'
  | 'statement_balance'
  | 'payment_amount'
  | 'other';

export type CanonicalPaymentStatus =
  | 'up_to_date'
  | 'in_arrears'
  | 'arrangement'
  | 'settled'
  | 'default'
  | 'query'
  | 'gone_away'
  | 'no_update'
  | 'inactive'
  | 'written_off'
  | 'transferred'
  | 'repossession'
  | 'unknown';

export type TradelineEventType =
  | 'default'
  | 'delinquency'
  | 'satisfied'
  | 'settled'
  | 'arrangement_to_pay'
  | 'query'
  | 'gone_away'
  | 'written_off'
  | 'repossession'
  | 'other';

export type SearchType =
  | 'credit_application'
  | 'debt_collection'
  | 'quotation'
  | 'identity_check'
  | 'consumer_enquiry'
  | 'aml'
  | 'insurance_quote'
  | 'other';

export type SearchVisibility = 'hard' | 'soft' | 'unknown';

export type PublicRecordType =
  | 'ccj'
  | 'judgment'
  | 'bankruptcy'
  | 'iva'
  | 'dro'
  | 'administration_order'
  | 'other';

export type PublicRecordStatus =
  | 'active'
  | 'satisfied'
  | 'set_aside'
  | 'discharged'
  | 'unknown';

export type NoticeScope = 'file' | 'address' | 'entity';

export type FraudScheme = 'cifas' | 'other';

export type FraudMarkerType =
  | 'protective_registration'
  | 'victim_of_impersonation'
  | 'other';

export type FraudAddressScope =
  | 'current'
  | 'previous'
  | 'linked'
  | 'file'
  | 'unknown';

export type AttributableEntityDomain =
  | 'tradeline'
  | 'search'
  | 'address'
  | 'public_record'
  | 'fraud_marker'
  | 'other';

export type DisputeEntityDomain =
  | 'tradeline'
  | 'search'
  | 'address'
  | 'public_record'
  | 'fraud_marker'
  | 'other';

export type DisputeStatus =
  | 'open'
  | 'under_review'
  | 'resolved'
  | 'rejected'
  | 'withdrawn';

export type CreditScoreType =
  | 'credit_score'
  | 'affordability'
  | 'stability'
  | 'custom'
  | 'other';

/** ISO 4217 currency code (^[A-Z]{3}$) */
export type CurrencyCode = string;

export type RawArtifactType =
  | 'pdf'
  | 'html'
  | 'json'
  | 'image'
  | 'text'
  | 'other';

// ---------------------------------------------------------------------------
// Entity interfaces
// ---------------------------------------------------------------------------

export interface RawArtifact {
  artifact_id: CtId;
  artifact_type: RawArtifactType;
  sha256: string;
  uri?: string;
  embedded_base64?: string;
  extracted_text_ref?: string;
  extensions?: Extensions;
}

export interface ImportBatch {
  import_id: CtId;
  imported_at: CtDateTime;
  currency_code?: CurrencyCode;
  source_system: SourceSystem;
  source_wrapper?: string;
  acquisition_method: AcquisitionMethod;
  mapping_version?: string;
  confidence_notes?: string;
  raw_artifacts?: RawArtifact[];
  extensions?: Extensions;
}

export interface DateOfBirthRecord {
  dob: CtDate;
  source_import_id: CtId;
  confidence?: ConfidenceLevel;
  extensions?: Extensions;
}

export interface SubjectIdentifier {
  identifier_id: CtId;
  identifier_type: SubjectIdentifierType;
  value: string;
  source_import_id: CtId;
  extensions?: Extensions;
}

export interface PersonName {
  name_id: CtId;
  full_name?: string;
  title?: string;
  given_name?: string;
  middle_name?: string;
  family_name?: string;
  suffix?: string;
  name_type?: NameType;
  valid_from?: CtDate;
  valid_to?: CtDate;
  source_import_id: CtId;
  extensions?: Extensions;
}

export interface Subject {
  subject_id: CtId;
  names?: PersonName[];
  dates_of_birth?: DateOfBirthRecord[];
  identifiers?: SubjectIdentifier[];
  extensions?: Extensions;
}

export interface Address {
  address_id: CtId;
  line_1?: string;
  line_2?: string;
  line_3?: string;
  town_city?: string;
  county_region?: string;
  postcode?: string;
  country_code?: string;
  normalized_single_line?: string;
  extensions?: Extensions;
}

export interface AddressAssociation {
  association_id: CtId;
  address_id: CtId;
  role?: AddressAssociationRole;
  valid_from?: CtDate;
  valid_to?: CtDate;
  source_import_id: CtId;
  extensions?: Extensions;
}

export interface AddressLink {
  address_link_id: CtId;
  from_address_id: CtId;
  to_address_id: CtId;
  source_organisation_name?: string;
  last_confirmed_at?: CtDate;
  source_import_id: CtId;
  extensions?: Extensions;
}

export interface FinancialAssociate {
  associate_id: CtId;
  associate_name?: string;
  relationship_basis?: FinancialAssociateRelationship;
  status?: FinancialAssociateStatus;
  confirmed_at?: CtDate;
  source_import_id: CtId;
  extensions?: Extensions;
}

export interface ElectoralRollEntry {
  electoral_entry_id: CtId;
  address_id?: CtId;
  name_on_register?: string;
  registered_from?: CtDate;
  registered_to?: CtDate;
  change_type?: ElectoralChangeType;
  marketing_opt_out?: boolean | null;
  source_import_id: CtId;
  extensions?: Extensions;
}

export interface Organisation {
  organisation_id: CtId;
  name: string;
  roles?: OrganisationRole[];
  industry_type?: IndustryType;
  source_import_id?: CtId;
  extensions?: Extensions;
}

export interface TradelineIdentifier {
  identifier_id: CtId;
  identifier_type: TradelineIdentifierType;
  value: string;
  source_import_id: CtId;
  extensions?: Extensions;
}

export interface TradelineParty {
  party_id: CtId;
  party_role?: TradelinePartyRole;
  name?: string;
  source_import_id: CtId;
  extensions?: Extensions;
}

export interface TradelineTerms {
  terms_id: CtId;
  term_type?: TradelineTermType;
  term_count?: number;
  term_payment_amount?: CtAmount;
  payment_start_date?: CtDate;
  source_import_id: CtId;
  extensions?: Extensions;
}

export interface TradelineSnapshot {
  snapshot_id: CtId;
  as_of_date?: CtDate;
  status_current?: string;
  source_account_ref?: string;
  current_balance?: CtAmount;
  opening_balance?: CtAmount;
  credit_limit?: CtAmount;
  delinquent_balance?: CtAmount;
  payment_amount?: CtAmount;
  statement_balance?: CtAmount;
  minimum_payment_received?: boolean | null;
  cash_advance_amount?: CtAmount;
  cash_advance_count?: number;
  credit_limit_change?: string;
  promotional_rate_flag?: boolean | null;
  source_import_id: CtId;
  extensions?: Extensions;
}

/**
 * Monthly metric for a tradeline.
 *
 * Schema anyOf constraint: at least one of `value_numeric`, `value_text`,
 * or `raw_status_code` must be present.
 */
export interface TradelineMonthlyMetric {
  monthly_metric_id: CtId;
  period: CtMonth;
  metric_type: TradelineMetricType;
  value_numeric?: CtAmount;
  value_text?: string;
  canonical_status?: CanonicalPaymentStatus;
  raw_status_code?: string;
  reported_at?: CtDate;
  source_import_id: CtId;
  extensions?: Extensions;
}

export interface TradelineEvent {
  event_id: CtId;
  event_type: TradelineEventType;
  event_date: CtDate;
  amount?: CtAmount;
  notes?: string;
  source_import_id: CtId;
  extensions?: Extensions;
}

/**
 * A credit account / tradeline.
 *
 * Schema anyOf constraint: at least one of `furnisher_organisation_id`
 * or `furnisher_name_raw` must be present.
 */
export interface Tradeline {
  tradeline_id: CtId;
  canonical_id?: string;
  furnisher_organisation_id?: CtId;
  furnisher_name_raw?: string;
  account_type?: TradelineAccountType;
  opened_at?: CtDate;
  closed_at?: CtDate;
  status_current?: string;
  repayment_frequency?: string;
  regular_payment_amount?: CtAmount;
  supplementary_info?: string;
  identifiers?: TradelineIdentifier[];
  parties?: TradelineParty[];
  terms?: TradelineTerms;
  snapshots?: TradelineSnapshot[];
  monthly_metrics?: TradelineMonthlyMetric[];
  events?: TradelineEvent[];
  source_import_id: CtId;
  extensions?: Extensions;
}

/**
 * A credit search / enquiry.
 *
 * Schema anyOf constraint: at least one of `organisation_id`
 * or `organisation_name_raw` must be present.
 */
export interface SearchRecord {
  search_id: CtId;
  searched_at?: CtDate;
  organisation_id?: CtId;
  organisation_name_raw?: string;
  search_type?: SearchType;
  visibility?: SearchVisibility;
  joint_application?: boolean | null;
  input_name?: string;
  input_dob?: CtDate;
  input_address_id?: CtId;
  reference?: string;
  purpose_text?: string;
  source_import_id: CtId;
  extensions?: Extensions;
}

export interface PublicRecord {
  public_record_id: CtId;
  record_type?: PublicRecordType;
  court_or_register?: string;
  amount?: CtAmount;
  recorded_at?: CtDate;
  satisfied_at?: CtDate;
  status?: PublicRecordStatus;
  address_id?: CtId;
  source_import_id: CtId;
  extensions?: Extensions;
}

export interface NoticeOfCorrection {
  notice_id: CtId;
  text?: string;
  created_at?: CtDate;
  expires_at?: CtDate;
  scope?: NoticeScope;
  scope_entity_id?: CtId;
  source_import_id: CtId;
  extensions?: Extensions;
}

export interface PropertyRecord {
  property_record_id: CtId;
  address_id?: CtId;
  property_type?: string;
  price_paid?: CtAmount;
  deed_date?: CtDate;
  tenure?: string;
  is_new_build?: boolean | null;
  source_import_id: CtId;
  extensions?: Extensions;
}

export interface GoneAwayRecord {
  gone_away_id: CtId;
  network?: string;
  recorded_at?: CtDate;
  old_address_id?: CtId;
  new_address_id?: CtId;
  notes?: string;
  source_import_id: CtId;
  extensions?: Extensions;
}

export interface FraudMarker {
  fraud_marker_id: CtId;
  scheme?: FraudScheme;
  marker_type?: FraudMarkerType;
  placed_at?: CtDate;
  expires_at?: CtDate;
  address_scope?: FraudAddressScope;
  address_id?: CtId;
  source_import_id: CtId;
  extensions?: Extensions;
}

export interface AttributableItem {
  attributable_item_id: CtId;
  entity_domain?: AttributableEntityDomain;
  linked_entity_id?: CtId;
  summary?: string;
  confidence?: ConfidenceLevel;
  reason?: string;
  source_import_id: CtId;
  extensions?: Extensions;
}

export interface Dispute {
  dispute_id: CtId;
  entity_domain?: DisputeEntityDomain;
  entity_id?: CtId;
  opened_at?: CtDate;
  closed_at?: CtDate;
  status?: DisputeStatus;
  notes?: string;
  source_import_id: CtId;
  extensions?: Extensions;
}

export interface CreditScore {
  score_id: CtId;
  score_type?: CreditScoreType;
  score_name?: string;
  score_value?: number;
  score_min?: number;
  score_max?: number;
  score_band?: string;
  calculated_at?: CtDate;
  score_factors?: string[];
  source_import_id: CtId;
  extensions?: Extensions;
}

export interface GeneratedInsight {
  insight_id: CtId;
  kind: string;
  summary?: string;
  linked_entity_ids?: CtId[];
  generated_at: CtDateTime;
  extensions?: Extensions;
}

// ---------------------------------------------------------------------------
// Root object
// ---------------------------------------------------------------------------

export interface CreditFile {
  schema_version: string;
  file_id: CtId;
  subject_id: CtId;
  created_at: CtDateTime;
  currency_code?: CurrencyCode;
  imports: ImportBatch[];
  subject: Subject;
  organisations?: Organisation[];
  addresses?: Address[];
  address_associations?: AddressAssociation[];
  address_links?: AddressLink[];
  financial_associates?: FinancialAssociate[];
  electoral_roll_entries?: ElectoralRollEntry[];
  tradelines?: Tradeline[];
  searches?: SearchRecord[];
  credit_scores?: CreditScore[];
  public_records?: PublicRecord[];
  notices_of_correction?: NoticeOfCorrection[];
  property_records?: PropertyRecord[];
  gone_away_records?: GoneAwayRecord[];
  fraud_markers?: FraudMarker[];
  attributable_items?: AttributableItem[];
  disputes?: Dispute[];
  generated_insights?: GeneratedInsight[];
  extensions?: Extensions;
}
