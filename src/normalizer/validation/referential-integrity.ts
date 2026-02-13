import type { CreditFile } from '../credit-file.types';
import type { NormalisationError } from '../types';

export function validateReferentialIntegrity(file: CreditFile): NormalisationError[] {
  const errors: NormalisationError[] = [];

  // Build sets of valid IDs
  const validImportIds = new Set(file.imports.map(i => i.import_id));
  const validAddressIds = new Set((file.addresses ?? []).map(a => a.address_id));
  const validOrgIds = new Set((file.organisations ?? []).map(o => o.organisation_id));

  function checkImportRef(id: string | undefined, entityType: string, entityId: string) {
    if (id && !validImportIds.has(id)) {
      errors.push({
        domain: entityType,
        field: 'source_import_id',
        message: `${entityType} "${entityId}" references non-existent import "${id}"`,
      });
    }
  }

  // Check subject names
  if (file.subject?.names) {
    for (const name of file.subject.names) {
      checkImportRef(name.source_import_id, 'subject.names', name.name_id);
    }
  }

  // Check subject DOBs
  if (file.subject?.dates_of_birth) {
    for (const dob of file.subject.dates_of_birth) {
      checkImportRef(dob.source_import_id, 'subject.dates_of_birth', dob.dob);
    }
  }

  // Check address associations -> address_id
  if (file.address_associations) {
    for (const assoc of file.address_associations) {
      checkImportRef(assoc.source_import_id, 'address_associations', assoc.association_id);
      if (!validAddressIds.has(assoc.address_id)) {
        errors.push({
          domain: 'address_associations',
          field: 'address_id',
          message: `Association "${assoc.association_id}" references non-existent address "${assoc.address_id}"`,
        });
      }
    }
  }

  // Check address links
  if (file.address_links) {
    for (const link of file.address_links) {
      checkImportRef(link.source_import_id, 'address_links', link.address_link_id);
      if (!validAddressIds.has(link.from_address_id)) {
        errors.push({
          domain: 'address_links',
          field: 'from_address_id',
          message: `Link "${link.address_link_id}" references non-existent from_address "${link.from_address_id}"`,
        });
      }
      if (!validAddressIds.has(link.to_address_id)) {
        errors.push({
          domain: 'address_links',
          field: 'to_address_id',
          message: `Link "${link.address_link_id}" references non-existent to_address "${link.to_address_id}"`,
        });
      }
    }
  }

  // Check tradelines -> furnisher_organisation_id
  if (file.tradelines) {
    for (const tl of file.tradelines) {
      checkImportRef(tl.source_import_id, 'tradelines', tl.tradeline_id);
      if (tl.furnisher_organisation_id && !validOrgIds.has(tl.furnisher_organisation_id)) {
        errors.push({
          domain: 'tradelines',
          field: 'furnisher_organisation_id',
          message: `Tradeline "${tl.tradeline_id}" references non-existent organisation "${tl.furnisher_organisation_id}"`,
        });
      }
    }
  }

  // Check searches -> organisation_id
  if (file.searches) {
    for (const sr of file.searches) {
      checkImportRef(sr.source_import_id, 'searches', sr.search_id);
      if (sr.organisation_id && !validOrgIds.has(sr.organisation_id)) {
        errors.push({
          domain: 'searches',
          field: 'organisation_id',
          message: `Search "${sr.search_id}" references non-existent organisation "${sr.organisation_id}"`,
        });
      }
    }
  }

  // Check electoral roll -> address_id
  if (file.electoral_roll_entries) {
    for (const er of file.electoral_roll_entries) {
      checkImportRef(er.source_import_id, 'electoral_roll', er.electoral_entry_id);
      if (er.address_id && !validAddressIds.has(er.address_id)) {
        errors.push({
          domain: 'electoral_roll',
          field: 'address_id',
          message: `Electoral entry "${er.electoral_entry_id}" references non-existent address "${er.address_id}"`,
        });
      }
    }
  }

  // Check credit scores
  if (file.credit_scores) {
    for (const cs of file.credit_scores) {
      checkImportRef(cs.source_import_id, 'credit_scores', cs.score_id);
    }
  }

  // Check financial associates
  if (file.financial_associates) {
    for (const fa of file.financial_associates) {
      checkImportRef(fa.source_import_id, 'financial_associates', fa.associate_id);
    }
  }

  return errors;
}
