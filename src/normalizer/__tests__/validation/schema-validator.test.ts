import { describe, it, expect } from 'vitest';
import { validateSchema } from '../../validation/schema-validator';
import type { CreditFile } from '../../credit-file.types';

function makeValidCreditFile(): CreditFile {
  return {
    schema_version: '1.0.0',
    file_id: 'file:abc12345',
    subject_id: 'subject:default',
    created_at: '2024-08-20T12:00:00Z',
    currency_code: 'GBP',
    imports: [{
      import_id: 'imp:equifax01',
      imported_at: '2024-08-20T12:00:00Z',
      source_system: 'equifax',
      acquisition_method: 'html_scrape',
      source_wrapper: 'CheckMyFile',
    }],
    subject: {
      subject_id: 'subject:default',
      names: [{
        name_id: 'name:1',
        full_name: 'John Smith',
        name_type: 'legal',
        source_import_id: 'imp:equifax01',
      }],
      dates_of_birth: [{
        dob: '1986-07-09',
        source_import_id: 'imp:equifax01',
      }],
    },
    organisations: [{
      organisation_id: 'org:bank01',
      name: 'Test Bank',
      roles: ['furnisher'],
    }],
    addresses: [{
      address_id: 'addr:abc123',
      line_1: '1 Test Street',
      postcode: 'SW1A 1AA',
    }],
    address_associations: [{
      association_id: 'addr-assoc:1',
      address_id: 'addr:abc123',
      role: 'current',
      source_import_id: 'imp:equifax01',
    }],
    tradelines: [{
      tradeline_id: 'tl:1',
      furnisher_organisation_id: 'org:bank01',
      furnisher_name_raw: 'Test Bank',
      account_type: 'credit_card',
      source_import_id: 'imp:equifax01',
      monthly_metrics: [{
        monthly_metric_id: 'mm:1',
        period: '2024-08',
        metric_type: 'payment_status',
        value_text: 'Clean Payment',
        canonical_status: 'up_to_date',
        source_import_id: 'imp:equifax01',
      }],
    }],
    searches: [{
      search_id: 'search:1',
      organisation_id: 'org:bank01',
      organisation_name_raw: 'Test Bank',
      search_type: 'credit_application',
      visibility: 'hard',
      source_import_id: 'imp:equifax01',
    }],
    credit_scores: [{
      score_id: 'score:1',
      score_type: 'credit_score',
      score_value: 750,
      source_import_id: 'imp:equifax01',
    }],
    electoral_roll_entries: [{
      electoral_entry_id: 'er:1',
      change_type: 'added',
      source_import_id: 'imp:equifax01',
    }],
    financial_associates: [{
      associate_id: 'fa:1',
      associate_name: 'Jane Smith',
      relationship_basis: 'joint_account',
      status: 'active',
      source_import_id: 'imp:equifax01',
    }],
  };
}

describe('validateSchema', () => {
  it('valid CreditFile passes validation', () => {
    const file = makeValidCreditFile();
    const errors = validateSchema(file);
    expect(errors).toEqual([]);
  });

  it('missing required root fields are caught', () => {
    const file = makeValidCreditFile();
    file.schema_version = '';
    file.file_id = '' as any;
    file.subject_id = '';
    file.created_at = '';
    const errors = validateSchema(file);
    expect(errors.some(e => e.field === 'schema_version')).toBe(true);
    expect(errors.some(e => e.field === 'file_id')).toBe(true);
    expect(errors.some(e => e.field === 'subject_id')).toBe(true);
    expect(errors.some(e => e.field === 'created_at')).toBe(true);
  });

  it('invalid ID format is caught', () => {
    const file = makeValidCreditFile();
    file.file_id = 'file id with spaces' as any;
    const errors = validateSchema(file);
    expect(errors.some(e => e.field === 'file_id' && e.message.includes('invalid format'))).toBe(true);
  });

  it('invalid date format is caught', () => {
    const file = makeValidCreditFile();
    file.subject!.dates_of_birth = [{
      dob: '09-07-1986' as any,
      source_import_id: 'imp:equifax01',
    }];
    const errors = validateSchema(file);
    expect(errors.some(e => e.field === 'dob' && e.message.includes('Invalid DOB'))).toBe(true);
  });

  it('invalid enum values are caught', () => {
    const file = makeValidCreditFile();
    file.imports[0]!.source_system = 'invalid_cra' as any;
    file.imports[0]!.acquisition_method = 'telepathy' as any;
    const errors = validateSchema(file);
    expect(errors.some(e => e.field === 'source_system')).toBe(true);
    expect(errors.some(e => e.field === 'acquisition_method')).toBe(true);
  });

  it('tradeline without furnisher_organisation_id or furnisher_name_raw fails', () => {
    const file = makeValidCreditFile();
    file.tradelines = [{
      tradeline_id: 'tl:1',
      account_type: 'credit_card',
      source_import_id: 'imp:equifax01',
    }];
    const errors = validateSchema(file);
    expect(errors.some(e => e.domain === 'tradelines' && e.field === 'furnisher')).toBe(true);
  });

  it('search without organisation_id or organisation_name_raw fails', () => {
    const file = makeValidCreditFile();
    file.searches = [{
      search_id: 'search:1',
      search_type: 'credit_application',
      visibility: 'hard',
      source_import_id: 'imp:equifax01',
    }];
    const errors = validateSchema(file);
    expect(errors.some(e => e.domain === 'searches' && e.field === 'organisation')).toBe(true);
  });

  it('monthly metric without value_numeric, value_text, or raw_status_code fails', () => {
    const file = makeValidCreditFile();
    file.tradelines = [{
      tradeline_id: 'tl:1',
      furnisher_name_raw: 'Test Bank',
      account_type: 'credit_card',
      source_import_id: 'imp:equifax01',
      monthly_metrics: [{
        monthly_metric_id: 'mm:1',
        period: '2024-08',
        metric_type: 'payment_status',
        canonical_status: 'up_to_date',
        source_import_id: 'imp:equifax01',
      }],
    }];
    const errors = validateSchema(file);
    expect(errors.some(e => e.domain === 'tradelines.monthly_metrics' && e.field === 'value')).toBe(true);
  });

  it('empty imports array fails', () => {
    const file = makeValidCreditFile();
    file.imports = [];
    const errors = validateSchema(file);
    expect(errors.some(e => e.domain === 'imports' && e.message.includes('At least one'))).toBe(true);
  });

  it('missing subject fails', () => {
    const file = makeValidCreditFile();
    file.subject = undefined as any;
    const errors = validateSchema(file);
    expect(errors.some(e => e.domain === 'subject' && e.message.includes('subject is required'))).toBe(true);
  });

  it('invalid month format in monthly metric is caught', () => {
    const file = makeValidCreditFile();
    file.tradelines = [{
      tradeline_id: 'tl:1',
      furnisher_name_raw: 'Test Bank',
      source_import_id: 'imp:equifax01',
      monthly_metrics: [{
        monthly_metric_id: 'mm:1',
        period: '2024-13' as any,
        metric_type: 'payment_status',
        value_text: 'Clean Payment',
        source_import_id: 'imp:equifax01',
      }],
    }];
    const errors = validateSchema(file);
    expect(errors.some(e => e.field === 'period' && e.message.includes('Invalid month'))).toBe(true);
  });
});
