/**
 * Mock fixtures for UI testing — provides sample ExtensionStatus and NormalisationResult data.
 */

import type { ExtensionStatus } from '../../utils/messaging';
import type { NormalisationResult, NormalisationSummary } from '../../normalizer/types';
import type { PageInfo } from '../../adapters/types';

export const mockPageInfo: PageInfo = {
  siteName: 'CheckMyFile',
  subjectName: 'John Smith',
  reportDate: '2024-01-15',
  providers: ['Equifax', 'Experian', 'TransUnion'],
};

export const mockSummary: NormalisationSummary = {
  personNames: 2,
  addresses: 3,
  tradelines: 12,
  searches: 5,
  creditScores: 3,
  publicRecords: 0,
  electoralRollEntries: 2,
  financialAssociates: 1,
  fraudMarkers: 0,
  noticesOfCorrection: 0,
};

export const mockSuccessResult: NormalisationResult = {
  success: true,
  creditFile: null, // Not needed for UI tests
  errors: [],
  warnings: [
    { domain: 'tradelines', field: 'balance', message: 'Balance is zero on 2 accounts', severity: 'info' },
    { domain: 'addresses', message: 'Address format may be incomplete', severity: 'warning' },
  ],
  summary: mockSummary,
};

export const mockErrorResult: NormalisationResult = {
  success: false,
  creditFile: null,
  errors: [
    { domain: 'tradelines', field: 'account_type', message: 'Unknown account type', rawValue: 'UNKNOWN_TYPE' },
    { domain: 'personal_info', field: 'date_of_birth', message: 'Invalid date format' },
  ],
  warnings: [],
  summary: { ...mockSummary, tradelines: 0 },
};

export const mockIdleStatus: ExtensionStatus = { state: 'idle' };

export const mockDetectedStatus: ExtensionStatus = {
  state: 'detected',
  pageInfo: mockPageInfo,
};

export const mockExtractingStatus: ExtensionStatus = {
  state: 'extracting',
  pageInfo: mockPageInfo,
};

export const mockReadyStatus: ExtensionStatus = {
  state: 'ready',
  pageInfo: mockPageInfo,
  result: mockSuccessResult,
};

export const mockErrorStatus: ExtensionStatus = {
  state: 'error',
  pageInfo: mockPageInfo,
  lastError: 'Extraction failed: timeout',
};
