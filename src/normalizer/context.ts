import type {
  ImportBatch, PersonName, DateOfBirthRecord,
  Address, AddressAssociation, AddressLink, Organisation,
  Tradeline, SearchRecord, CreditScore, ElectoralRollEntry,
  FinancialAssociate, PublicRecord, FraudMarker, NoticeOfCorrection,
} from './credit-file.types';
import type { NormalisationError, NormalisationWarning, NormaliserConfig } from './types';
import type { ExtractionMetadata, PageInfo } from '@/adapters/types';
import { generateId } from './id-generator';

export interface NormalisationContext {
  // Config
  config: NormaliserConfig;
  metadata: ExtractionMetadata;
  pageInfo: PageInfo;

  // Import batches (keyed by source system or 'composite')
  importBatches: Map<string, ImportBatch>;

  // Entity accumulators
  names: PersonName[];
  datesOfBirth: DateOfBirthRecord[];
  addresses: Address[];
  addressAssociations: AddressAssociation[];
  addressLinks: AddressLink[];
  organisations: Organisation[];
  tradelines: Tradeline[];
  searches: SearchRecord[];
  creditScores: CreditScore[];
  electoralRollEntries: ElectoralRollEntry[];
  financialAssociates: FinancialAssociate[];
  publicRecords: PublicRecord[];
  fraudMarkers: FraudMarker[];
  noticesOfCorrection: NoticeOfCorrection[];

  // Registries for deduplication
  addressRegistry: Map<string, string>; // normalized_single_line -> address_id
  orgRegistry: Map<string, string>; // normalized_name -> organisation_id

  // Counters for sequential IDs
  counters: Record<string, number>;

  // Errors and warnings
  errors: NormalisationError[];
  warnings: NormalisationWarning[];
}

export function createContext(
  config: NormaliserConfig,
  metadata: ExtractionMetadata,
  pageInfo: PageInfo,
): NormalisationContext {
  return {
    config,
    metadata,
    pageInfo,
    importBatches: new Map(),
    names: [],
    datesOfBirth: [],
    addresses: [],
    addressAssociations: [],
    addressLinks: [],
    organisations: [],
    tradelines: [],
    searches: [],
    creditScores: [],
    electoralRollEntries: [],
    financialAssociates: [],
    publicRecords: [],
    fraudMarkers: [],
    noticesOfCorrection: [],
    addressRegistry: new Map(),
    orgRegistry: new Map(),
    counters: {},
    errors: [],
    warnings: [],
  };
}

/** Get next sequential counter for an entity type */
export function nextCounter(ctx: NormalisationContext, prefix: string): number {
  const current = ctx.counters[prefix] ?? 0;
  ctx.counters[prefix] = current + 1;
  return current + 1;
}

/** Get import_id for a source system, falling back to composite */
export function getImportId(ctx: NormalisationContext, sourceSystem: string | null): string {
  if (sourceSystem) {
    const batch = ctx.importBatches.get(sourceSystem.toLowerCase());
    if (batch) return batch.import_id;
  }
  // Fallback to composite
  const composite = ctx.importBatches.get('composite');
  if (composite) return composite.import_id;
  // Final fallback
  return 'imp:unknown:0';
}

/** Register or retrieve an address ID (dedup by normalized single line) */
export function registerAddress(ctx: NormalisationContext, address: Address): string {
  const key = address.normalized_single_line ?? address.line_1 ?? '';
  const existing = ctx.addressRegistry.get(key.toUpperCase());
  if (existing) return existing;
  ctx.addressRegistry.set(key.toUpperCase(), address.address_id);
  ctx.addresses.push(address);
  return address.address_id;
}

/** Normalize org name for dedup (uppercase, strip LTD/PLC/LIMITED) */
export function normalizeOrgName(name: string): string {
  return name
    .toUpperCase()
    .replace(/\s+(LTD|PLC|LIMITED|INC|CORP)\.?$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Register or retrieve an organisation ID (dedup by normalized name) */
export function registerOrganisation(
  ctx: NormalisationContext,
  name: string,
  role: 'furnisher' | 'searcher',
  importId: string,
): string {
  const normalizedName = normalizeOrgName(name);
  const existing = ctx.orgRegistry.get(normalizedName);
  if (existing) {
    // Update roles if new role
    const org = ctx.organisations.find(o => o.organisation_id === existing);
    if (org && org.roles && !org.roles.includes(role)) {
      org.roles.push(role);
    }
    return existing;
  }

  const orgId = generateId('org', normalizedName);
  ctx.orgRegistry.set(normalizedName, orgId);
  ctx.organisations.push({
    organisation_id: orgId,
    name,
    roles: [role],
    source_import_id: importId,
  });
  return orgId;
}
