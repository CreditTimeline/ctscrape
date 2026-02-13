import { describe, it, expect } from 'vitest';
import { validateReferentialIntegrity } from '../../validation/referential-integrity';
import type { CreditFile } from '../../credit-file.types';

function makeValidCreditFile(): CreditFile {
  return {
    schema_version: '1.0.0',
    file_id: 'file:abc12345',
    subject_id: 'subject:default',
    created_at: '2024-08-20T12:00:00Z',
    imports: [{
      import_id: 'imp:equifax01',
      imported_at: '2024-08-20T12:00:00Z',
      source_system: 'equifax',
      acquisition_method: 'html_scrape',
    }],
    subject: {
      subject_id: 'subject:default',
      names: [{
        name_id: 'name:1',
        full_name: 'John Smith',
        name_type: 'legal',
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
      source_import_id: 'imp:equifax01',
    }],
    searches: [{
      search_id: 'search:1',
      organisation_id: 'org:bank01',
      organisation_name_raw: 'Test Bank',
      source_import_id: 'imp:equifax01',
    }],
  };
}

describe('validateReferentialIntegrity', () => {
  it('valid references pass', () => {
    const file = makeValidCreditFile();
    const errors = validateReferentialIntegrity(file);
    expect(errors).toEqual([]);
  });

  it('invalid source_import_id is caught', () => {
    const file = makeValidCreditFile();
    file.tradelines![0]!.source_import_id = 'imp:nonexistent';
    const errors = validateReferentialIntegrity(file);
    expect(errors.some(e => e.field === 'source_import_id' && e.message.includes('non-existent import'))).toBe(true);
  });

  it('invalid address_id reference is caught', () => {
    const file = makeValidCreditFile();
    file.address_associations![0]!.address_id = 'addr:nonexistent';
    const errors = validateReferentialIntegrity(file);
    expect(errors.some(e => e.field === 'address_id' && e.message.includes('non-existent address'))).toBe(true);
  });

  it('invalid furnisher_organisation_id reference is caught', () => {
    const file = makeValidCreditFile();
    file.tradelines![0]!.furnisher_organisation_id = 'org:nonexistent';
    const errors = validateReferentialIntegrity(file);
    expect(errors.some(e => e.field === 'furnisher_organisation_id' && e.message.includes('non-existent organisation'))).toBe(true);
  });

  it('invalid organisation_id in search is caught', () => {
    const file = makeValidCreditFile();
    file.searches![0]!.organisation_id = 'org:nonexistent';
    const errors = validateReferentialIntegrity(file);
    expect(errors.some(e => e.field === 'organisation_id' && e.message.includes('non-existent organisation'))).toBe(true);
  });

  it('invalid source_import_id in subject names is caught', () => {
    const file = makeValidCreditFile();
    file.subject!.names![0]!.source_import_id = 'imp:gone';
    const errors = validateReferentialIntegrity(file);
    expect(errors.some(e => e.domain === 'subject.names' && e.message.includes('non-existent import'))).toBe(true);
  });

  it('invalid address_id in electoral roll is caught', () => {
    const file = makeValidCreditFile();
    file.electoral_roll_entries = [{
      electoral_entry_id: 'er:1',
      address_id: 'addr:nonexistent',
      source_import_id: 'imp:equifax01',
    }];
    const errors = validateReferentialIntegrity(file);
    expect(errors.some(e => e.domain === 'electoral_roll' && e.field === 'address_id')).toBe(true);
  });

  it('invalid address link references are caught', () => {
    const file = makeValidCreditFile();
    file.address_links = [{
      address_link_id: 'link:1',
      from_address_id: 'addr:nonexistent',
      to_address_id: 'addr:also-nonexistent',
      source_import_id: 'imp:equifax01',
    }];
    const errors = validateReferentialIntegrity(file);
    expect(errors.some(e => e.field === 'from_address_id')).toBe(true);
    expect(errors.some(e => e.field === 'to_address_id')).toBe(true);
  });
});
