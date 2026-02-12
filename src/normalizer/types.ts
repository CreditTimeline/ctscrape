import type { RawExtractedData } from '../adapters/types';

/**
 * Result of normalising raw extracted data into a ctspec CreditFile.
 * The CreditFile type will be imported from ctspec/SDK once integrated.
 */
export interface NormalisationResult {
  success: boolean;
  /** The normalised ctspec CreditFile payload (ready to send to ctview) */
  creditFile: CreditFilePayload | null;
  /** Validation errors that prevent sending */
  errors: NormalisationError[];
  /** Non-blocking quality warnings */
  warnings: NormalisationWarning[];
  /** Entity counts by domain */
  summary: NormalisationSummary;
}

export interface NormalisationError {
  domain: string;
  field?: string;
  message: string;
  rawValue?: string;
}

export interface NormalisationWarning {
  domain: string;
  field?: string;
  message: string;
  severity: 'info' | 'warning';
}

export interface NormalisationSummary {
  personNames: number;
  addresses: number;
  tradelines: number;
  searches: number;
  creditScores: number;
  publicRecords: number;
  electoralRollEntries: number;
  financialAssociates: number;
  fraudMarkers: number;
  noticesOfCorrection: number;
}

/**
 * Placeholder for the ctspec CreditFile type.
 * TODO Phase 5: Replace with proper type from @ctview/sdk or ctspec.
 */
export type CreditFilePayload = Record<string, unknown>;

/** Configuration for the normalisation engine */
export interface NormaliserConfig {
  /** Default subject_id to use (configured by user in settings) */
  defaultSubjectId: string;
  /** Default currency code */
  currencyCode: string;
}

/** Input to the normalisation engine */
export interface NormaliserInput {
  rawData: RawExtractedData;
  config: NormaliserConfig;
}
