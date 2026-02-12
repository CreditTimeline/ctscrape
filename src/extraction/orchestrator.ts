/**
 * Extraction orchestrator — per-tab state machine managing the
 * extract→normalise→validate→send pipeline.
 *
 * Lives in the service worker. State is in-memory (lost on SW restart).
 * Content script re-detects on next interaction, which is acceptable for Phase 1.
 * TODO: Persist to chrome.storage.session for SW restart resilience.
 */

import type { PageInfo, RawExtractedData } from '../adapters/types';
import type { NormalisationResult } from '../normalizer/types';
import type { ExtensionStatus } from '../utils/messaging';
import type { ExtractionJob, ExtractionState, HtmlArtifact } from './types';
import { VALID_TRANSITIONS } from './types';

const jobs = new Map<number, ExtractionJob>();

function transition(job: ExtractionJob, to: ExtractionState): void {
  const allowed = VALID_TRANSITIONS[job.state];
  if (!allowed.includes(to)) {
    throw new Error(
      `Invalid transition: "${job.state}" → "${to}" for tab ${job.tabId}`,
    );
  }
  job.state = to;
}

function createJob(tabId: number, adapterId: string): ExtractionJob {
  return {
    tabId,
    state: 'idle',
    adapterId,
    pageInfo: null,
    rawData: null,
    normalisationResult: null,
    htmlArtifact: null,
    error: null,
    startedAt: null,
    completedAt: null,
  };
}

/** A supported page was detected — create/reset job, transition to detected. */
export function onPageDetected(tabId: number, adapterId: string, pageInfo: PageInfo): void {
  const job = createJob(tabId, adapterId);
  job.pageInfo = pageInfo;
  jobs.set(tabId, job);
  transition(job, 'detected');
}

/** Extraction was requested — transition to extracting. */
export function onExtractionStarted(tabId: number): void {
  const job = getJobOrThrow(tabId);
  job.startedAt = new Date().toISOString();
  transition(job, 'extracting');
}

/** Content script finished extraction — store data, transition to normalising. */
export function onExtractionComplete(
  tabId: number,
  rawData: RawExtractedData,
  artifact: HtmlArtifact,
): void {
  const job = getJobOrThrow(tabId);
  job.rawData = rawData;
  job.htmlArtifact = artifact;
  transition(job, 'normalising');
}

/** Extraction failed — store error, transition to error. */
export function onExtractionError(tabId: number, error: string): void {
  const job = getJobOrThrow(tabId);
  job.error = error;
  transition(job, 'error');
}

/** Normalisation finished — store result, transition to ready. */
export function onNormalisationComplete(tabId: number, result: NormalisationResult): void {
  const job = getJobOrThrow(tabId);
  job.normalisationResult = result;
  transition(job, 'ready');
}

/** User approved sending — transition to sending. */
export function onSendStarted(tabId: number): void {
  const job = getJobOrThrow(tabId);
  transition(job, 'sending');
}

/** Send completed successfully — transition to complete. */
export function onSendComplete(tabId: number): void {
  const job = getJobOrThrow(tabId);
  job.completedAt = new Date().toISOString();
  transition(job, 'complete');
}

/** Send failed — store error, transition to error. */
export function onSendError(tabId: number, error: string): void {
  const job = getJobOrThrow(tabId);
  job.error = error;
  transition(job, 'error');
}

/** Page navigated away or tab closed — remove job entirely. */
export function onPageLeft(tabId: number): void {
  jobs.delete(tabId);
}

/** Get the current job for a tab, or null if none exists. */
export function getJob(tabId: number): ExtractionJob | null {
  return jobs.get(tabId) ?? null;
}

/** Map job state to ExtensionStatus for the popup/sidepanel. */
export function getStatusForTab(tabId: number): ExtensionStatus {
  const job = jobs.get(tabId);
  if (!job) {
    return { state: 'idle' };
  }
  return {
    state: job.state,
    pageInfo: job.pageInfo ?? undefined,
    result: job.normalisationResult ?? undefined,
    lastError: job.error ?? undefined,
  };
}

/** Clear all jobs — for use in tests only. */
export function _resetForTesting(): void {
  jobs.clear();
}

function getJobOrThrow(tabId: number): ExtractionJob {
  const job = jobs.get(tabId);
  if (!job) {
    throw new Error(`No extraction job for tab ${tabId}`);
  }
  return job;
}
