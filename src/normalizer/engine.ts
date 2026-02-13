import type { PageInfo } from '@/adapters/types';
import type { NormalisationResult, NormaliserInput } from './types';
import { createContext } from './context';
import { buildImportBatches } from './stages/import-batches';
import { normaliseSubject } from './stages/subject';
import { normaliseAddresses } from './stages/addresses';
import { normaliseElectoralRoll } from './stages/electoral-roll';
import { normaliseOrganisations } from './stages/organisations';
import { buildTradelines } from './stages/tradelines';
import { normaliseSearches } from './stages/searches';
import { normaliseCreditScores } from './stages/credit-scores';
import { normaliseFinancialAssociates } from './stages/financial-associates';
import { assemblePayload } from './stages/assemble';
import { validateSchema } from './validation/schema-validator';
import { validateReferentialIntegrity } from './validation/referential-integrity';

/**
 * Main normalisation entry point.
 * Transforms RawExtractedData into a validated CreditFile.
 */
export function normalise(input: NormaliserInput): NormalisationResult {
  const { rawData, config } = input;

  const pageInfo: PageInfo = input.pageInfo ?? {
    siteName: 'CheckMyFile',
    subjectName: extractSubjectName(rawData),
    reportDate: extractReportDate(rawData),
    providers: rawData.metadata.sourceSystemsFound,
  };

  const ctx = createContext(config, rawData.metadata, pageInfo);

  try {
    // Pipeline stages
    buildImportBatches(ctx);
    normaliseSubject(ctx, rawData.sections);
    normaliseAddresses(ctx, rawData.sections);
    normaliseElectoralRoll(ctx, rawData.sections);
    normaliseOrganisations(ctx);
    buildTradelines(rawData.sections, ctx);
    normaliseSearches(ctx, rawData.sections);
    normaliseCreditScores(ctx, rawData.sections);
    normaliseFinancialAssociates(ctx, rawData.sections);

    // Assemble final payload
    const creditFile = assemblePayload(ctx);

    // Validation
    const schemaErrors = validateSchema(creditFile);
    const refErrors = validateReferentialIntegrity(creditFile);
    const allErrors = [...ctx.errors, ...schemaErrors, ...refErrors];

    return {
      success: allErrors.length === 0,
      creditFile,
      errors: allErrors,
      warnings: ctx.warnings,
      summary: {
        personNames: ctx.names.length,
        addresses: ctx.addresses.length,
        tradelines: ctx.tradelines.length,
        searches: ctx.searches.length,
        creditScores: ctx.creditScores.length,
        publicRecords: ctx.publicRecords.length,
        electoralRollEntries: ctx.electoralRollEntries.length,
        financialAssociates: ctx.financialAssociates.length,
        fraudMarkers: ctx.fraudMarkers.length,
        noticesOfCorrection: ctx.noticesOfCorrection.length,
      },
    };
  } catch (err) {
    return {
      success: false,
      creditFile: null,
      errors: [{
        domain: 'system',
        message: `Normalisation failed: ${err instanceof Error ? err.message : String(err)}`,
      }],
      warnings: ctx.warnings,
      summary: {
        personNames: 0,
        addresses: 0,
        tradelines: 0,
        searches: 0,
        creditScores: 0,
        publicRecords: 0,
        electoralRollEntries: 0,
        financialAssociates: 0,
        fraudMarkers: 0,
        noticesOfCorrection: 0,
      },
    };
  }
}

function extractSubjectName(rawData: { sections: Array<{ domain: string; fields: Array<{ name: string; value: string }> }> }): string | undefined {
  for (const section of rawData.sections) {
    if (section.domain === 'personal_info') {
      for (const field of section.fields) {
        if (field.name === 'subject-name' || field.name === 'name') {
          return field.value;
        }
      }
    }
  }
  return undefined;
}

function extractReportDate(rawData: { sections: Array<{ domain: string; fields: Array<{ name: string; value: string }> }> }): string | undefined {
  for (const section of rawData.sections) {
    if (section.domain === 'personal_info') {
      for (const field of section.fields) {
        if (field.name === 'report-date') {
          return field.value;
        }
      }
    }
  }
  return undefined;
}
