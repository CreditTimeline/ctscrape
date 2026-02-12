/**
 * Extraction orchestrator types — state machine for the extract→normalise→send pipeline.
 */

import type { PageInfo, RawExtractedData } from '../adapters/types';
import type { NormalisationResult } from '../normalizer/types';

export type ExtractionState =
  | 'idle'
  | 'detected'
  | 'extracting'
  | 'normalising'
  | 'ready'
  | 'sending'
  | 'complete'
  | 'error';

/** Tracks the state of an extraction job for a single tab */
export interface ExtractionJob {
  tabId: number;
  state: ExtractionState;
  adapterId: string;
  pageInfo: PageInfo | null;
  rawData: RawExtractedData | null;
  normalisationResult: NormalisationResult | null;
  htmlArtifact: HtmlArtifact | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

/** Provenance artifact — stores hash only (full HTML storage is a future enhancement) */
export interface HtmlArtifact {
  hash: string;
  capturedAt: string;
  pageUrl: string;
}

/** Valid state transitions for the extraction state machine */
export const VALID_TRANSITIONS: Record<ExtractionState, ExtractionState[]> = {
  idle: ['detected'],
  detected: ['extracting', 'idle'],
  extracting: ['normalising', 'error', 'idle'],
  normalising: ['ready', 'error', 'idle'],
  ready: ['sending', 'idle'],
  sending: ['complete', 'error', 'idle'],
  complete: ['idle'],
  error: ['idle'],
};
