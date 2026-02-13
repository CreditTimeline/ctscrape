import type { NormalisationContext } from '../context';
import type { ImportBatch } from '../credit-file.types';
import { mapSourceSystem } from '../mappers/source-system';
import { generateId } from '../id-generator';

export function buildImportBatches(ctx: NormalisationContext): void {
  const { metadata } = ctx;

  // One batch per CRA found
  for (const systemName of metadata.sourceSystemsFound) {
    const sourceSystem = mapSourceSystem(systemName);
    const importId = generateId('imp', sourceSystem, metadata.extractedAt, metadata.adapterId);

    const batch: ImportBatch = {
      import_id: importId,
      imported_at: metadata.extractedAt,
      source_system: sourceSystem,
      source_wrapper: 'CheckMyFile',
      acquisition_method: 'html_scrape',
      mapping_version: `checkmyfile-${metadata.adapterVersion}`,
      raw_artifacts: [{
        artifact_id: generateId('artifact', metadata.htmlHash),
        artifact_type: 'html',
        sha256: metadata.htmlHash,
        uri: metadata.pageUrl,
      }],
    };

    ctx.importBatches.set(sourceSystem, batch);
  }

  // Composite batch for CheckMyFile-specific data (scores, etc.)
  const compositeId = generateId('imp', 'composite', metadata.extractedAt, metadata.adapterId);
  const compositeBatch: ImportBatch = {
    import_id: compositeId,
    imported_at: metadata.extractedAt,
    source_system: 'other',
    source_wrapper: 'CheckMyFile',
    acquisition_method: 'html_scrape',
    mapping_version: `checkmyfile-${metadata.adapterVersion}`,
  };
  ctx.importBatches.set('composite', compositeBatch);
}
