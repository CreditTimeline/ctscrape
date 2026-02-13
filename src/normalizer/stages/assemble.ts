import type { NormalisationContext } from '../context';
import type { CreditFile } from '../credit-file.types';
import { generateId } from '../id-generator';

export function assemblePayload(ctx: NormalisationContext): CreditFile {
  const fileId = generateId('file', ctx.metadata.adapterId, ctx.metadata.extractedAt, ctx.metadata.pageUrl);

  const creditFile: CreditFile = {
    schema_version: '1.0.0',
    file_id: fileId,
    subject_id: ctx.config.defaultSubjectId,
    created_at: new Date().toISOString(),
    currency_code: ctx.config.currencyCode,
    imports: Array.from(ctx.importBatches.values()),
    subject: {
      subject_id: ctx.config.defaultSubjectId,
      ...(ctx.names.length > 0 && { names: ctx.names }),
      ...(ctx.datesOfBirth.length > 0 && { dates_of_birth: ctx.datesOfBirth }),
    },
  };

  // Only include non-empty arrays
  if (ctx.organisations.length > 0) creditFile.organisations = ctx.organisations;
  if (ctx.addresses.length > 0) creditFile.addresses = ctx.addresses;
  if (ctx.addressAssociations.length > 0) creditFile.address_associations = ctx.addressAssociations;
  if (ctx.addressLinks.length > 0) creditFile.address_links = ctx.addressLinks;
  if (ctx.financialAssociates.length > 0) creditFile.financial_associates = ctx.financialAssociates;
  if (ctx.electoralRollEntries.length > 0) creditFile.electoral_roll_entries = ctx.electoralRollEntries;
  if (ctx.tradelines.length > 0) creditFile.tradelines = ctx.tradelines;
  if (ctx.searches.length > 0) creditFile.searches = ctx.searches;
  if (ctx.creditScores.length > 0) creditFile.credit_scores = ctx.creditScores;
  if (ctx.publicRecords.length > 0) creditFile.public_records = ctx.publicRecords;
  if (ctx.noticesOfCorrection.length > 0) creditFile.notices_of_correction = ctx.noticesOfCorrection;
  if (ctx.fraudMarkers.length > 0) creditFile.fraud_markers = ctx.fraudMarkers;

  return creditFile;
}
