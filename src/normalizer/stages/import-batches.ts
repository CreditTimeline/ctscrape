import type { NormalisationContext } from '../context';
import type { AcquisitionMethod, ImportBatch } from '../credit-file.types';
import { mapSourceSystem } from '../mappers/source-system';
import { generateId } from '../id-generator';

const SOURCE_WRAPPER_MAP: Record<string, string> = {
  'checkmyfile': 'CheckMyFile',
  'equifax-pdf': 'Equifax',
};

export function buildImportBatches(ctx: NormalisationContext): void {
  const { metadata } = ctx;

  const acquisitionMethod: AcquisitionMethod =
    metadata.artifactType === 'pdf' ? 'pdf_upload' : 'html_scrape';
  const sourceWrapper = SOURCE_WRAPPER_MAP[metadata.adapterId] ?? metadata.adapterId;
  const artifactType = metadata.artifactType ?? 'html';
  const uri = metadata.pageUrl ? metadata.pageUrl : (metadata.sourceFilename ?? '');
  const mappingVersion = `${metadata.adapterId}-${metadata.adapterVersion}`;

  // One batch per CRA found
  for (const systemName of metadata.sourceSystemsFound) {
    const sourceSystem = mapSourceSystem(systemName);
    const importId = generateId('imp', sourceSystem, metadata.extractedAt, metadata.adapterId);

    const batch: ImportBatch = {
      import_id: importId,
      imported_at: metadata.extractedAt,
      source_system: sourceSystem,
      source_wrapper: sourceWrapper,
      acquisition_method: acquisitionMethod,
      mapping_version: mappingVersion,
      raw_artifacts: [{
        artifact_id: generateId('artifact', metadata.htmlHash),
        artifact_type: artifactType,
        sha256: metadata.htmlHash,
        uri,
      }],
    };

    ctx.importBatches.set(sourceSystem, batch);
  }

  // Composite batch for site-specific data (scores, etc.)
  const compositeId = generateId('imp', 'composite', metadata.extractedAt, metadata.adapterId);
  const compositeBatch: ImportBatch = {
    import_id: compositeId,
    imported_at: metadata.extractedAt,
    source_system: 'other',
    source_wrapper: sourceWrapper,
    acquisition_method: acquisitionMethod,
    mapping_version: mappingVersion,
  };
  ctx.importBatches.set('composite', compositeBatch);
}
