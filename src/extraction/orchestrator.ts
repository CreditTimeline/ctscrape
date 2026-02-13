/**
 * Extraction orchestrator — per-tab/per-job state machine managing the
 * extract→normalise→validate→send pipeline.
 *
 * Lives in the service worker. State is in-memory (lost on SW restart).
 * Content script re-detects on next interaction, which is acceptable for Phase 1.
 * TODO: Persist to chrome.storage.session for SW restart resilience.
 */

import type { PageInfo, RawExtractedData } from '../adapters/types';
import type { NormalisationResult } from '../normalizer/types';
import type { ExtensionStatus } from '../utils/messaging';
import type { ExtractionJob, ExtractionState, HtmlArtifact, PdfArtifact } from './types';
import { VALID_TRANSITIONS } from './types';

/** Tab-based jobs (DOM scraping) */
const jobs = new Map<number, ExtractionJob>();

/** ID-based jobs (PDF uploads) */
const jobsById = new Map<string, ExtractionJob>();

function transition(job: ExtractionJob, to: ExtractionState): void {
  const allowed = VALID_TRANSITIONS[job.state];
  if (!allowed.includes(to)) {
    const identifier = job.jobId ?? `tab ${job.tabId}`;
    throw new Error(
      `Invalid transition: "${job.state}" → "${to}" for ${identifier}`,
    );
  }
  job.state = to;
}

function createJob(tabId: number, adapterId: string): ExtractionJob {
  return {
    tabId,
    source: 'dom',
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

// ---------------------------------------------------------------------------
// Tab-based (DOM) job lifecycle — unchanged API
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// PDF job lifecycle — ID-based (no tab)
// ---------------------------------------------------------------------------

/** Create a new PDF job with a unique ID. */
export function createPdfJob(jobId: string, adapterId: string): ExtractionJob {
  const job: ExtractionJob = {
    tabId: null,
    jobId,
    source: 'pdf',
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
  jobsById.set(jobId, job);
  transition(job, 'detected');
  return job;
}

/** PDF extraction started. */
export function onPdfExtractionStarted(jobId: string): void {
  const job = getPdfJobOrThrow(jobId);
  job.startedAt = new Date().toISOString();
  transition(job, 'extracting');
}

/** PDF extraction complete — store data + artifact, transition to normalising. */
export function onPdfExtractionComplete(
  jobId: string,
  rawData: RawExtractedData,
  pdfArtifact: PdfArtifact,
): void {
  const job = getPdfJobOrThrow(jobId);
  job.rawData = rawData;
  job.pdfArtifact = pdfArtifact;
  transition(job, 'normalising');
}

/** PDF extraction error. */
export function onPdfExtractionError(jobId: string, error: string): void {
  const job = getPdfJobOrThrow(jobId);
  job.error = error;
  transition(job, 'error');
}

/** PDF normalisation complete. */
export function onPdfNormalisationComplete(jobId: string, result: NormalisationResult): void {
  const job = getPdfJobOrThrow(jobId);
  job.normalisationResult = result;
  transition(job, 'ready');
}

/** PDF send started. */
export function onPdfSendStarted(jobId: string): void {
  const job = getPdfJobOrThrow(jobId);
  transition(job, 'sending');
}

/** PDF send complete. */
export function onPdfSendComplete(jobId: string): void {
  const job = getPdfJobOrThrow(jobId);
  job.completedAt = new Date().toISOString();
  transition(job, 'complete');
}

/** PDF send error. */
export function onPdfSendError(jobId: string, error: string): void {
  const job = getPdfJobOrThrow(jobId);
  job.error = error;
  transition(job, 'error');
}

/** Get a PDF job by ID, or null. */
export function getJobById(jobId: string): ExtractionJob | null {
  return jobsById.get(jobId) ?? null;
}

/** Map PDF job state to ExtensionStatus. */
export function getStatusForJob(jobId: string): ExtensionStatus {
  const job = jobsById.get(jobId);
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

/** Remove a PDF job. */
export function removePdfJob(jobId: string): void {
  jobsById.delete(jobId);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Clear all jobs — for use in tests only. */
export function _resetForTesting(): void {
  jobs.clear();
  jobsById.clear();
}

function getJobOrThrow(tabId: number): ExtractionJob {
  const job = jobs.get(tabId);
  if (!job) {
    throw new Error(`No extraction job for tab ${tabId}`);
  }
  return job;
}

function getPdfJobOrThrow(jobId: string): ExtractionJob {
  const job = jobsById.get(jobId);
  if (!job) {
    throw new Error(`No PDF extraction job with id ${jobId}`);
  }
  return job;
}
