import type {
  CreditFile, ImportBatch, PersonName, Organisation, Address,
  AddressAssociation, Tradeline, TradelineMonthlyMetric, SearchRecord,
  CreditScore, ElectoralRollEntry, FinancialAssociate,
} from '../credit-file.types';
import type { NormalisationError } from '../types';
import {
  SOURCE_SYSTEMS, ACQUISITION_METHODS, TRADELINE_ACCOUNT_TYPES,
  CANONICAL_PAYMENT_STATUSES, SEARCH_TYPES, SEARCH_VISIBILITIES,
  TRADELINE_METRIC_TYPES, TRADELINE_EVENT_TYPES, TRADELINE_TERM_TYPES,
  TRADELINE_IDENTIFIER_TYPES, NAME_TYPES, ADDRESS_ASSOCIATION_ROLES,
  ORGANISATION_ROLES, ELECTORAL_CHANGE_TYPES, FINANCIAL_ASSOCIATE_RELATIONSHIPS,
  FINANCIAL_ASSOCIATE_STATUSES, CREDIT_SCORE_TYPES, RAW_ARTIFACT_TYPES,
} from '../data/enums';

const ID_PATTERN = /^[A-Za-z0-9._:-]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validateId(
  value: string | undefined,
  domain: string,
  field: string,
  errors: NormalisationError[],
  required = false,
): void {
  if (value == null) {
    if (required) errors.push({ domain, field, message: `${field} is required` });
    return;
  }
  if (!ID_PATTERN.test(value)) {
    errors.push({ domain, field, message: `${field} has invalid format: "${value}"` });
  }
}

function validateDate(
  value: string | undefined,
  domain: string,
  field: string,
  errors: NormalisationError[],
): void {
  if (value != null && !DATE_PATTERN.test(value)) {
    errors.push({ domain, field, message: `Invalid date format "${value}", expected YYYY-MM-DD` });
  }
}

function validateMonth(
  value: string | undefined,
  domain: string,
  field: string,
  errors: NormalisationError[],
): void {
  if (value != null && !MONTH_PATTERN.test(value)) {
    errors.push({ domain, field, message: `Invalid month format "${value}", expected YYYY-MM` });
  }
}

function validateEnum(
  value: string | undefined,
  allowed: readonly string[],
  domain: string,
  field: string,
  errors: NormalisationError[],
): void {
  if (value != null && !allowed.includes(value)) {
    errors.push({ domain, field, message: `Invalid ${field} value: "${value}"` });
  }
}

// ---------------------------------------------------------------------------
// Entity validators
// ---------------------------------------------------------------------------

function validateImportBatch(imp: ImportBatch, errors: NormalisationError[]): void {
  validateId(imp.import_id, 'imports', 'import_id', errors, true);
  if (!imp.imported_at) errors.push({ domain: 'imports', field: 'imported_at', message: 'imported_at is required' });
  validateEnum(imp.source_system, SOURCE_SYSTEMS, 'imports', 'source_system', errors);
  validateEnum(imp.acquisition_method, ACQUISITION_METHODS, 'imports', 'acquisition_method', errors);
  if (imp.raw_artifacts) {
    for (const art of imp.raw_artifacts) {
      validateId(art.artifact_id, 'imports.raw_artifacts', 'artifact_id', errors, true);
      validateEnum(art.artifact_type, RAW_ARTIFACT_TYPES, 'imports.raw_artifacts', 'artifact_type', errors);
    }
  }
}

function validatePersonName(name: PersonName, errors: NormalisationError[]): void {
  validateId(name.name_id, 'subject.names', 'name_id', errors, true);
  validateId(name.source_import_id, 'subject.names', 'source_import_id', errors, true);
  validateEnum(name.name_type, NAME_TYPES, 'subject.names', 'name_type', errors);
  validateDate(name.valid_from, 'subject.names', 'valid_from', errors);
  validateDate(name.valid_to, 'subject.names', 'valid_to', errors);
}

function validateOrganisation(org: Organisation, errors: NormalisationError[]): void {
  validateId(org.organisation_id, 'organisations', 'organisation_id', errors, true);
  if (!org.name) errors.push({ domain: 'organisations', field: 'name', message: 'organisation name is required' });
  if (org.roles) {
    for (const role of org.roles) {
      validateEnum(role, ORGANISATION_ROLES, 'organisations', 'roles', errors);
    }
  }
}

function validateAddress(addr: Address, errors: NormalisationError[]): void {
  validateId(addr.address_id, 'addresses', 'address_id', errors, true);
}

function validateAddressAssociation(assoc: AddressAssociation, errors: NormalisationError[]): void {
  validateId(assoc.association_id, 'address_associations', 'association_id', errors, true);
  validateId(assoc.address_id, 'address_associations', 'address_id', errors, true);
  validateId(assoc.source_import_id, 'address_associations', 'source_import_id', errors, true);
  validateEnum(assoc.role, ADDRESS_ASSOCIATION_ROLES, 'address_associations', 'role', errors);
  validateDate(assoc.valid_from, 'address_associations', 'valid_from', errors);
  validateDate(assoc.valid_to, 'address_associations', 'valid_to', errors);
}

function validateTradeline(tl: Tradeline, errors: NormalisationError[]): void {
  validateId(tl.tradeline_id, 'tradelines', 'tradeline_id', errors, true);
  validateId(tl.source_import_id, 'tradelines', 'source_import_id', errors, true);

  // anyOf: furnisher_organisation_id OR furnisher_name_raw
  if (!tl.furnisher_organisation_id && !tl.furnisher_name_raw) {
    errors.push({
      domain: 'tradelines',
      field: 'furnisher',
      message: `Tradeline "${tl.tradeline_id}" must have furnisher_organisation_id or furnisher_name_raw`,
    });
  }

  validateEnum(tl.account_type, TRADELINE_ACCOUNT_TYPES, 'tradelines', 'account_type', errors);
  validateDate(tl.opened_at, 'tradelines', 'opened_at', errors);
  validateDate(tl.closed_at, 'tradelines', 'closed_at', errors);

  if (tl.identifiers) {
    for (const ident of tl.identifiers) {
      validateId(ident.identifier_id, 'tradelines.identifiers', 'identifier_id', errors, true);
      validateEnum(ident.identifier_type, TRADELINE_IDENTIFIER_TYPES, 'tradelines.identifiers', 'identifier_type', errors);
    }
  }

  if (tl.terms) {
    validateId(tl.terms.terms_id, 'tradelines.terms', 'terms_id', errors, true);
    validateEnum(tl.terms.term_type, TRADELINE_TERM_TYPES, 'tradelines.terms', 'term_type', errors);
  }

  if (tl.monthly_metrics) {
    for (const mm of tl.monthly_metrics) {
      validateMonthlyMetric(mm, errors);
    }
  }

  if (tl.events) {
    for (const evt of tl.events) {
      validateId(evt.event_id, 'tradelines.events', 'event_id', errors, true);
      validateEnum(evt.event_type, TRADELINE_EVENT_TYPES, 'tradelines.events', 'event_type', errors);
      validateDate(evt.event_date, 'tradelines.events', 'event_date', errors);
    }
  }
}

function validateMonthlyMetric(mm: TradelineMonthlyMetric, errors: NormalisationError[]): void {
  validateId(mm.monthly_metric_id, 'tradelines.monthly_metrics', 'monthly_metric_id', errors, true);
  validateMonth(mm.period, 'tradelines.monthly_metrics', 'period', errors);
  validateEnum(mm.metric_type, TRADELINE_METRIC_TYPES, 'tradelines.monthly_metrics', 'metric_type', errors);
  validateEnum(mm.canonical_status, CANONICAL_PAYMENT_STATUSES, 'tradelines.monthly_metrics', 'canonical_status', errors);

  // anyOf: value_numeric, value_text, or raw_status_code
  if (mm.value_numeric == null && mm.value_text == null && mm.raw_status_code == null) {
    errors.push({
      domain: 'tradelines.monthly_metrics',
      field: 'value',
      message: `Monthly metric "${mm.monthly_metric_id}" must have value_numeric, value_text, or raw_status_code`,
    });
  }
}

function validateSearchRecord(sr: SearchRecord, errors: NormalisationError[]): void {
  validateId(sr.search_id, 'searches', 'search_id', errors, true);
  validateId(sr.source_import_id, 'searches', 'source_import_id', errors, true);

  // anyOf: organisation_id OR organisation_name_raw
  if (!sr.organisation_id && !sr.organisation_name_raw) {
    errors.push({
      domain: 'searches',
      field: 'organisation',
      message: `Search "${sr.search_id}" must have organisation_id or organisation_name_raw`,
    });
  }

  validateEnum(sr.search_type, SEARCH_TYPES, 'searches', 'search_type', errors);
  validateEnum(sr.visibility, SEARCH_VISIBILITIES, 'searches', 'visibility', errors);
  validateDate(sr.searched_at, 'searches', 'searched_at', errors);
}

function validateCreditScore(cs: CreditScore, errors: NormalisationError[]): void {
  validateId(cs.score_id, 'credit_scores', 'score_id', errors, true);
  validateId(cs.source_import_id, 'credit_scores', 'source_import_id', errors, true);
  validateEnum(cs.score_type, CREDIT_SCORE_TYPES, 'credit_scores', 'score_type', errors);
  validateDate(cs.calculated_at, 'credit_scores', 'calculated_at', errors);
}

function validateElectoralRollEntry(er: ElectoralRollEntry, errors: NormalisationError[]): void {
  validateId(er.electoral_entry_id, 'electoral_roll', 'electoral_entry_id', errors, true);
  validateId(er.source_import_id, 'electoral_roll', 'source_import_id', errors, true);
  validateEnum(er.change_type, ELECTORAL_CHANGE_TYPES, 'electoral_roll', 'change_type', errors);
  validateDate(er.registered_from, 'electoral_roll', 'registered_from', errors);
  validateDate(er.registered_to, 'electoral_roll', 'registered_to', errors);
}

function validateFinancialAssociate(fa: FinancialAssociate, errors: NormalisationError[]): void {
  validateId(fa.associate_id, 'financial_associates', 'associate_id', errors, true);
  validateId(fa.source_import_id, 'financial_associates', 'source_import_id', errors, true);
  validateEnum(fa.relationship_basis, FINANCIAL_ASSOCIATE_RELATIONSHIPS, 'financial_associates', 'relationship_basis', errors);
  validateEnum(fa.status, FINANCIAL_ASSOCIATE_STATUSES, 'financial_associates', 'status', errors);
  validateDate(fa.confirmed_at, 'financial_associates', 'confirmed_at', errors);
}

// ---------------------------------------------------------------------------
// Main validation entry point
// ---------------------------------------------------------------------------

export function validateSchema(file: CreditFile): NormalisationError[] {
  const errors: NormalisationError[] = [];

  // Root required fields
  if (!file.schema_version) errors.push({ domain: 'root', field: 'schema_version', message: 'schema_version is required' });
  if (!file.file_id) errors.push({ domain: 'root', field: 'file_id', message: 'file_id is required' });
  else validateId(file.file_id, 'root', 'file_id', errors);

  if (!file.subject_id) errors.push({ domain: 'root', field: 'subject_id', message: 'subject_id is required' });
  if (!file.created_at) errors.push({ domain: 'root', field: 'created_at', message: 'created_at is required' });

  // imports minItems: 1
  if (!file.imports || file.imports.length === 0) {
    errors.push({ domain: 'imports', message: 'At least one import batch is required' });
  } else {
    for (const imp of file.imports) validateImportBatch(imp, errors);
  }

  // subject
  if (!file.subject) {
    errors.push({ domain: 'subject', message: 'subject is required' });
  } else {
    if (!file.subject.subject_id) errors.push({ domain: 'subject', field: 'subject_id', message: 'subject.subject_id is required' });
    if (file.subject.names) {
      for (const name of file.subject.names) validatePersonName(name, errors);
    }
    if (file.subject.dates_of_birth) {
      for (const dob of file.subject.dates_of_birth) {
        if (!dob.dob || !DATE_PATTERN.test(dob.dob)) errors.push({ domain: 'subject', field: 'dob', message: `Invalid DOB format: "${dob.dob}"` });
        validateId(dob.source_import_id, 'subject', 'source_import_id', errors, true);
      }
    }
  }

  // Entity arrays
  if (file.organisations) for (const org of file.organisations) validateOrganisation(org, errors);
  if (file.addresses) for (const addr of file.addresses) validateAddress(addr, errors);
  if (file.address_associations) for (const assoc of file.address_associations) validateAddressAssociation(assoc, errors);
  if (file.tradelines) for (const tl of file.tradelines) validateTradeline(tl, errors);
  if (file.searches) for (const sr of file.searches) validateSearchRecord(sr, errors);
  if (file.credit_scores) for (const cs of file.credit_scores) validateCreditScore(cs, errors);
  if (file.electoral_roll_entries) for (const er of file.electoral_roll_entries) validateElectoralRollEntry(er, errors);
  if (file.financial_associates) for (const fa of file.financial_associates) validateFinancialAssociate(fa, errors);

  return errors;
}
