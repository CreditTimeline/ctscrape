import { describe, it, expect, beforeEach } from 'vitest';
import {
  onPageDetected,
  onExtractionStarted,
  onExtractionComplete,
  onExtractionError,
  onNormalisationComplete,
  onSendStarted,
  onSendComplete,
  onSendError,
  onPageLeft,
  getJob,
  getStatusForTab,
  _resetForTesting,
} from './orchestrator';
import type { PageInfo, RawExtractedData } from '../adapters/types';
import type { NormalisationResult } from '../normalizer/types';
import type { HtmlArtifact } from './types';

const TAB = 1;

const pageInfo: PageInfo = {
  siteName: 'Test',
  subjectName: 'John Doe',
  reportDate: '2024-01-15',
  providers: ['Equifax'],
};

const rawData: RawExtractedData = {
  metadata: {
    adapterId: 'test',
    adapterVersion: '1.0.0',
    extractedAt: '2024-01-15T12:00:00Z',
    pageUrl: 'https://example.com/report',
    htmlHash: 'abc123',
    sourceSystemsFound: ['equifax'],
  },
  sections: [],
};

const artifact: HtmlArtifact = {
  hash: 'abc123',
  capturedAt: '2024-01-15T12:00:00Z',
  pageUrl: 'https://example.com/report',
};

const normResult: NormalisationResult = {
  success: false,
  creditFile: null,
  errors: [{ domain: 'system', message: 'Normalisation not yet implemented' }],
  warnings: [],
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

describe('extraction orchestrator', () => {
  beforeEach(() => {
    _resetForTesting();
  });

  describe('happy path', () => {
    it('transitions idle → detected → extracting → normalising → ready → sending → complete', () => {
      onPageDetected(TAB, 'test', pageInfo);
      expect(getJob(TAB)?.state).toBe('detected');

      onExtractionStarted(TAB);
      expect(getJob(TAB)?.state).toBe('extracting');

      onExtractionComplete(TAB, rawData, artifact);
      expect(getJob(TAB)?.state).toBe('normalising');
      expect(getJob(TAB)?.rawData).toBe(rawData);
      expect(getJob(TAB)?.htmlArtifact).toBe(artifact);

      onNormalisationComplete(TAB, normResult);
      expect(getJob(TAB)?.state).toBe('ready');
      expect(getJob(TAB)?.normalisationResult).toBe(normResult);

      onSendStarted(TAB);
      expect(getJob(TAB)?.state).toBe('sending');

      onSendComplete(TAB);
      expect(getJob(TAB)?.state).toBe('complete');
      expect(getJob(TAB)?.completedAt).not.toBeNull();
    });
  });

  describe('onPageDetected', () => {
    it('creates a job with correct fields', () => {
      onPageDetected(TAB, 'cmf', pageInfo);
      const job = getJob(TAB);
      expect(job).not.toBeNull();
      expect(job?.tabId).toBe(TAB);
      expect(job?.adapterId).toBe('cmf');
      expect(job?.pageInfo).toBe(pageInfo);
      expect(job?.state).toBe('detected');
      expect(job?.rawData).toBeNull();
      expect(job?.error).toBeNull();
    });

    it('resets job if called again for same tab', () => {
      onPageDetected(TAB, 'a', pageInfo);
      onExtractionStarted(TAB);
      expect(getJob(TAB)?.state).toBe('extracting');

      // Re-detect resets the job
      onPageDetected(TAB, 'b', pageInfo);
      expect(getJob(TAB)?.state).toBe('detected');
      expect(getJob(TAB)?.adapterId).toBe('b');
    });
  });

  describe('onExtractionError', () => {
    it('transitions to error state and stores error message', () => {
      onPageDetected(TAB, 'test', pageInfo);
      onExtractionStarted(TAB);
      onExtractionError(TAB, 'DOM changed unexpectedly');

      const job = getJob(TAB);
      expect(job?.state).toBe('error');
      expect(job?.error).toBe('DOM changed unexpectedly');
    });
  });

  describe('onSendError', () => {
    it('transitions to error state from sending', () => {
      onPageDetected(TAB, 'test', pageInfo);
      onExtractionStarted(TAB);
      onExtractionComplete(TAB, rawData, artifact);
      onNormalisationComplete(TAB, normResult);
      onSendStarted(TAB);
      onSendError(TAB, 'Network error');

      expect(getJob(TAB)?.state).toBe('error');
      expect(getJob(TAB)?.error).toBe('Network error');
    });
  });

  describe('onPageLeft', () => {
    it('removes the job entirely', () => {
      onPageDetected(TAB, 'test', pageInfo);
      expect(getJob(TAB)).not.toBeNull();

      onPageLeft(TAB);
      expect(getJob(TAB)).toBeNull();
    });

    it('is safe to call for non-existent tab', () => {
      expect(() => onPageLeft(999)).not.toThrow();
    });
  });

  describe('invalid transitions', () => {
    it('throws when transitioning from idle directly to extracting', () => {
      onPageDetected(TAB, 'test', pageInfo);
      // Reset state to idle by leaving and re-creating
      onPageLeft(TAB);
      // No job exists — should throw "No extraction job"
      expect(() => onExtractionStarted(TAB)).toThrow('No extraction job');
    });

    it('throws when transitioning from detected to normalising', () => {
      onPageDetected(TAB, 'test', pageInfo);
      expect(() => onExtractionComplete(TAB, rawData, artifact)).toThrow('Invalid transition');
    });

    it('throws when transitioning from ready to extracting', () => {
      onPageDetected(TAB, 'test', pageInfo);
      onExtractionStarted(TAB);
      onExtractionComplete(TAB, rawData, artifact);
      onNormalisationComplete(TAB, normResult);
      expect(() => onExtractionStarted(TAB)).toThrow('Invalid transition');
    });
  });

  describe('multiple tabs', () => {
    it('tracks tabs independently', () => {
      onPageDetected(1, 'adapter-a', pageInfo);
      onPageDetected(2, 'adapter-b', pageInfo);

      onExtractionStarted(1);
      expect(getJob(1)?.state).toBe('extracting');
      expect(getJob(2)?.state).toBe('detected');
    });
  });

  describe('getStatusForTab', () => {
    it('returns idle for unknown tab', () => {
      const status = getStatusForTab(999);
      expect(status.state).toBe('idle');
      expect(status.pageInfo).toBeUndefined();
    });

    it('maps job fields to ExtensionStatus correctly', () => {
      onPageDetected(TAB, 'test', pageInfo);
      const status = getStatusForTab(TAB);
      expect(status.state).toBe('detected');
      expect(status.pageInfo).toBe(pageInfo);
    });

    it('includes error when in error state', () => {
      onPageDetected(TAB, 'test', pageInfo);
      onExtractionStarted(TAB);
      onExtractionError(TAB, 'Something broke');

      const status = getStatusForTab(TAB);
      expect(status.state).toBe('error');
      expect(status.lastError).toBe('Something broke');
    });

    it('includes normalisation result when ready', () => {
      onPageDetected(TAB, 'test', pageInfo);
      onExtractionStarted(TAB);
      onExtractionComplete(TAB, rawData, artifact);
      onNormalisationComplete(TAB, normResult);

      const status = getStatusForTab(TAB);
      expect(status.state).toBe('ready');
      expect(status.result).toBe(normResult);
    });
  });
});
