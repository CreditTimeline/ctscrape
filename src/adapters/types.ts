/**
 * Interface that all site-specific adapters must implement.
 * Each adapter knows how to detect and extract data from one credit report site.
 */
export interface SiteAdapter {
  /** Unique adapter identifier (e.g., "checkmyfile") */
  readonly id: string;

  /** Human-readable name (e.g., "CheckMyFile") */
  readonly name: string;

  /** Adapter version (semver) — included in provenance metadata */
  readonly version: string;

  /** URL match patterns for content script activation */
  readonly matchPatterns: string[];

  /** Quick check: is the current page a scrapeable report page? */
  detect(document: Document): boolean;

  /** Get basic page info before full extraction (subject name, report date, etc.) */
  getPageInfo(document: Document): PageInfo;

  /** Full data extraction from the page DOM */
  extract(document: Document): Promise<RawExtractedData>;

  /** Which ctspec data domains does this adapter cover? */
  getSupportedSections(): DataDomain[];
}

/** Basic info about the detected report page, shown to user before extraction */
export interface PageInfo {
  siteName: string;
  subjectName?: string;
  reportDate?: string;
  providers: string[];
}

/** ctspec data domains that an adapter can extract */
export type DataDomain =
  | 'personal_info'
  | 'addresses'
  | 'tradelines'
  | 'searches'
  | 'credit_scores'
  | 'public_records'
  | 'electoral_roll'
  | 'financial_associates'
  | 'fraud_markers'
  | 'notices_of_correction';

/** Top-level container for all data extracted from a single page */
export interface RawExtractedData {
  metadata: ExtractionMetadata;
  sections: RawSection[];
}

/** Metadata about the extraction itself (for provenance tracking) */
export interface ExtractionMetadata {
  adapterId: string;
  adapterVersion: string;
  extractedAt: string;
  pageUrl: string;
  htmlHash: string;
  /** Which CRA source systems were found (for multi-CRA sites like CheckMyFile) */
  sourceSystemsFound: string[];
}

/**
 * A section of extracted data corresponding to one ctspec domain.
 * Fields are raw strings as they appear on the page — normalisation happens later.
 */
export interface RawSection {
  domain: DataDomain;
  /** Which CRA this data came from (null if not CRA-specific) */
  sourceSystem: string | null;
  fields: RawField[];
}

/** A single extracted field with its raw value and extraction confidence */
export interface RawField {
  /** Field name as understood by the adapter (e.g., "account_type", "balance") */
  name: string;
  /** Raw value exactly as it appears on the page */
  value: string;
  /** Optional: grouping key to associate related fields (e.g., same tradeline) */
  groupKey?: string;
  /** Extraction confidence */
  confidence: 'high' | 'medium' | 'low';
}
